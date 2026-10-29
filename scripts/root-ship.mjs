// Root `pnpm ship` for a site nested inside an app repository.
// The site package owns the build/upload command. The ancestor package.json
// must delegate to it so `pnpm ship` from the app repository runs that command.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

export function rootShipCommand(siteRel) {
	const posix = normalizeRel(siteRel);
	return `pnpm --dir "${posix}" run ship`;
}

export function normalizeRel(siteRel) {
	return String(siteRel).replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
}

export function isShellSafeSiteRel(siteRel) {
	const posix = normalizeRel(siteRel);
	return Boolean(posix) && !posix.startsWith('../') && !posix.startsWith('/') && /^[a-zA-Z0-9_./ -]+$/.test(posix);
}

/** True when an ancestor ship script invokes this site directory. */
export function delegatesToSite(shipScript, siteRel) {
	if (typeof shipScript !== 'string') return false;
	const posix = normalizeRel(siteRel);
	if (!isShellSafeSiteRel(posix)) return false;
	const escaped = posix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(
		`(?:^|[\\s;&|])--dir(?:=|\\s+)"${escaped}"(?![\\w./-])|(?:^|[\\s;&|])--dir(?:=|\\s+)${escaped}(?![\\w./-])`
	);
	return pattern.test(shipScript);
}

function existingDir(start) {
	let dir = resolve(start);
	while (!existsSync(dir)) {
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return dir;
}

function inside(root, dir) {
	const rel = relative(resolve(root), resolve(dir));
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function gitTop(dir) {
	const cwd = existingDir(dir);
	if (!cwd) return null;
	try {
		const out = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
			windowsHide: true
		}).trim();
		return out ? resolve(out) : null;
	} catch {
		return null;
	}
}

/**
 * Nearest ancestor package.json above the site, inside the same git repository.
 * The site's own package does not count. Outside a git repository there is no
 * safe ancestor to edit, so this returns null.
 */
export function ancestorPackagePath(siteDir) {
	const site = resolve(siteDir);
	const top = gitTop(existsSync(site) ? site : dirname(site));
	if (!top) return null;
	let dir = dirname(site);
	for (let hop = 0; hop < 32; hop++) {
		if (!inside(top, dir)) break;
		const pkg = join(dir, 'package.json');
		if (existsSync(pkg)) return resolve(pkg);
		if (resolve(dir) === top) break;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

function readPkg(path) {
	try {
		const value = JSON.parse(readFileSync(path, 'utf8'));
		if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'not an object' };
		return { value };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) };
	}
}

/**
 * When the site package has scripts.ship and a different ancestor package does
 * not delegate to the site, return the gap. Otherwise return null.
 */
export function rootShipGap(siteDir) {
	const site = resolve(siteDir);
	const sitePkgPath = join(site, 'package.json');
	if (!existsSync(sitePkgPath)) return null;
	const siteRead = readPkg(sitePkgPath);
	if (siteRead.error) return null;
	const siteShip = siteRead.value.scripts?.ship;
	if (typeof siteShip !== 'string' || !siteShip.trim()) return null;

	const ancestor = ancestorPackagePath(site);
	if (!ancestor || resolve(ancestor) === resolve(sitePkgPath)) return null;
	const rootRead = readPkg(ancestor);
	const rel = relative(dirname(ancestor), site);
	const expected = isShellSafeSiteRel(rel) ? rootShipCommand(rel) : null;
	if (rootRead.error) {
		return { ancestor, expected, current: null, rel: normalizeRel(rel), error: rootRead.error };
	}
	const current = rootRead.value.scripts?.ship;
	if (typeof current === 'string' && expected && (current === expected || delegatesToSite(current, rel))) return null;
	return {
		ancestor,
		expected,
		current: typeof current === 'string' ? current : null,
		rel: normalizeRel(rel),
		error: null
	};
}

export function rootShipGapMessage(gap) {
	if (gap.error) {
		return `cannot read the app package.json at ${gap.ancestor} (${gap.error}). Nested site ship needs a root delegation there.`;
	}
	const add = gap.expected
		? `"ship": "${gap.expected}"`
		: 'a root "ship" script that runs this site with pnpm --dir "<site-path>" run ship';
	if (gap.current) {
		return (
			`nested site ship is missing its root delegation.\n` +
			`  App package: ${gap.ancestor}\n` +
			`  The current root ship command does not run this site. Preserve it and compose:\n` +
			`  ${add}`
		);
	}
	return (
		`nested site ship is missing its root delegation.\n` +
		`  App package: ${gap.ancestor}\n` +
		`  Add this so pnpm ship from the app repository runs the site:\n` +
		`  ${add}`
	);
}
