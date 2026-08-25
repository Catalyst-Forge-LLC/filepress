import { parseHTML } from 'linkedom';
import type { DiscoverResult } from './discover.ts';
import { fetchText, resolveUrl, sameOrigin } from './fetch.ts';
import { htmlToMarkdown } from './html-to-md.ts';
import type { SiteIR, SiteIRPage, SiteIRPost } from './ir.ts';

const RESERVED = new Set([
	'posts',
	'tags',
	'topics',
	'page',
	'rss.xml',
	'sitemap.xml',
	'robots.txt'
]);

function slugFromUrl(url: string): string {
	const path = new URL(url).pathname.replace(/\/+$/, '');
	const seg = path.split('/').filter(Boolean).pop() ?? 'page';
	return seg
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^\p{L}\p{N}-]+/gu, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}

function rfc822ToIso(pubDate: string | null): string | null {
	if (!pubDate) return null;
	const d = new Date(pubDate);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
}

function textContent(el: Element | null | undefined): string {
	return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function pickMain(document: Document): Element {
	return (
		document.querySelector('article') ||
		document.querySelector('[role="main"]') ||
		document.querySelector('main') ||
		document.body
	);
}

function stripChrome(root: Element): void {
	for (const sel of ['nav', 'header', 'footer', 'aside', '.nav', '.header', '.footer', 'script', 'style']) {
		root.querySelectorAll(sel).forEach((n) => n.remove());
	}
}

function extractImages(root: Element, pageUrl: string, origin: string): string[] {
	const out: string[] = [];
	for (const img of root.querySelectorAll('img[src]')) {
		const src = img.getAttribute('src');
		if (!src) continue;
		const abs = resolveUrl(pageUrl, src);
		if (abs && sameOrigin(abs, origin) && !abs.startsWith('data:')) out.push(abs);
	}
	return [...new Set(out)];
}

/**
 * Rewrite same-origin article/listing links to filepress routes before HTML→MD
 * so prerender does not crawl dead `/writing/…` paths.
 */
function rewriteInternalLinks(root: Element, pageUrl: string, origin: string): void {
	for (const a of root.querySelectorAll('a[href]')) {
		const href = a.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue;
		const abs = resolveUrl(pageUrl, href);
		if (!abs || !sameOrigin(abs, origin)) continue;
		const path = new URL(abs).pathname.replace(/\/+$/, '') || '/';
		const writing = path.match(/^\/(?:writing|essays|blog|articles)\/([^/]+)$/i);
		if (writing) {
			a.setAttribute('href', `/posts/${writing[1]}`);
			continue;
		}
		if (/^\/(?:writing|essays|blog|articles)$/i.test(path)) {
			a.setAttribute('href', '/');
			continue;
		}
		const tag = path.match(/^\/tags?\/([^/]+)$/i);
		if (tag) {
			a.setAttribute('href', `/tags/${normalizeTagSlug(decodeURIComponent(tag[1]))}`);
		}
	}
}

function metaContent(document: Document, sel: string): string | null {
	const el = document.querySelector(sel);
	const v = el?.getAttribute('content')?.trim();
	return v || null;
}

/** Prefer brand / logo over page chrome like "Home · …". */
function siteTitleFromDoc(document: Document): string | null {
	const logo = textContent(document.querySelector('.logo-text, .site-title, header .logo'));
	if (logo && !/^(home|index)$/i.test(logo)) return logo;
	const author = metaContent(document, 'meta[name="author"]');
	if (author) return author;
	const title = textContent(document.querySelector('title'));
	// "Home · Example Author" / "Writing · Example Author" → brand side
	const parts = title.split(/\s*[·|—–-]\s*/).map((p) => p.trim()).filter(Boolean);
	if (parts.length >= 2) {
		const last = parts[parts.length - 1];
		if (last && !/^(home|index|writing|essays|blog)$/i.test(last)) return last;
	}
	return null;
}

function titleFromDoc(document: Document): string {
	const h1 = textContent(document.querySelector('h1'));
	if (h1) return h1;
	const og = metaContent(document, 'meta[property="og:title"]');
	if (og) {
		const parts = og.split(/\s*[·|—–-]\s*/).map((p) => p.trim()).filter(Boolean);
		if (parts.length >= 2) return parts[0];
		return og.trim();
	}
	return textContent(document.querySelector('title')).replace(/\s*[·|].*$/, '').trim() || 'Untitled';
}

function normalizeTagSlug(raw: string): string {
	return raw
		.normalize('NFKC')
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/[^\p{L}\p{N}-]+/gu, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}

function tagsFromDoc(document: Document): string[] {
	const tags = new Set<string>();
	for (const a of document.querySelectorAll('a[href*="/tag"], a[href*="/tags/"]')) {
		const href = a.getAttribute('href') ?? '';
		const m = href.match(/\/tags?\/([^/]+)/i);
		if (m) {
			const t = normalizeTagSlug(decodeURIComponent(m[1]));
			if (t) tags.add(t);
		}
	}
	for (const chip of document.querySelectorAll('.tag-chip, .tag, [rel="tag"]')) {
		const t = normalizeTagSlug(textContent(chip));
		if (t && t.length < 40) tags.add(t);
	}
	return [...tags];
}

function dateFromDoc(document: Document): string | null {
	const time = document.querySelector('time[datetime]');
	const dt = time?.getAttribute('datetime');
	if (dt) {
		const iso = dt.slice(0, 10);
		if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
	}
	return null;
}

async function loadDoc(url: string): Promise<{ document: Document; finalUrl: string } | null> {
	try {
		const { status, text, url: finalUrl } = await fetchText(url);
		if (status >= 400) return null;
		const { document } = parseHTML(text);
		return { document, finalUrl };
	} catch (e) {
		console.warn(`import: skip ${url}: ${e instanceof Error ? e.message : e}`);
		return null;
	}
}

function uniqueSlug(base: string, used: Set<string>): string {
	let slug = base || 'page';
	if (RESERVED.has(slug)) slug = `page-${slug}`;
	let n = 2;
	let candidate = slug;
	while (used.has(candidate)) {
		candidate = `${slug}-${n++}`;
	}
	used.add(candidate);
	return candidate;
}

/** Build SiteIR from discovery + HTML extraction. */
export async function extractSite(discovered: DiscoverResult): Promise<SiteIR> {
	const { origin, urls, rss, rssTitle } = discovered;
	const notes: string[] = [];
	const usedSlugs = new Set<string>();

	const homeUrl = urls.find((u) => u.kind === 'home')?.url ?? `${origin}/`;
	const homeDoc = await loadDoc(homeUrl);

	let title = rssTitle?.replace(/\s*[—–-]\s*.*$/, '').trim() || 'Imported site';
	let description = '';
	let author = title;
	let lede: string | null = null;
	let homeMarkdown: string | null = null;
	let generator: string | null = null;

	if (homeDoc) {
		const { document } = homeDoc;
		const gen = document.querySelector('meta[name="generator"]')?.getAttribute('content');
		generator = gen ?? (document.documentElement.outerHTML.includes('astro') ? 'Astro' : null);
		title = siteTitleFromDoc(document) || titleFromDoc(document) || title;
		if (/^(home|index)$/i.test(title)) {
			title = siteTitleFromDoc(document) || rssTitle?.replace(/\s*[—–-]\s*.*$/, '').trim() || title;
		}
		description =
			metaContent(document, 'meta[name="description"]') ||
			metaContent(document, 'meta[property="og:description"]') ||
			'';
		author = metaContent(document, 'meta[name="author"]') || title;

		const bioRoot = document.querySelector('.intro-bio, .bio, [class*="intro"]') || pickMain(document);
		const clone = bioRoot.cloneNode(true) as Element;
		stripChrome(clone);
		const paragraphs = [...clone.querySelectorAll('p')]
			.map((p) => textContent(p))
			.filter((t) => t.length > 40);
		if (paragraphs[0]) {
			const raw = paragraphs[0];
			if (raw.length <= 280) lede = raw;
			else {
				const cut = raw.slice(0, 280);
				const sentence = cut.match(/^[\s\S]*?[.!?]\s/)?.[0]?.trim();
				lede = sentence && sentence.length > 80 ? sentence : `${cut.replace(/\s+\S*$/, '').trim()}…`;
			}
		}
		const homeMd = htmlToMarkdown(clone.innerHTML).trim();
		if (homeMd.length > 200 && paragraphs.length >= 2) {
			homeMarkdown = homeMd;
			notes.push('Home bio is long enough for pages/home.md; the post index moves to /posts.');
		} else {
			notes.push('Home bio mapped to config `lede` (posts remain the index).');
		}
	}

	const posts: SiteIRPost[] = [];
	const rssByPath = new Map(rss.map((r) => [new URL(r.link, origin).pathname.replace(/\/+$/, ''), r]));

	const postUrls = [
		...new Set([
			...urls.filter((u) => u.kind === 'post').map((u) => u.url),
			...rss.map((r) => resolveUrl(origin, r.link)).filter((u): u is string => Boolean(u))
		])
	];

	for (const url of postUrls) {
		const loaded = await loadDoc(url);
		if (!loaded) continue;
		const { document, finalUrl } = loaded;
		const pathKey = new URL(finalUrl).pathname.replace(/\/+$/, '');
		const rssItem = rssByPath.get(pathKey);
		const main = pickMain(document);
		const clone = main.cloneNode(true) as Element;
		// Drop title heading from body if present
		const h1 = clone.querySelector('h1');
		h1?.remove();
		stripChrome(clone);
		rewriteInternalLinks(clone, finalUrl, origin);
		const subtitle = textContent(document.querySelector('.article-subtitle, .subtitle, .lede'));
		const markdown = htmlToMarkdown(clone.innerHTML);
		if (markdown.length < 40) {
			notes.push(`Skipped thin post body: ${finalUrl}`);
			continue;
		}
		const slug = uniqueSlug(slugFromUrl(finalUrl), usedSlugs);
		const date =
			rfc822ToIso(rssItem?.pubDate ?? null) ||
			dateFromDoc(document) ||
			new Date().toISOString().slice(0, 10);
		posts.push({
			slug,
			title: rssItem?.title || titleFromDoc(document),
			date,
			tags: tagsFromDoc(document),
			description: rssItem?.description || subtitle || metaContent(document, 'meta[name="description"]'),
			markdown,
			sourceUrl: finalUrl,
			imageUrls: extractImages(clone, finalUrl, origin)
		});
		notes.push(`Post ${finalUrl} → /posts/${slug}`);
	}

	posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));

	const pages: SiteIRPage[] = [];
	const pageUrls = urls.filter((u) => u.kind === 'page');
	let order = 1;
	for (const { url } of pageUrls) {
		const loaded = await loadDoc(url);
		if (!loaded) continue;
		const { document, finalUrl } = loaded;
		const path = new URL(finalUrl).pathname.replace(/\/+$/, '') || '/';
		if (path === '/') continue;
		const main = pickMain(document);
		const clone = main.cloneNode(true) as Element;
		clone.querySelector('h1')?.remove();
		stripChrome(clone);
		rewriteInternalLinks(clone, finalUrl, origin);
		const markdown = htmlToMarkdown(clone.innerHTML);
		if (markdown.length < 20) {
			notes.push(`Skipped thin page: ${finalUrl}`);
			continue;
		}
		const slug = uniqueSlug(slugFromUrl(finalUrl), usedSlugs);
		const pageTitle = titleFromDoc(document);
		// Prefer path-derived label when H1 is a personal name / brand duplicate
		const prettySlug = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		const useSlugTitle =
			slug === 'about' ||
			slug === 'contact' ||
			(pageTitle.length > 0 && pageTitle === title);
		pages.push({
			slug,
			title: useSlugTitle ? prettySlug : pageTitle,
			description: metaContent(document, 'meta[name="description"]'),
			markdown,
			sourceUrl: finalUrl,
			order: order++,
			imageUrls: extractImages(clone, finalUrl, origin)
		});
		notes.push(`Page ${finalUrl} → /${slug}`);
	}

	// Topics from tags
	const tagCounts = new Map<string, number>();
	for (const p of posts) {
		for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
	}
	const topics = [...tagCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 12)
		.map(([tag]) => ({
			label: tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			tag
		}));

	const nav: Array<{ label: string; href: string }> = homeMarkdown
		? [
				{ label: 'Home', href: '/' },
				{ label: 'Posts', href: '/posts' }
			]
		: [{ label: 'Posts', href: '/' }];
	for (const page of pages) {
		nav.push({
			label: page.title,
			href: `/${page.slug}`
		});
	}
	if (topics.length) nav.push({ label: 'Topics', href: '/topics' });

	const assets: string[] = [];
	if (homeDoc) {
		for (const link of homeDoc.document.querySelectorAll(
			'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
		)) {
			const href = link.getAttribute('href');
			if (!href) continue;
			const abs = resolveUrl(homeUrl, href);
			if (abs && sameOrigin(abs, origin)) assets.push(abs);
		}
	}
	// Common fallbacks often linked from HTML even when not in <link>
	for (const path of ['/favicon.ico', '/favicon.svg', '/favicon-64.png', '/apple-touch-icon.png']) {
		assets.push(`${origin.replace(/\/+$/, '')}${path}`);
	}

	return {
		source: { url: origin, generator },
		identity: {
			title,
			description: description || `${title} — imported into filepress.`,
			author,
			canonicalUrl: origin.replace(/\/+$/, '')
		},
		posts,
		pages,
		nav,
		topics,
		lede,
		homeMarkdown,
		notes,
		assets: [...new Set(assets)]
	};
}
