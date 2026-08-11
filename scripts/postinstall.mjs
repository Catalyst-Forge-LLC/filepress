#!/usr/bin/env node
// When getfilepress is installed as a dependency (npm/pnpm), link the embedded
// workspace packages into node_modules/@filepress/* so `@filepress/core` etc.
// resolve. Skipped in the monorepo itself (pnpm workspace already links them).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { linkEmbeddedPackages } from './link-embedded-packages.mjs';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const isDependencyInstall = packageRoot.split(/[/\\]/).includes('node_modules');

if (!isDependencyInstall) {
	process.exit(0);
}

linkEmbeddedPackages(packageRoot);

const appDir = join(packageRoot, 'packages', 'app');
const svelteKitJs = findPackageBin('@sveltejs/kit', 'svelte-kit', [appDir, packageRoot]);
if (svelteKitJs) {
	spawnSync(process.execPath, [svelteKitJs, 'sync'], {
		cwd: appDir,
		stdio: 'ignore',
		env: process.env
	});
}

function findPackageBin(pkgName, binName, starts) {
	for (const start of starts) {
		let dir = start;
		for (;;) {
			const pkgJsonPath = join(dir, 'node_modules', ...pkgName.split('/'), 'package.json');
			if (existsSync(pkgJsonPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
					const binField = pkg.bin;
					const binRel =
						typeof binField === 'string' ? binField : binField?.[binName];
					if (binRel) {
						const abs = join(dirname(pkgJsonPath), binRel);
						if (existsSync(abs)) return abs;
					}
				} catch {
					/* continue */
				}
			}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	return null;
}
