import { createContent } from '@downpress/core/server';
import { getContentDir } from './site.server';

// Bound to the active site's posts/ (or DOWNPRESS_CONTENT_DIR). Resolved at
// module load from DOWNPRESS_SITE_ROOT set by scripts/downpress.mjs.
export const content = createContent({
	contentDir: getContentDir()
});
