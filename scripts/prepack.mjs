#!/usr/bin/env node
// Temporarily move pack-unwanted dirs aside so `npm pack` / `npm publish` stay clean.
// Restored by scripts/postpack.mjs.
import { existsSync, mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bakRoot = join(root, '.npm-pack-bak');
const manifestPath = join(root, '.npm-pack-bak.json');

if (existsSync(bakRoot)) rmSync(bakRoot, { recursive: true, force: true });
mkdirSync(bakRoot, { recursive: true });

const moved = [];
// Only stash dirs that npm would otherwise pack. Skip `.svelte-kit` — it is often
// locked on Windows after a local build; `.npmignore` excludes it instead.
const junkNames = ['node_modules', '.vite'];

for (const pkg of ['core', 'app', 'import']) {
	for (const junk of junkNames) {
		const from = join(root, 'packages', pkg, junk);
		if (!existsSync(from)) continue;
		const to = join(bakRoot, pkg, junk);
		mkdirSync(dirname(to), { recursive: true });
		try {
			renameSync(from, to);
			moved.push({ from, to });
		} catch (err) {
			console.warn(`prepack: could not stash ${from}: ${err.message}`);
		}
	}
}

writeFileSync(manifestPath, JSON.stringify({ moved }, null, 2));
console.log(`prepack: stashed ${moved.length} path(s) under .npm-pack-bak/`);
