// Server-only public API for @downpress/core. These modules touch the
// filesystem (content loader) and must only be imported from server code
// (`+page.server.ts`, `+server.ts`, or a `*.server.ts` lib module).

export { createContent } from './content/content';
export type { ContentApi } from './content/content';
export { renderMarkdown } from './content/markdown';
export { buildRssXml, buildSitemapXml, buildRobotsTxt } from './content/feeds';
export {
	ContentError,
	parsePost,
	slugify,
	normalizeTag,
	assertUniqueSlugs,
	assertValidDate,
	filenameOf
} from './content/parse';

export { absoluteUrl } from './config';
export type { SiteConfig } from './config';
export type { PostMeta, PostSource, RenderedPost } from './content/types';
