/**
 * Local operator tool: find sibling FilePress sites and sync them to this engine.
 *
 *   pnpm sync-siblings              dry-run
 *   pnpm sync-siblings --apply      npm pins (incl. link: → registry) + merge static/_headers
 *   pnpm sync-siblings --ship       apply, then pnpm ship where a ship script exists
 *   pnpm sync-siblings --only aibreze,ollanet
 *
 * Not part of the published package. Does not commit or push.
 */
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultSecurityHeaders, mergeSecurityHeaders } from '../packages/core/src/lib/headers';

const here = fileURLToPath(import.meta.url);
const filepressRoot = resolve(dirname(here), '..');
const workspaceRoot = resolve(filepressRoot, '..');
const win = process.platform === 'win32';

const SKIP_DIR = new Set(['filepress', 'node_modules']);

export type PinKind = 'npm' | 'link' | 'git';

export type SiblingSite = {
	name: string;
	repoRoot: string;
	packageDir: string;
	contentRoot: string;
	pin: string;
	pinKind: PinKind;
	lockfileDir: string | null;
	lockedVersion: string | null;
	headersPath: string | null;
	shipDir: string | null;
};

export type SyncArgs = {
	apply: boolean;
	ship: boolean;
	only: string[];
	help: boolean;
};

type PkgJson = {
	name?: string;
	version?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

export function parseArgs(argv: string[]): SyncArgs {
	const args: SyncArgs = { apply: false, ship: false, only: [], help: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--apply') args.apply = true;
		else if (a === '--ship') {
			args.ship = true;
			args.apply = true;
		} else if (a === '--only') {
			const next = argv[++i];
			if (!next) throw new Error('--only needs a comma-separated folder name list');
			args.only.push(...next.split(',').map((s) => s.trim()).filter(Boolean));
		} else if (a === '--help' || a === '-h') args.help = true;
		else throw new Error(`unknown flag: ${a}`);
	}
	return args;
}

function readJson(path: string): PkgJson | null {
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as PkgJson;
	} catch {
		return null;
	}
}

function pinKind(pin: string): PinKind {
	if (pin.startsWith('link:') || pin.startsWith('workspace:') || pin.startsWith('file:')) return 'link';
	if (/^(github:|git\+|git:)/.test(pin)) return 'git';
	return 'npm';
}

export function npmPinFor(version: string): string {
	return `^${version}`;
}

/** Rewrite a site package.json so getfilepress is a registry pin. */
export function retargetGetfilepressToNpm(
	raw: string,
	nextPin: string
): { text: string; changed: boolean; previous: string | null } {
	const pkg = JSON.parse(raw) as PkgJson & { pnpm?: { onlyBuiltDependencies?: string[] } };
	let previous: string | null = null;
	for (const key of ['dependencies', 'devDependencies'] as const) {
		if (pkg[key]?.getfilepress) {
			previous = pkg[key].getfilepress;
			pkg[key].getfilepress = nextPin;
		}
	}
	if (previous === null) return { text: raw, changed: false, previous: null };

	pkg.pnpm ??= {};
	const built = Array.isArray(pkg.pnpm.onlyBuiltDependencies) ? [...pkg.pnpm.onlyBuiltDependencies] : [];
	if (!built.includes('getfilepress')) built.push('getfilepress');
	pkg.pnpm.onlyBuiltDependencies = built;

	const indent = raw.includes('\t') ? '\t' : 2;
	const text = JSON.stringify(pkg, null, indent) + '\n';
	return { text, changed: text !== raw, previous };
}

