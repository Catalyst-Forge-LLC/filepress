import type { RequestHandler } from './$types';
import { absoluteUrl } from '$lib/config';

export const prerender = true;

export const GET: RequestHandler = () => {
	const body = `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
