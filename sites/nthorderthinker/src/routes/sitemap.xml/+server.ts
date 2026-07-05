import type { RequestHandler } from './$types';
import { buildSitemapXml } from '@downpress/core/server';
import { content } from '$lib/content.server';
import config from '$lib/downpress.config';

export const prerender = true;

export const GET: RequestHandler = () => {
	const xml = buildSitemapXml(config, {
		posts: content.getPublishedPosts(),
		tags: content.getAllTags(),
		pageCount: content.getIndexPageCount(config.postsPerPage)
	});
	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
