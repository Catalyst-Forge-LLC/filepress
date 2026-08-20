/**
 * Client-safe path-mount helpers (no filesystem).
 * Copy / HTML listing live in `./paths.ts` (server-only).
 */
import { RESERVED_PAGE_SLUGS } from './content/types';

/** One mount: `dir` (site-relative) is copied/served at `url` (e.g. `/docs`). */
export interface PathMount {
	/** Site-relative directory (e.g. `docs/dist`). */
	dir: string;
	/** URL prefix starting with `/`, no trailing slash (e.g. `/docs`). */
	url: string;
}

/** Engine route prefixes a mount must not steal. */
const ENGINE_URL_PREFIXES = new Set([
	...RESERVED_PAGE_SLUGS,
	'',
	'_app',
	'__filepress',
]);

/**
 * Normalize and validate `paths` from site config.
 * Throws on empty/invalid entries or collisions with engine routes.
 */
export function normalizePathMounts(input: PathMount[] | undefined): PathMount[] {
	if (input == null) return [];
	if (!Array.isArray(input)) {
		throw new Error('filepress.config: `paths` must be an array of { url, dir }.');
	}

	const seenUrls = new Set<string>();
	const seenDirs = new Set<string>();
	const out: PathMount[] = [];

	for (const raw of input) {
		if (!raw || typeof raw !== 'object') {
			throw new Error('filepress.config: each `paths` entry must be an object { url, dir }.');
		}
		const dir = String(raw.dir ?? '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
		let url = String(raw.url ?? '').trim().replace(/\\/g, '/');
		if (!dir) {
			throw new Error('filepress.config: `paths[].dir` must be a non-empty site-relative path.');
		}
		if (dir.startsWith('/') || /^[a-zA-Z]:/.test(dir) || dir.includes('..')) {
			throw new Error(
				`filepress.config: \`paths[].dir\` must be a relative path without "..\" (got "${raw.dir}").`,
			);
		}
		if (!url.startsWith('/')) {
			throw new Error(`filepress.config: \`paths[].url\` must start with / (got "${raw.url}").`);
		}
		url = url.replace(/\/+$/, '') || '/';
		if (url === '/') {
			throw new Error('filepress.config: `paths[].url` cannot be `/` (that is the site home).');
		}
		const first = url.slice(1).split('/')[0] ?? '';
		if (!first || ENGINE_URL_PREFIXES.has(first)) {
			throw new Error(
				`filepress.config: \`paths\` url "/${first}" collides with an engine route ` +
					`(${[...RESERVED_PAGE_SLUGS].join(', ')}). Choose another prefix.`,
			);
		}
		if (seenUrls.has(url)) {
			throw new Error(`filepress.config: duplicate \`paths\` url "${url}".`);
		}
		if (seenDirs.has(dir)) {
			throw new Error(`filepress.config: duplicate \`paths\` dir "${dir}".`);
		}
		for (const other of seenUrls) {
			if (url.startsWith(`${other}/`) || other.startsWith(`${url}/`)) {
				throw new Error(
					`filepress.config: \`paths\` urls "${url}" and "${other}" nest; use disjoint prefixes.`,
				);
			}
		}
		seenUrls.add(url);
		seenDirs.add(dir);
		out.push({ url, dir });
	}

	return out;
}

/** First URL segment of each mount — reserved against `pages/<slug>.md`. */
export function pathMountReservedSlugs(mounts: PathMount[]): string[] {
	return mounts.map((m) => m.url.slice(1).split('/')[0]!).filter(Boolean);
}

/** Same-origin href that belongs to a `paths` mount (e.g. `/docs`, `/docs/install`). */
export function isPathMountHref(href: string, mounts: PathMount[]): boolean {
	const raw = href.trim();
	if (!raw.startsWith('/')) return false;
	const path = raw.split(/[?#]/)[0] ?? '';
	return mounts.some((m) => path === m.url || path.startsWith(`${m.url}/`));
}
