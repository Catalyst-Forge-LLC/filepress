/**
 * Server-only path-mount filesystem helpers.
 */
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	statSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { PathMount } from './paths-shared';

export type { PathMount } from './paths-shared';
export { normalizePathMounts, pathMountReservedSlugs, isPathMountHref } from './paths-shared';

/** Absolute filesystem path for a mount's source directory. */
export function resolvePathMountDir(siteRoot: string, mount: PathMount): string {
	return resolve(siteRoot, mount.dir);
}

/**
 * Copy each mount's directory into `buildDir<url>/`.
 * Missing source dirs are skipped with a warning to stderr (site may build docs first).
 */
export function copyPathMounts(
	siteRoot: string,
	buildDir: string,
	mounts: PathMount[],
): void {
	for (const mount of mounts) {
		const src = resolvePathMountDir(siteRoot, mount);
		const dest = join(buildDir, ...mount.url.slice(1).split('/'));
		if (!existsSync(src)) {
			console.warn(
				`filepress: path mount ${mount.url} ← ${mount.dir} (missing; skipped)`,
			);
			continue;
		}
		if (!statSync(src).isDirectory()) {
			throw new Error(
				`filepress: path mount dir "${mount.dir}" is not a directory (${src}).`,
			);
		}
		mkdirSync(dest, { recursive: true });
		cpSync(src, dest, { recursive: true });
		console.log(`filepress: mounted ${mount.url} ← ${mount.dir}`);
	}
}

/**
 * List site-relative URL paths for HTML files under each mount (for the sitemap).
 * Includes `index.html` as the directory URL (e.g. `/docs` not `/docs/index.html`).
 */
export function listPathMountHtmlUrls(siteRoot: string, mounts: PathMount[]): string[] {
	const urls: string[] = [];
	for (const mount of mounts) {
		const src = resolvePathMountDir(siteRoot, mount);
		if (!existsSync(src) || !statSync(src).isDirectory()) continue;
		walkHtml(src, src, mount.url, urls);
	}
	return [...new Set(urls)].sort();
}

function walkHtml(root: string, dir: string, urlBase: string, out: string[]): void {
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name);
		const st = statSync(abs);
		if (st.isDirectory()) {
			walkHtml(root, abs, urlBase, out);
			continue;
		}
		if (!name.toLowerCase().endsWith('.html')) continue;
		const rel = relative(root, abs).split(sep).join('/');
		if (rel.toLowerCase() === 'index.html') {
			out.push(urlBase);
		} else if (name.toLowerCase() === 'index.html') {
			const parent = rel.slice(0, -'/index.html'.length);
			out.push(`${urlBase}/${parent}`);
		} else {
			out.push(`${urlBase}/${rel.replace(/\.html$/i, '')}`);
		}
	}
}
