/**
 * filepress site configuration — the single per-site config surface.
 *
 * A site declares its identity in `filepress.config.ts` at the site root via
 * `defineFilepressConfig({...})`. Core never reads environment variables for
 * identity; the site owns that (and may read env in its own config file). This
 * keeps `@filepress/core` app-agnostic and importable from both client and
 * server code.
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

export interface NavItem {
	label: string;
	href: string;
}

/** Fully-resolved site configuration (after defaults are applied). */
export interface SiteConfig {
	title: string;
	description: string;
	tagline: string;
	/** One-line lede shown on the index hero, or null for no visible hero. */
	lede: string | null;
	/** Path to a masthead logo image (site-relative, e.g. "/logo.png"), or null for text. */
	logo: string | null;
	/**
	 * Absolute or site-relative Open Graph image (e.g. "/logo.png").
	 * Defaults to `logo` when unset.
	 */
	ogImage: string | null;
	/** Canonical origin, no trailing slash, e.g. "https://example.com". */
	url: string;
	author: string;
	/** Posts per page on the index (after the featured one). */
	postsPerPage: number;
	/**
	 * When set, `/` renders this static page slug (`pages/<slug>.md`) and the
	 * chronological post index moves to `/writing`.
	 */
	homePage: string | null;
	nav: NavItem[];
	topics: Topic[];
	newsletter: NewsletterConfig | null;
}

/** What a site author supplies; everything but `title` and `url` is optional. */
export interface SiteConfigInput {
	title: string;
	url: string;
	description?: string;
	tagline?: string;
	lede?: string;
	logo?: string;
	/** Open Graph image path; defaults to `logo`. */
	ogImage?: string;
	author?: string;
	postsPerPage?: number;
	/** Static page slug to show at `/` (post index then lives at `/writing`). */
	homePage?: string;
	nav?: NavItem[];
	topics?: Topic[];
	newsletter?: NewsletterConfig | null;
}

/** Path to page 1 of the chronological post index. */
export function postsIndexPath(site: Pick<SiteConfig, 'homePage'>): string {
	return site.homePage ? '/writing' : '/';
}

/**
 * Validate and normalize a site's config, applying defaults. Fails loudly if a
 * required field is missing (edge case 19) so a misconfigured site never builds
 * a broken feed or canonical URL silently.
 */
export function defineFilepressConfig(input: SiteConfigInput): SiteConfig {
	if (!input || typeof input !== 'object') {
		throw new Error('defineFilepressConfig: expected a config object.');
	}
	const title = (input.title ?? '').trim();
	if (!title) throw new Error('filepress.config: `title` is required.');
	const url = (input.url ?? '').trim();
	if (!url) throw new Error('filepress.config: `url` is required.');
	if (!/^https?:\/\//.test(url)) {
		throw new Error(`filepress.config: \`url\` must start with http(s):// (got "${url}").`);
	}

	const description = (input.description ?? '').trim();
	const homePage = (input.homePage ?? '').trim() || null;
	if (homePage && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(homePage)) {
		throw new Error(
			`filepress.config: \`homePage\` must be a simple slug (got "${homePage}").`
		);
	}

	const defaultNav: NavItem[] = homePage
		? [
				{ label: 'Home', href: '/' },
				{ label: 'Posts', href: '/writing' },
				{ label: 'Topics', href: '/topics' }
			]
		: [
				{ label: 'Posts', href: '/' },
				{ label: 'Topics', href: '/topics' }
			];

	return {
		title,
		description,
		tagline: (input.tagline ?? '').trim() || description || title,
		lede: (input.lede ?? '').trim() || null,
		logo: (input.logo ?? '').trim() || null,
		ogImage:
			(input.ogImage ?? '').trim() || (input.logo ?? '').trim() || null,
		url: url.replace(/\/+$/, ''),
		author: (input.author ?? '').trim() || title,
		postsPerPage:
			Number.isFinite(input.postsPerPage) && (input.postsPerPage as number) > 0
				? Math.floor(input.postsPerPage as number)
				: 10,
		homePage,
		nav: input.nav && input.nav.length ? input.nav : defaultNav,
		topics: input.topics ?? [],
		newsletter: input.newsletter ?? null
	};
}

/** Join the site origin with a path, guarding against double slashes. */
export function absoluteUrl(site: Pick<SiteConfig, 'url'>, path: string): string {
	const base = site.url.replace(/\/+$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
}

/** Absolute URL for Open Graph / Twitter cards, or null when unset. */
export function ogImageUrl(
	site: Pick<SiteConfig, 'url' | 'ogImage'>
): string | null {
	if (!site.ogImage) return null;
	if (/^https?:\/\//i.test(site.ogImage)) return site.ogImage;
	return absoluteUrl(site, site.ogImage);
}
