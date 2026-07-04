import type { RequestHandler } from './$types';
import { getPublishedPosts } from '$lib/content/posts';
import { site, absoluteUrl } from '$lib/config';

export const prerender = true;

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

export const GET: RequestHandler = () => {
	const posts = getPublishedPosts();
	const items = posts
		.map((post) => {
			const url = absoluteUrl(`/posts/${post.slug}`);
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

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>${escapeXml(site.title)}</title>
		<link>${escapeXml(site.url)}</link>
		<description>${escapeXml(site.description)}</description>
		<atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
${items}
	</channel>
</rss>
`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
