import { createPages } from '@filepress/core/server';
import { getPagesDir } from './site.server';

/** Bound to the active site's `pages/` (missing dir → empty). */
export const pages = createPages({
	pagesDir: getPagesDir()
});