function findLockfileDir(start: string, stopAt: string): string | null {
	let dir = start;
	while (true) {
		if (existsSync(join(dir, 'pnpm-lock.yaml'))) return dir;
		if (resolve(dir) === resolve(stopAt)) return null;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function lockedGetfilepressVersion(lockfileDir: string | null): string | null {
	if (!lockfileDir) return null;
	const text = readFileSync(join(lockfileDir, 'pnpm-lock.yaml'), 'utf8');
	const match = text.match(/getfilepress@(\d+\.\d+\.\d+)/);
	return match?.[1] ?? null;
}

function shipDirFor(packageDir: string, repoRoot: string, pkg: PkgJson): string | null {
	if (pkg.scripts?.ship) return packageDir;
	const rootPkg = readJson(join(repoRoot, 'package.json'));
	if (rootPkg?.scripts?.ship) return repoRoot;
	return null;
}

function siteFromPackageJson(packageJsonPath: string, repoRoot: string, name: string): SiblingSite | null {
	const pkg = readJson(packageJsonPath);
	if (!pkg) return null;
	const pin = pkg.dependencies?.getfilepress ?? pkg.devDependencies?.getfilepress;
	if (!pin) return null;
	const packageDir = dirname(packageJsonPath);
	const contentRoot = existsSync(join(packageDir, 'filepress.config.ts'))
		? packageDir
		: existsSync(join(repoRoot, 'filepress.config.ts'))
			? repoRoot
			: null;
	if (!contentRoot) return null;
	const headersCandidate = join(contentRoot, 'static', '_headers');
	const lockfileDir = findLockfileDir(packageDir, repoRoot);
	return {
		name,
		repoRoot,
		packageDir,
		contentRoot,
		pin,
		pinKind: pinKind(pin),
		lockfileDir,
		lockedVersion: lockedGetfilepressVersion(lockfileDir),
		headersPath: existsSync(headersCandidate) ? headersCandidate : null,
		shipDir: shipDirFor(packageDir, repoRoot, pkg)
	};
}

export function discoverSiblingSites(workspace = workspaceRoot): SiblingSite[] {
	const found: SiblingSite[] = [];
	const seen = new Set<string>();
	for (const entry of readdirSync(workspace)) {
		if (SKIP_DIR.has(entry) || entry.startsWith('.') || entry.startsWith('__')) continue;
		const repoRoot = join(workspace, entry);
		try {
			if (!statSync(repoRoot).isDirectory()) continue;
		} catch {
			continue;
		}
		for (const rel of ['package.json', join('site', 'package.json')]) {
			const site = siteFromPackageJson(join(repoRoot, rel), repoRoot, entry);
			if (!site) continue;
			const key = resolve(site.contentRoot);
			if (seen.has(key)) continue;
			seen.add(key);
			found.push(site);
		}
	}
	return found.sort((a, b) => a.name.localeCompare(b.name));
}

function run(cmd: string, args: string[], cwd: string): { ok: boolean; status: number | null } {
	const opts: SpawnSyncOptions = {
		cwd,
		stdio: 'inherit',
		shell: win,
		env: process.env
	};
	const result = spawnSync(cmd, args, opts);
	return { ok: result.status === 0, status: result.status };
}

function engineVersion(): string {
	return readJson(join(filepressRoot, 'package.json'))?.version ?? 'unknown';
}

function headersPlan(site: SiblingSite): { action: 'none' | 'merge' | 'ok'; added: string[] } {
	if (!site.headersPath) return { action: 'none', added: [] };
	const existing = readFileSync(site.headersPath, 'utf8');
	const merged = mergeSecurityHeaders(existing, defaultSecurityHeaders());
	if (!merged.changed) return { action: 'ok', added: [] };
	return { action: 'merge', added: merged.added };
}

function updatePlan(site: SiblingSite, target: string): string {
	const next = npmPinFor(target);
	if (site.pinKind === 'link') {
		return `package.json ${site.pin} → ${next}, then pnpm update getfilepress`;
	}
	if (site.pinKind === 'git') return `skip (git pin ${site.pin} — edit package.json)`;
	if (site.pin === next && site.lockedVersion === target) return `already ${next}`;
	if (site.lockedVersion === target) return `already ${target}`;
	return `pnpm update getfilepress  (${site.lockedVersion ?? site.pin} → ${target})`;
}

function printSite(site: SiblingSite, target: string): void {
	const headers = headersPlan(site);
	const rel = relative(workspaceRoot, site.contentRoot);
	console.log(`\n${site.name}`);
	console.log(`  path     ${rel}`);
	const lock = site.pinKind === 'npm' && site.lockedVersion ? `  locked ${site.lockedVersion}` : '';
	console.log(`  pin      ${site.pin}${lock}`);
	console.log(`  update   ${updatePlan(site, target)}`);
	if (headers.action === 'none') {
		console.log('  headers  none (engine writes build/_headers)');
	} else if (headers.action === 'ok') {
		console.log('  headers  static/_headers already has defaults');
	} else {
		console.log(`  headers  merge static/_headers (+${headers.added.join(', ')})`);
	}
	console.log(`  ship     ${site.shipDir ? `pnpm ship in ${relative(workspaceRoot, site.shipDir)}` : 'none'}`);
}

function applyUpdate(site: SiblingSite, target: string): boolean {
	const plan = updatePlan(site, target);
	if (plan.startsWith('skip') || plan.startsWith('already')) {
		console.log(`  update   ${plan}`);
		return true;
	}
	console.log(`  update   ${plan}`);

	if (site.pinKind === 'link') {
		const pkgPath = join(site.packageDir, 'package.json');
		const rewritten = retargetGetfilepressToNpm(readFileSync(pkgPath, 'utf8'), npmPinFor(target));
		if (rewritten.changed) writeFileSync(pkgPath, rewritten.text);
	}

	const installCmd = site.lockfileDir ? (['update', 'getfilepress'] as const) : (['install'] as const);
	const { ok, status } = run('pnpm', [...installCmd], site.packageDir);
	if (!ok) {
		console.error(`  update   failed (exit ${status})`);
		return false;
	}
	const locked = lockedGetfilepressVersion(findLockfileDir(site.packageDir, site.repoRoot));
	if (locked !== target) {
		console.error(
			`  update   still ${locked ?? 'unresolved'} after pnpm; getfilepress@${target} is not installed.`
		);
		console.error(`  update   publish ${target} to npm, then re-run.`);
		return false;
	}
	return true;
}

function applyHeaders(site: SiblingSite): boolean {
	const plan = headersPlan(site);
	if (plan.action === 'none') {
		console.log('  headers  none (engine writes build/_headers)');
		return true;
	}
	if (plan.action === 'ok') {
		console.log('  headers  static/_headers already has defaults');
		return true;
	}
	if (!site.headersPath) return true;
	const existing = readFileSync(site.headersPath, 'utf8');
	const merged = mergeSecurityHeaders(existing, defaultSecurityHeaders());
	writeFileSync(site.headersPath, merged.text);
	console.log(`  headers  merged (+${merged.added.join(', ')})`);
	return true;
}

function applyShip(site: SiblingSite): boolean {
	if (!site.shipDir) {
		console.log('  ship     none');
		return true;
	}
	console.log(`  ship     pnpm ship in ${relative(workspaceRoot, site.shipDir)}`);
	const { ok, status } = run('pnpm', ['ship'], site.shipDir);
	if (!ok) {
		console.error(`  ship     failed (exit ${status})`);
		return false;
	}
	return true;
}

function usage(): void {
	console.log(`Usage: pnpm sync-siblings [--apply] [--ship] [--only name[,name]]

Discover sibling folders that depend on getfilepress. Dry-run by default.

  --apply   rewrite link: pins to npm, update registry pins, merge static/_headers
  --ship    apply, then run pnpm ship where the site has a ship script
  --only    subset by sibling folder name (repeat or comma-separate)

Does not commit or push. Not published on npm.`);
}

export function main(argv = process.argv.slice(2)): number {
	let args: SyncArgs;
	try {
		args = parseArgs(argv);
	} catch (err) {
		console.error(`sync-siblings: ${err instanceof Error ? err.message : err}`);
		return 1;
	}
	if (args.help) {
		usage();
		return 0;
	}

	const target = engineVersion();
	const only = new Set(args.only.map((n) => n.toLowerCase()));
	let sites = discoverSiblingSites();
	if (only.size) {
		sites = sites.filter((s) => only.has(s.name.toLowerCase()));
		const missing = [...only].filter((n) => !sites.some((s) => s.name.toLowerCase() === n));
		if (missing.length) {
			console.error(`sync-siblings: no FilePress site named ${missing.join(', ')}`);
			return 1;
		}
	}

	const mode = args.ship ? 'ship' : args.apply ? 'apply' : 'dry-run';
	console.log(`Sibling FilePress sites  (${mode}, engine ${target})`);
	console.log(`Workspace ${workspaceRoot}`);

	if (sites.length === 0) {
		console.log('No sibling sites found.');
		return 0;
	}

	if (!args.apply) {
		for (const site of sites) printSite(site, target);
		console.log(
			`\n${sites.length} site(s). Dry-run only. Re-run with --apply or --ship.`
		);
		return 0;
	}

	let failed = 0;
	for (const site of sites) {
		console.log(`\n${site.name}`);
		if (!applyUpdate(site, target)) failed++;
		else if (!applyHeaders(site)) failed++;
		else if (args.ship && !applyShip(site)) failed++;
		else if (!args.ship) {
			console.log(`  ship     skipped (pass --ship)`);
		}
	}

	console.log(
		failed
			? `\n${sites.length - failed}/${sites.length} ok, ${failed} failed.`
			: `\n${sites.length} site(s) ${mode} ok.`
	);
	return failed ? 1 : 0;
}

const entry = process.argv[1];
if (entry && resolve(entry) === resolve(here)) {
	process.exitCode = main();
}
