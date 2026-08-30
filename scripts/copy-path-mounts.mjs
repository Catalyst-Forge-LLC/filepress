/**
 * Post-`vite build` steps for a FilePress site:
 *   1. Write default `build/_headers` unless the site already provided one
 *   2. Merge engine `_redirects` (from `.filepress/redirects.txt`) into `build/_redirects`
 *   3. Copy `paths` mounts (from `.filepress/path-mounts.json`)
 *
 * Usage: node scripts/copy-path-mounts.mjs <siteRoot>
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoGenieInBuild } from './assert-no-genie.mjs';

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

try {
	assertNoGenieInBuild(buildDir);
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}

const headersDest = join(buildDir, '_headers');
if (existsSync(headersDest)) {
	console.log('filepress: kept site _headers');
} else if (existsSync(headersTemplate)) {
	writeFileSync(headersDest, readFileSync(headersTemplate, 'utf8'));
	console.log('filepress: wrote default _headers');
}

const redirectsPlan = join(siteRoot, '.filepress', 'redirects.txt');
const redirectsDest = join(buildDir, '_redirects');
if (existsSync(redirectsPlan)) {
	const planned = readFileSync(redirectsPlan, 'utf8').trim();
	if (planned) {
		const existing = existsSync(redirectsDest) ? readFileSync(redirectsDest, 'utf8') : '';
		const have = new Set(
			existing
				.split(/\r?\n/)
				.map((line) => line.replace(/#.*$/, '').trim())
				.filter(Boolean)
				.map((line) => line.split(/\s+/).slice(0, 2).join('\0'))
		);
		const add = planned
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.filter((line) => !have.has(line.split(/\s+/).slice(0, 2).join('\0')));
		if (add.length) {
			const prefix = existing.trimEnd();
			writeFileSync(redirectsDest, prefix ? `${prefix}\n${add.join('\n')}\n` : `${add.join('\n')}\n`);
			console.log(`filepress: wrote ${add.length} _redirects rule(s)`);
		} else {
			console.log('filepress: kept site _redirects');
		}
	}
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
