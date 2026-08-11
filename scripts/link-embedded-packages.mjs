#!/usr/bin/env node
// Link packages/{core,app,import} → node_modules/@filepress/* under packageRoot.
// Used by postinstall and by the CLI when install scripts were skipped.
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * @param {string} packageRoot
 * @returns {number} number of links created/updated
 */
export function linkEmbeddedPackages(packageRoot) {
	const packages = [
		['core', '@filepress/core'],
		['app', '@filepress/app'],
		['import', '@filepress/import']
	];

	const scopeDir = join(packageRoot, 'node_modules', '@filepress');
	mkdirSync(scopeDir, { recursive: true });

	let n = 0;
	for (const [folder, name] of packages) {
		const target = join(packageRoot, 'packages', folder);
		const linkPath = join(packageRoot, 'node_modules', ...name.split('/'));
		if (!existsSync(target)) continue;
		try {
			rmSync(linkPath, { recursive: true, force: true });
		} catch {
			/* ignore */
		}
		const rel = relative(dirname(linkPath), target);
		try {
			symlinkSync(rel, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
			n++;
		} catch (err) {
			console.warn(`getfilepress: could not link ${name}: ${err.message}`);
		}
	}
	return n;
}
