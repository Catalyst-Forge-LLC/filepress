import { createContent } from '@downpress/core/server';

// Content lives in this site's own `posts/` directory by default. DOWNPRESS_CONTENT_DIR
// can override it (absolute, or relative to the site root) for local experiments.
export const content = createContent({
	contentDir: process.env.DOWNPRESS_CONTENT_DIR?.trim() || 'posts'
});
