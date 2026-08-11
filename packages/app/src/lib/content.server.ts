import { createContent } from '@filepress/core/server';
import { getContentDir } from './site.server';

// Bound to the active site's posts/ (or FILEPRESS_CONTENT_DIR). Resolved at
// module load from FILEPRESS_SITE_ROOT set by scripts/filepress.mjs.
export const content = createContent({
	contentDir: getContentDir()
});
