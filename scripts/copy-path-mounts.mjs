/**
 * Post-`vite build` steps for a FilePress site:
 *   1. Write default `build/_headers` unless the site already provided one
 *   2. Copy `paths` mounts (from `.filepress/path-mounts.json`)
 *
 * Usage: node scripts/copy-path-mounts.mjs <siteRoot>
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(process.argv[2] ?? '');
const buildDir = join(siteRoot, 'build');
const cachePath = join(siteRoot, '.filepress', 'path-mounts.json');
const headersTemplate = join(
	dirname(fileURLToPath(import.meta.url)),
	'../packages/core/src/lib/default-headers.txt'
);

if (!existsSync(buildDir)) {
	console.warn(`filepress: post-build skipped — build dir missing (${buildDir})`);
	process.exit(0);
}

const headersDest = join(buildDir, '_headers');
if (existsSync(headersDest)) {
	console.log('filepress: kept site _headers');
} else if (existsSync(headersTemplate)) {
	writeFileSync(headersDest, readFileSync(headersTemplate, 'utf8'));
	console.log('filepress: wrote default _headers');
}

if (!existsSync(cachePath)) {
	process.exit(0);
}

/** @type {{ url: string; dir: string }[]} */
const mounts = JSON.parse(readFileSync(cachePath, 'utf8'));
if (!Array.isArray(mounts) || mounts.length === 0) process.exit(0);

for (const mount of mounts) {
	const src = resolve(siteRoot, mount.dir);
	const dest = join(buildDir, ...mount.url.replace(/^\//, '').split('/'));
	if (!existsSync(src)) {
		console.warn(`filepress: path mount ${mount.url} ← ${mount.dir} (missing; skipped)`);
		continue;
	}
	if (!statSync(src).isDirectory()) {
		console.error(`filepress: path mount dir "${mount.dir}" is not a directory`);
		process.exit(1);
	}
	mkdirSync(dest, { recursive: true });
	cpSync(src, dest, { recursive: true });
	console.log(`filepress: mounted ${mount.url} ← ${mount.dir}`);
}
