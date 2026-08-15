// Server-only public API for @filepress/core. These modules touch the
// filesystem (content loader) and must only be imported from server code
// (`+page.server.ts`, `+server.ts`, or a `*.server.ts` lib module).

export { createContent, resolveListDrafts } from './content/content';
export type { CreateContentOptions } from './content/content';
export type { ContentApi } from './content/content';
export { createPages } from './content/pages';
export type { CreatePagesOptions, PagesApi } from './content/pages';
export { renderMarkdown } from './content/markdown';
export { buildRssXml, buildSitemapXml, buildRobotsTxt } from './content/feeds';
export {
	ContentError,
	parsePost,
	parsePage,
	slugify,
	normalizeTag,
	assertUniqueSlugs,
	assertValidDate,
	filenameOf
} from './content/parse';

export { absoluteUrl, ogImageUrl } from './config';
export type { SiteConfig, PathMount } from './config';
export {
	normalizePathMounts,
	pathMountReservedSlugs,
	resolvePathMountDir,
	copyPathMounts,
	listPathMountHtmlUrls
} from './paths';
export type {
	PostMeta,
	PostSource,
	RenderedPost,
	PageMeta,
	PageSource,
	RenderedPage
} from './content/types';
export { RESERVED_PAGE_SLUGS } from './content/types';
