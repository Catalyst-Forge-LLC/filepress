import { createPages, pathMountReservedSlugs } from '@filepress/core/server';
import { getPagesDir } from './site.server';
import config from '$site-config';

/** Bound to the active site's `pages/` (missing dir → empty). */
export const pages = createPages({
	pagesDir: getPagesDir(),
	extraReservedSlugs: pathMountReservedSlugs(config.paths ?? [])
});
