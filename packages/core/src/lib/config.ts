/**
 * Downpress site configuration — the single per-site config surface.
 *
 * A site declares its identity in `downpress.config.ts` at the site root via
 * `defineDownpressConfig({...})`. Core never reads environment variables for
 * identity; the site owns that (and may read env in its own config file). This
 * keeps `@downpress/core` app-agnostic and importable from both client and
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
	/** Canonical origin, no trailing slash, e.g. "https://example.com". */
	url: string;
	author: string;
	/** Posts per page on the index (after the featured one). */
	postsPerPage: number;
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
	author?: string;
	postsPerPage?: number;
	nav?: NavItem[];
	topics?: Topic[];
	newsletter?: NewsletterConfig | null;
}

/**
 * Validate and normalize a site's config, applying defaults. Fails loudly if a
 * required field is missing (edge case 19) so a misconfigured site never builds
 * a broken feed or canonical URL silently.
 */
export function defineDownpressConfig(input: SiteConfigInput): SiteConfig {
	if (!input || typeof input !== 'object') {
		throw new Error('defineDownpressConfig: expected a config object.');
	}
	const title = (input.title ?? '').trim();
	if (!title) throw new Error('downpress.config: `title` is required.');
	const url = (input.url ?? '').trim();
	if (!url) throw new Error('downpress.config: `url` is required.');
	if (!/^https?:\/\//.test(url)) {
		throw new Error(`downpress.config: \`url\` must start with http(s):// (got "${url}").`);
	}

	const description = (input.description ?? '').trim();

	return {
		title,
		description,
		tagline: (input.tagline ?? '').trim() || description || title,
		lede: (input.lede ?? '').trim() || null,
		logo: (input.logo ?? '').trim() || null,
		url: url.replace(/\/+$/, ''),
		author: (input.author ?? '').trim() || title,
		postsPerPage:
			Number.isFinite(input.postsPerPage) && (input.postsPerPage as number) > 0
				? Math.floor(input.postsPerPage as number)
				: 10,
		nav:
			input.nav && input.nav.length
				? input.nav
				: [
						{ label: 'Posts', href: '/' },
						{ label: 'Topics', href: '/topics' }
					],
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
