import type { RequestHandler } from './$types';
import { getAllTags, getPublishedPosts } from '$lib/content/posts';
import { absoluteUrl } from '$lib/config';

export const prerender = true;

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: RequestHandler = () => {
	const posts = getPublishedPosts();
	const tags = getAllTags();

	const urls: { loc: string; lastmod?: string }[] = [
		{ loc: absoluteUrl('/') },
		{ loc: absoluteUrl('/tags') },
		...posts.map((p) => ({
			loc: absoluteUrl(`/posts/${p.slug}`),
			lastmod: p.updated ?? p.date
		})),
		...tags.map(({ tag }) => ({ loc: absoluteUrl(`/tags/${tag}`) }))
	];

	const body = urls
		.map(
			({ loc, lastmod }) =>
				`	<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
