import { env } from '$env/dynamic/public';

/**
 * Site-specific configuration for this Downpress site.
 *
 * In the future core/site split (see docs/PHASE_1_BRIEF.md §11, M4), this is the
 * single per-site config file. For now it lives in-repo. Every Site is served
 * from a custom domain, so `url` is the canonical origin with no base path.
 *
 * Identity fields can be overridden per build via PUBLIC_* env vars (see
 * .env.example), which lets one checkout build as different sites during local
 * dev and maps cleanly onto Cloudflare Pages build-time env. Defaults below are
 * the Downpress engine's own demo identity.
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
	title: env.PUBLIC_SITE_TITLE || 'Downpress',
	description:
		env.PUBLIC_SITE_DESCRIPTION ||
		'A git-native Markdown blog. Every post is a file; every push deploys.',
	url: (env.PUBLIC_SITE_URL || 'https://downpress.example.com').replace(/\/+$/, ''),
	author: env.PUBLIC_SITE_AUTHOR || 'Downpress',
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
