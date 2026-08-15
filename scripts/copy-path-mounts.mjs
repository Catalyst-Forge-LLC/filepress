/**
 * Copy FilePress `paths` mounts into <site>/build after `vite build`.
 * Reads `.filepress/path-mounts.json` written when vite.config loads the site config.
 *
 * Usage: node scripts/copy-path-mounts.mjs <siteRoot>
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const siteRoot = resolve(process.argv[2] ?? '');
const buildDir = join(siteRoot, 'build');
const cachePath = join(siteRoot, '.filepress', 'path-mounts.json');

if (!existsSync(cachePath)) {
	process.exit(0);
}
if (!existsSync(buildDir)) {
	console.warn(`filepress: path mounts skipped — build dir missing (${buildDir})`);
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
