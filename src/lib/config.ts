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
export interface NewsletterConfig {
	/** Full URL to an external signup form (Buttondown, Substack, etc.). */
	url: string;
	/** One-line pitch shown above the button. */
	blurb: string;
	/** Button label. */
	cta: string;
}

/** A curated topic surfaced in the Explore/Topics view, mapped to a tag. */
export interface Topic {
	label: string;
	tag: string;
}

export interface SiteConfig {
	/** Human-readable site title, used in the header and feed. */
	title: string;
	/** One-line site description, used for SEO defaults and the RSS feed. */
	description: string;
	/** Optional longer tagline shown in the index hero; falls back to description. */
	tagline: string;
	/** Canonical origin, no trailing slash, e.g. "https://example.com". */
	url: string;
	/** Author/owner name, used in the feed and as the byline fallback. */
	author: string;
	/** Posts per page on the index (pagination, M5/edge cases). */
	postsPerPage: number;
	/** Primary header navigation links. */
	nav: { label: string; href: string }[];
	/**
	 * Curated topics for the Explore/Topics view (Stratechery-style). Empty means
	 * the Topics page just lists every tag alphabetically.
	 */
	topics: Topic[];
	/** Optional newsletter signup CTA; null hides it everywhere. */
	newsletter: NewsletterConfig | null;
}

function num(value: string | undefined, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const description =
	env.PUBLIC_SITE_DESCRIPTION ||
	'A git-native Markdown blog. Every post is a file; every push deploys.';

export const site: SiteConfig = {
	title: env.PUBLIC_SITE_TITLE || 'Downpress',
	description,
	tagline: env.PUBLIC_SITE_TAGLINE || description,
	url: (env.PUBLIC_SITE_URL || 'https://downpress.example.com').replace(/\/+$/, ''),
	author: env.PUBLIC_SITE_AUTHOR || 'Downpress',
	postsPerPage: num(env.PUBLIC_SITE_POSTS_PER_PAGE, 10),
	nav: [
		{ label: 'Posts', href: '/' },
		{ label: 'Topics', href: '/topics' }
	],
	topics: [],
	newsletter: env.PUBLIC_SITE_NEWSLETTER_URL
		? {
				url: env.PUBLIC_SITE_NEWSLETTER_URL,
				blurb:
					env.PUBLIC_SITE_NEWSLETTER_BLURB ||
					'Get new essays in your inbox. No spam, unsubscribe anytime.',
				cta: env.PUBLIC_SITE_NEWSLETTER_CTA || 'Subscribe'
			}
		: null
};

/** Join the site origin with a path, guarding against double slashes. */
export function absoluteUrl(path: string): string {
	const base = site.url.replace(/\/+$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
}
