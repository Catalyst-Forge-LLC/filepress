import { XMLParser } from 'fast-xml-parser';
import { fetchText, originOf, resolveUrl, sameOrigin } from './fetch.ts';

export type DiscoveredUrl = {
	url: string;
	kind: 'home' | 'post' | 'page' | 'tag' | 'listing' | 'other';
};

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_'
});

function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

function classify(url: string, origin: string): DiscoveredUrl['kind'] {
	const u = new URL(url);
	if (u.origin !== new URL(origin).origin) return 'other';
	const path = u.pathname.replace(/\/+$/, '') || '/';
	if (path === '/') return 'home';
	if (/\/tags?\//i.test(path) || /\/topics?\//i.test(path)) return 'tag';
	if (/\/(writing|essays|posts|blog|articles)\/[^/]+/i.test(path)) return 'post';
	if (/\/(writing|essays|posts|blog|articles)\/?$/i.test(path)) return 'listing';
	if (/\/(about|contact|speaking|now|colophon|privacy|resume|cv)\/?$/i.test(path)) return 'page';
	// Single-segment paths are likely pages; deeper unknown paths → other
	const segs = path.split('/').filter(Boolean);
	if (segs.length === 1) return 'page';
	if (segs.length >= 2) return 'post';
	return 'other';
}

async function readRobotsSitemaps(origin: string): Promise<string[]> {
	try {
		const { status, text } = await fetchText(`${origin}/robots.txt`);
		if (status >= 400) return [`${origin}/sitemap.xml`, `${origin}/sitemap-0.xml`];
		const maps: string[] = [];
		for (const line of text.split(/\r?\n/)) {
			const m = line.match(/^\s*sitemap:\s*(.+)$/i);
			if (m) maps.push(m[1].trim());
		}
		if (maps.length) return maps;
	} catch {
		/* fall through */
	}
	return [`${origin}/sitemap.xml`, `${origin}/sitemap-0.xml`];
}

async function urlsFromSitemap(sitemapUrl: string, origin: string): Promise<string[]> {
	const { status, text, contentType } = await fetchText(sitemapUrl);
	if (status >= 400) return [];
	if (!/xml|text\/plain/i.test(contentType) && !text.trimStart().startsWith('<?xml')) {
		return [];
	}

	let doc: unknown;
	try {
		doc = xmlParser.parse(text);
	} catch {
		return [];
	}

	const root = doc as Record<string, unknown>;
	// sitemap index
	const index = root.sitemapindex as { sitemap?: { loc?: string } | { loc?: string }[] } | undefined;
	if (index?.sitemap) {
		const nested = asArray(index.sitemap);
		const out: string[] = [];
		for (const s of nested) {
			if (s.loc) out.push(...(await urlsFromSitemap(String(s.loc), origin)));
		}
		return out;
	}

	const urlset = root.urlset as { url?: { loc?: string } | { loc?: string }[] } | undefined;
	if (!urlset?.url) return [];
	return asArray(urlset.url)
		.map((u) => (u.loc ? String(u.loc) : ''))
		.filter((u) => u && sameOrigin(u, origin));
}

export type RssItem = {
	title: string;
	link: string;
	description: string | null;
	pubDate: string | null;
};

async function readRss(origin: string): Promise<{ channelTitle: string | null; items: RssItem[] }> {
	const candidates = [`${origin}/rss.xml`, `${origin}/feed.xml`, `${origin}/atom.xml`, `${origin}/feed`];
	for (const feedUrl of candidates) {
		try {
			const { status, text } = await fetchText(feedUrl);
			if (status >= 400) continue;
			if (!/<rss|<feed/i.test(text)) continue;
			const doc = xmlParser.parse(text) as Record<string, unknown>;
			if (doc.rss) {
				const channel = (doc.rss as { channel?: Record<string, unknown> }).channel ?? {};
				const items = asArray(channel.item as RssItem | RssItem[] | undefined).map((it) => ({
					title: String((it as { title?: string }).title ?? '').trim(),
					link: String((it as { link?: string }).link ?? '').trim(),
					description: (it as { description?: string }).description
						? String((it as { description?: string }).description).trim()
						: null,
					pubDate: (it as { pubDate?: string }).pubDate
						? String((it as { pubDate?: string }).pubDate).trim()
						: null
				}));
				return {
					channelTitle: channel.title ? String(channel.title) : null,
					items: items.filter((i) => i.link && i.title)
				};
			}
		} catch {
			/* try next */
		}
	}
	return { channelTitle: null, items: [] };
}

export type DiscoverResult = {
	origin: string;
	urls: DiscoveredUrl[];
	rss: RssItem[];
	rssTitle: string | null;
};

/** Discover URLs via robots/sitemap + RSS. Deterministic. */
export async function discoverSite(sourceUrl: string): Promise<DiscoverResult> {
	const origin = originOf(sourceUrl.endsWith('/') ? sourceUrl : `${sourceUrl}/`);
	const sitemapUrls = await readRobotsSitemaps(origin);
	const found = new Set<string>();
	found.add(`${origin}/`);

	for (const sm of sitemapUrls) {
		for (const u of await urlsFromSitemap(sm, origin)) {
			found.add(u.endsWith('/') || u.includes('.') ? u : `${u}/`);
			// normalize without forcing trailing slash for later fetch
			found.add(u.replace(/\/+$/, '') || `${origin}/`);
		}
	}

	const { channelTitle, items } = await readRss(origin);
	for (const item of items) {
		const abs = resolveUrl(origin, item.link);
		if (abs && sameOrigin(abs, origin)) found.add(abs);
	}

	// Always probe common pages
	for (const p of ['/about', '/contact', '/writing', '/essays', '/blog', '/posts']) {
		found.add(`${origin}${p}`);
	}

	const urls: DiscoveredUrl[] = [...found]
		.map((url) => {
			try {
				const clean = new URL(url).href;
				return { url: clean, kind: classify(clean, origin) };
			} catch {
				return null;
			}
		})
		.filter((x): x is DiscoveredUrl => Boolean(x));

	// Deduplicate by pathname
	const byPath = new Map<string, DiscoveredUrl>();
	for (const u of urls) {
		const key = new URL(u.url).pathname.replace(/\/+$/, '') || '/';
		const prev = byPath.get(key);
		if (!prev || (prev.kind === 'other' && u.kind !== 'other')) byPath.set(key, u);
		else if (!prev) byPath.set(key, u);
	}

	// Prefer RSS classification for posts
	for (const item of items) {
		const abs = resolveUrl(origin, item.link);
		if (!abs) continue;
		const key = new URL(abs).pathname.replace(/\/+$/, '') || '/';
		byPath.set(key, { url: abs, kind: 'post' });
	}

	return {
		origin,
		urls: [...byPath.values()],
		rss: items,
		rssTitle: channelTitle
	};
}
