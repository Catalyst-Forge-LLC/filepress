import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(new URL('../..', import.meta.url)));
const defaultSiteRoot = resolve(appRoot, '../../sites/demo');

/**
 * Resolve the active site root from FILEPRESS_SITE_ROOT (set by scripts/filepress.mjs).
 * Falls back to sites/demo so `svelte-kit sync` / prepare can run without a site flag.
 */
export function getSiteRoot(): string {
	const raw = process.env.FILEPRESS_SITE_ROOT?.trim();
	const root = raw
		? isAbsolute(raw)
			? raw
			: resolve(process.cwd(), raw)
		: defaultSiteRoot;
	if (!existsSync(root)) {
		throw new Error(`Site root does not exist: ${root}`);
	}
	return root;
}

/** Absolute path to the site's posts/ directory (or FILEPRESS_CONTENT_DIR override). */
export function getContentDir(): string {
	const override = process.env.FILEPRESS_CONTENT_DIR?.trim();
	if (override) {
		return isAbsolute(override) ? override : resolve(getSiteRoot(), override);
	}
	return join(getSiteRoot(), 'posts');
}

/** Absolute path to the site's pages/ directory (static Markdown pages). */
export function getPagesDir(): string {
	return join(getSiteRoot(), 'pages');
}

/** Absolute path to filepress.config.ts at the site root. */
export function getSiteConfigPath(): string {
	return join(getSiteRoot(), 'filepress.config.ts');
}

/** Absolute path to the site's static/ assets (may not exist yet). */
export function getSiteStaticDir(): string {
	return join(getSiteRoot(), 'static');
}

/** Absolute path where adapter-static writes this site's build. */
export function getSiteBuildDir(): string {
	return join(getSiteRoot(), 'build');
}
