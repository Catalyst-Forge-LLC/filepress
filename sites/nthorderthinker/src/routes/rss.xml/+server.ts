import type { RequestHandler } from './$types';
import { buildRssXml } from '@downpress/core/server';
import { content } from '$lib/content.server';
import config from '$lib/downpress.config';

export const prerender = true;

export const GET: RequestHandler = () => {
	const xml = buildRssXml(config, content.getPublishedPosts());
	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
