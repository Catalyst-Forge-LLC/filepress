/**
 * Site-specific configuration for this Downpress site.
 *
 * In the future core/site split (see docs/PHASE_1_BRIEF.md §11, M4), this is the
 * single per-site config file. For now it lives in-repo. Every Site is served
 * from a custom domain, so `url` is the canonical origin with no base path.
 */
export interface SiteConfig {
	/** Human-readable site title, used in the header and feed. */
	title: string;
	/** One-line site description, used for SEO defaults and the RSS feed. */
	description: string;
	/** Canonical origin, no trailing slash, e.g. "https://example.com". */
	url: string;
	/** Author/owner name, used in the feed. */
	author: string;
	/** Primary header navigation links. */
	nav: { label: string; href: string }[];
}

export const site: SiteConfig = {
	title: 'Downpress',
	description: 'A git-native Markdown blog. Every post is a file; every push deploys.',
	url: 'https://downpress.example.com',
	author: 'Downpress',
	nav: [
		{ label: 'Posts', href: '/' },
		{ label: 'Tags', href: '/tags' }
	]
};

/** Join the site origin with a path, guarding against double slashes. */
export function absoluteUrl(path: string): string {
	const base = site.url.replace(/\/+$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
}
