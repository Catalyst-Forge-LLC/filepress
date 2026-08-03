import type { SiteConfig } from '../config';
import { absoluteUrl } from '../config';
import type { PageMeta, PostMeta } from './types';

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** RFC-822 date at midnight UTC for a YYYY-MM-DD string. */
function rfc822(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).toUTCString();
}

/** Build an RSS 2.0 feed from published posts. */
export function buildRssXml(site: SiteConfig, posts: PostMeta[]): string {
	const items = posts
		.map((post) => {
			const url = absoluteUrl(site, `/posts/${post.slug}`);
			return `		<item>
			<title>${escapeXml(post.title)}</title>
			<link>${escapeXml(url)}</link>
			<guid isPermaLink="true">${escapeXml(url)}</guid>
			<pubDate>${rfc822(post.date)}</pubDate>
			${post.description ? `<description>${escapeXml(post.description)}</description>` : ''}
			${post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('\n\t\t\t')}
		</item>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>${escapeXml(site.title)}</title>
		<link>${escapeXml(site.url)}</link>
		<description>${escapeXml(site.description)}</description>
		<atom:link href="${escapeXml(absoluteUrl(site, '/rss.xml'))}" rel="self" type="application/rss+xml" />
${items}
	</channel>
</rss>
`;
}

/** Build a sitemap covering the index, static pages, paginated pages, topics, tags, and posts. */
export function buildSitemapXml(
	site: SiteConfig,
	data: {
		posts: PostMeta[];
		tags: { tag: string }[];
		pageCount: number;
		/** Published static pages (`pages/*.md`). */
		pages?: PageMeta[];
	}
): string {
	const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	const extraPages: { loc: string }[] = [];
	for (let n = 2; n <= data.pageCount; n++) extraPages.push({ loc: absoluteUrl(site, `/page/${n}`) });

	const staticPages = data.pages ?? [];

	const urls: { loc: string; lastmod?: string }[] = [
		{ loc: absoluteUrl(site, '/') },
		{ loc: absoluteUrl(site, '/topics') },
		{ loc: absoluteUrl(site, '/tags') },
		...extraPages,
		...staticPages.map((p) => ({ loc: absoluteUrl(site, `/${p.slug}`) })),
		...data.posts.map((p) => ({
			loc: absoluteUrl(site, `/posts/${p.slug}`),
			lastmod: p.updated ?? p.date
		})),
		...data.tags.map(({ tag }) => ({ loc: absoluteUrl(site, `/tags/${tag}`) }))
	];

	const body = urls
		.map(
			({ loc, lastmod }) =>
				`	<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/** Build robots.txt referencing the sitemap. */
export function buildRobotsTxt(site: SiteConfig): string {
	return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site, '/sitemap.xml')}
`;
}
