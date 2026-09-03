/**
 * WordPress REST overlay for filepress import.
 * Sitemap + HTML still own the crawl; this fills categories → tags and nav.
 */
import { fetchText, originOf } from './fetch.ts';

export type WpTerm = {
	id: number;
	name: string;
	slug: string;
	count: number;
};

export type WpPostStub = {
	slug: string;
	title: string;
	date: string;
	link: string;
	excerpt: string | null;
	/** Category + tag slugs; `uncategorized` dropped. */
	tags: string[];
};

export type WpPageStub = {
	slug: string;
	title: string;
	link: string;
	excerpt: string | null;
	isHome: boolean;
};

export type WpCatalog = {
	posts: WpPostStub[];
	pages: WpPageStub[];
	categories: WpTerm[];
	tags: WpTerm[];
};

const SKIP_CATEGORY = new Set(['uncategorized']);
const SKIP_PAGE = new Set(['sample-page']);

export function decodeWpText(raw: string): string {
	return raw
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#039;|&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function termsToTags(categories: WpTerm[], tags: WpTerm[], categoryIds: number[], tagIds: number[]): string[] {
	const byId = new Map<number, WpTerm>();
	for (const t of [...categories, ...tags]) byId.set(t.id, t);
	const out: string[] = [];
	for (const id of [...categoryIds, ...tagIds]) {
		const term = byId.get(id);
		if (!term || SKIP_CATEGORY.has(term.slug)) continue;
		if (!out.includes(term.slug)) out.push(term.slug);
	}
	return out;
}

export function navFromWordpress(catalog: WpCatalog, opts: { homePage: boolean }): Array<{ label: string; href: string }> {
	const nav: Array<{ label: string; href: string }> = opts.homePage
		? [
				{ label: 'Home', href: '/' },
				{ label: 'Posts', href: '/posts' }
			]
		: [{ label: 'Posts', href: '/' }];
	for (const c of catalog.categories) {
		if (SKIP_CATEGORY.has(c.slug) || c.count < 1) continue;
		nav.push({ label: c.name, href: `/tags/${c.slug}` });
	}
	for (const page of catalog.pages) {
		if (page.isHome || SKIP_PAGE.has(page.slug)) continue;
		const label = page.slug === 'contact-us' ? 'Contact' : page.title;
		nav.push({ label, href: `/${page.slug}` });
	}
	return nav;
}

export function topicsFromWordpress(catalog: WpCatalog): Array<{ label: string; tag: string }> {
	return catalog.categories
		.filter((c) => !SKIP_CATEGORY.has(c.slug) && c.count > 0)
		.map((c) => ({ label: c.name, tag: c.slug }));
}

type WpJsonPost = {
	slug?: string;
	title?: { rendered?: string };
	date?: string;
	link?: string;
	excerpt?: { rendered?: string };
	categories?: number[];
	tags?: number[];
};

type WpJsonPage = WpJsonPost & { id?: number };

type WpJsonTerm = {
	id?: number;
	name?: string;
	slug?: string;
	count?: number;
};

async function fetchCollection<T>(url: string): Promise<T[] | null> {
	const { status, text, contentType } = await fetchText(url, {
		headers: { accept: 'application/json' }
	});
	if (status >= 400) return null;
	if (contentType && !/json/i.test(contentType) && !text.trimStart().startsWith('[')) return null;
	try {
		const data = JSON.parse(text) as unknown;
		return Array.isArray(data) ? (data as T[]) : null;
	} catch {
		return null;
	}
}

function mapTerm(t: WpJsonTerm): WpTerm | null {
	if (typeof t.id !== 'number' || !t.slug) return null;
	return {
		id: t.id,
		name: decodeWpText(String(t.name ?? t.slug)),
		slug: String(t.slug),
		count: typeof t.count === 'number' ? t.count : 0
	};
}

/** Probe `/wp-json/wp/v2` and load posts, pages, categories, tags. Null if not WordPress. */
export async function fetchWordpressCatalog(sourceUrl: string): Promise<WpCatalog | null> {
	const origin = originOf(sourceUrl.endsWith('/') ? sourceUrl : `${sourceUrl}/`);
	const probe = await fetchText(`${origin}/wp-json/wp/v2/categories?per_page=1&_fields=id`, {
		headers: { accept: 'application/json' }
	});
	if (probe.status >= 400) return null;
	if (!/json/i.test(probe.contentType) && !probe.text.trimStart().startsWith('[')) return null;

	const [postsRaw, pagesRaw, catsRaw, tagsRaw] = await Promise.all([
		fetchCollection<WpJsonPost>(
			`${origin}/wp-json/wp/v2/posts?per_page=100&_fields=slug,title,date,link,excerpt,categories,tags`
		),
		fetchCollection<WpJsonPage>(
			`${origin}/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,title,date,link,excerpt`
		),
		fetchCollection<WpJsonTerm>(`${origin}/wp-json/wp/v2/categories?per_page=100`),
		fetchCollection<WpJsonTerm>(`${origin}/wp-json/wp/v2/tags?per_page=100`)
	]);

	if (!postsRaw && !pagesRaw) return null;

	const categories = (catsRaw ?? []).map(mapTerm).filter((t): t is WpTerm => Boolean(t));
	const tags = (tagsRaw ?? []).map(mapTerm).filter((t): t is WpTerm => Boolean(t));

	const posts: WpPostStub[] = (postsRaw ?? [])
		.filter((p) => p.link && p.slug)
		.map((p) => ({
			slug: String(p.slug),
			title: decodeWpText(String(p.title?.rendered ?? p.slug)),
			date: String(p.date ?? '').slice(0, 10),
			link: String(p.link),
			excerpt: p.excerpt?.rendered ? decodeWpText(p.excerpt.rendered) : null,
			tags: termsToTags(categories, tags, p.categories ?? [], p.tags ?? [])
		}));

	const pages: WpPageStub[] = (pagesRaw ?? [])
		.filter((p) => p.link && p.slug)
		.filter((p) => !SKIP_PAGE.has(String(p.slug)))
		.map((p) => {
			const link = String(p.link);
			let path = '/';
			try {
				path = new URL(link).pathname.replace(/\/+$/, '') || '/';
			} catch {
				/* keep / */
			}
			return {
				slug: String(p.slug),
				title: decodeWpText(String(p.title?.rendered ?? p.slug)),
				link,
				excerpt: p.excerpt?.rendered ? decodeWpText(p.excerpt.rendered) : null,
				isHome: path === '/'
			};
		});

	return { posts, pages, categories, tags };
}
