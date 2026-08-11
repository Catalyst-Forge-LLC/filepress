import type { RequestHandler } from './$types';
import { buildRssXml } from '@filepress/core/server';
import { content } from '$lib/content.server';
import config from '$site-config';

export const prerender = true;

export const GET: RequestHandler = () => {
	const xml = buildRssXml(config, content.getPublishedPosts());
	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
