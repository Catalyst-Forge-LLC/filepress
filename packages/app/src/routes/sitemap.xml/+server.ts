import type { RequestHandler } from './$types';
import { buildSitemapXml } from '@filepress/core/server';
import { content } from '$lib/content.server';
import { pages } from '$lib/pages.server';
import config from '$site-config';

export const prerender = true;

export const GET: RequestHandler = () => {
	const xml = buildSitemapXml(config, {
		posts: content.getPublishedPosts(),
		tags: content.getAllTags(),
		pageCount: content.getIndexPageCount(config.postsPerPage),
		pages: pages.getPublishedPages()
	});
	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
