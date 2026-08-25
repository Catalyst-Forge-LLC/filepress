/**
 * filepress site configuration — the single per-site config surface.
 *
 * A site declares its identity in `filepress.config.ts` at the site root via
 * `defineFilepressConfig({...})`. Core never reads environment variables for
 * identity; the site owns that (and may read env in its own config file). This
 * keeps `@filepress/core` app-agnostic and importable from both client and
 * server code.
 */
import { normalizePathMounts, type PathMount } from './paths-shared';
import { writingPostRedirects, type RedirectRule } from './redirects';
export type { PathMount } from './paths-shared';
export type { RedirectRule } from './redirects';

export const THEME_PRESETS = ['essay', 'ink', 'folio'] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];
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

/** Built-in icons that chrome can render beside a nav/footer label. */
export type NavIconName = 'github';

export interface NavItem {
	label: string;
	href: string;
	/** Optional icon rendered with the label (e.g. GitHub mark). */
	icon?: NavIconName;
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
	 * chronological post index moves to `/posts`.
	 */
	homePage: string | null;
	nav: NavItem[];
	/**
	 * Footer link row. Defaults to RSS + Topics when omitted.
	 * Pass an explicit list (including RSS/Topics if you still want them) to customize.
	 */
	footerLinks: NavItem[];
	topics: Topic[];
	newsletter: NewsletterConfig | null;
	/**
	 * Site-owned trees mounted at a URL prefix (e.g. `/docs` ← `docs/dist`).
	 * Copied into `build/` on `filepress build`; served in `filepress dev`.
	 * FilePress does not parse or theme mount contents.
	 */
	paths: PathMount[];
	/** Named token sheet loaded after Essay, before the site `theme.css`. */
	theme: ThemePreset;
	/** Extra Cloudflare/Netlify `_redirects` lines merged at build. */
	redirects: RedirectRule[];
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
	/** Static page slug to show at `/` (post index then lives at `/posts`). */
	homePage?: string;
	nav?: NavItem[];
	/** Custom footer links; replaces the default RSS + Topics row when set. */
	footerLinks?: NavItem[];
	topics?: Topic[];
	newsletter?: NewsletterConfig | null;
	/** Mount site-relative dirs at URL prefixes (docs shells, etc.). */
	paths?: PathMount[];
	/** Built-in token preset. Default `essay`. Site `theme.css` still wins last. */
	theme?: ThemePreset;
	/** Extra `_redirects` rules (from → to). */
	redirects?: RedirectRule[];
}

const defaultFooterLinks: NavItem[] = [
	{ label: 'RSS', href: '/rss.xml' },
	{ label: 'Topics', href: '/topics' }
];

function normalizeNavItems(items: NavItem[] | undefined): NavItem[] | null {
	if (!items?.length) return null;
	return items.map((item) => {
		const label = (item.label ?? '').trim();
		const href = (item.href ?? '').trim();
		if (!label || !href) {
			throw new Error('filepress.config: nav/footerLinks entries need non-empty label and href.');
		}
		const icon = item.icon;
		if (icon != null && icon !== 'github') {
			throw new Error(`filepress.config: unsupported icon "${String(icon)}" (supported: github).`);
		}
		return icon ? { label, href, icon } : { label, href };
	});
}

/** Path to page 1 of the chronological post index. */
export function postsIndexPath(site: Pick<SiteConfig, 'homePage'>): string {
	return site.homePage ? '/posts' : '/';
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
				{ label: 'Posts', href: '/posts' },
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
		nav: normalizeNavItems(input.nav) ?? defaultNav,
		footerLinks: normalizeNavItems(input.footerLinks) ?? [...defaultFooterLinks],
		topics: input.topics ?? [],
		newsletter: input.newsletter ?? null,
		paths: normalizePathMounts(input.paths),
		theme: normalizeTheme(input.theme),
		redirects: normalizeRedirects(input.redirects)
	};
}

/** Engine + site rules to write into `build/_redirects`. */
export function buildRedirectRules(site: Pick<SiteConfig, 'homePage' | 'redirects'>): RedirectRule[] {
	return [...(site.homePage ? writingPostRedirects() : []), ...site.redirects];
}

function normalizeTheme(theme: ThemePreset | undefined): ThemePreset {
	const name = (theme ?? 'essay').trim().toLowerCase();
	if (!THEME_PRESETS.includes(name as ThemePreset)) {
		throw new Error(
			`filepress.config: \`theme\` must be ${THEME_PRESETS.join(', ')} (got "${theme}").`
		);
	}
	return name as ThemePreset;
}

function normalizeRedirects(rules: RedirectRule[] | undefined): RedirectRule[] {
	if (!rules?.length) return [];
	return rules.map((rule) => {
		const from = (rule.from ?? '').trim();
		const to = (rule.to ?? '').trim();
		if (!from || !to) {
			throw new Error('filepress.config: redirects need non-empty `from` and `to`.');
		}
		const status = rule.status ?? 301;
		if (status !== 301 && status !== 302 && status !== 308) {
			throw new Error(`filepress.config: redirect status must be 301, 302, or 308 (got ${status}).`);
		}
		return { from, to, status };
	});
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
