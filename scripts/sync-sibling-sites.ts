/**
 * Local operator tool: find sibling FilePress sites and sync them to this engine.
 *
 *   pnpm sync-siblings              dry-run
 *   pnpm sync-siblings --apply      npm pins, merge headers, commit in each repo (no push)
 *   pnpm sync-siblings --ship       apply, then pnpm ship where a ship script exists
 *   pnpm sync-siblings --only aibreze,ollanet
 *   pnpm sync-siblings --apply --no-commit
 *
 * Not part of the published package. Does not push.
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
	commit: boolean;
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
	const args: SyncArgs = { apply: false, ship: false, commit: true, only: [], help: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--apply') args.apply = true;
		else if (a === '--ship') {
			args.ship = true;
			args.apply = true;
		} else if (a === '--no-commit') args.commit = false;
		else if (a === '--only') {
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

/** Workspace root lockfile wins over a leftover lockfile in site/. */
export function resolveLockfileDir(
	start: string,
	stopAt: string,
	exists: (path: string) => boolean = existsSync
): string | null {
	let dir = start;
	let nearestLock: string | null = null;
	let workspaceLock: string | null = null;
	while (true) {
		const lock = join(dir, 'pnpm-lock.yaml');
		const workspace = join(dir, 'pnpm-workspace.yaml');
		if (exists(lock) && !nearestLock) nearestLock = dir;
		if (exists(workspace) && exists(lock)) workspaceLock = dir;
		if (resolve(dir) === resolve(stopAt)) break;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return workspaceLock ?? nearestLock;
}

/** Resolved getfilepress version for one lockfile importer (`.` or `site`). */
export function parseLockedGetfilepress(lockText: string, importer = '.'): string | null {
	const lines = lockText.split(/\r?\n/);
	let inImporters = false;
	let inThis = false;
	let inGetfilepress = false;
	for (const line of lines) {
		if (line.startsWith('importers:')) {
			inImporters = true;
			continue;
		}
		if (inImporters && /^[A-Za-z]/.test(line)) break;
		if (!inImporters) continue;
		const head = /^  (\S+):$/.exec(line);
		if (head) {
			inThis = head[1] === importer;
			inGetfilepress = false;
			continue;
		}
		if (inThis && /^\s+getfilepress:\s*$/.test(line)) {
			inGetfilepress = true;
			continue;
		}
		if (!inGetfilepress) continue;
		const ver = /^\s+version:\s+(\d+\.\d+\.\d+)/.exec(line);
		if (ver) return ver[1];
		if (/^\s+\S+:/.test(line) && !/^\s+(specifier|version):/.test(line)) {
			inGetfilepress = false;
		}
	}
	return null;
}

function lockfileImporter(packageDir: string, lockfileDir: string): string {
	const rel = relative(lockfileDir, packageDir).replace(/\\/g, '/');
	return rel === '' ? '.' : rel;
}

function lockedGetfilepressVersion(lockfileDir: string | null, packageDir?: string): string | null {
	if (!lockfileDir) return null;
	const text = readFileSync(join(lockfileDir, 'pnpm-lock.yaml'), 'utf8');
	const importer = packageDir ? lockfileImporter(packageDir, lockfileDir) : '.';
	return (
		parseLockedGetfilepress(text, importer) ??
		parseLockedGetfilepress(text, '.') ??
		null
	);
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
	const lockfileDir = resolveLockfileDir(packageDir, repoRoot);
	return {
		name,
		repoRoot,
		packageDir,
		contentRoot,
		pin,
		pinKind: pinKind(pin),
		lockfileDir,
		lockedVersion: lockedGetfilepressVersion(lockfileDir, packageDir),
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

export function compareSemver(a: string, b: string): number {
	const pa = a.split('.').map((n) => Number(n));
	const pb = b.split('.').map((n) => Number(n));
	for (let i = 0; i < 3; i++) {
		const da = pa[i] ?? 0;
		const db = pb[i] ?? 0;
		if (da !== db) return da < db ? -1 : 1;
	}
	return 0;
}

/** When local is ahead of npm, sync siblings to the published version. */
export function resolveSyncTarget(
	local: string,
	published: string | null
): { target: string; note: string | null } {
	if (published && compareSemver(local, published) > 0) {
		return {
			target: published,
			note: `local ${local} is not on npm yet; syncing to ${published}`
		};
	}
	return { target: local, note: null };
}

async function publishedGetfilepressVersion(): Promise<string | null> {
	try {
		const res = await fetch('https://registry.npmjs.org/getfilepress/latest');
		if (!res.ok) return null;
		const body = (await res.json()) as { version?: string };
		return typeof body.version === 'string' ? body.version : null;
	} catch {
		return null;
	}
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
	console.log('  commit   git commit in repo (no push)');
}

export function syncCommitPaths(site: SiblingSite): string[] {
	const abs = [
		join(site.packageDir, 'package.json'),
		site.lockfileDir ? join(site.lockfileDir, 'pnpm-lock.yaml') : null,
		site.headersPath
	].filter((p): p is string => Boolean(p) && existsSync(p));
	return abs
		.map((p) => relative(site.repoRoot, p))
		.filter((rel) => rel && !rel.startsWith('..'));
}

function git(
	repo: string,
	args: string[],
	inherit = false
): { status: number | null; stdout: string; stderr: string } {
	const result = spawnSync('git', args, {
		cwd: repo,
		encoding: 'utf8',
		shell: false,
		stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
		env: process.env
	});
	return {
		status: result.status,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? ''
	};
}

function applyCommit(site: SiblingSite, target: string): boolean {
	const probe = git(site.repoRoot, ['rev-parse', '--is-inside-work-tree']);
	if (probe.status !== 0 || probe.stdout.trim() !== 'true') {
		console.log('  commit   skip (not a git repo)');
		return true;
	}
	const rels = syncCommitPaths(site);
	if (rels.length === 0) {
		console.log('  commit   none');
		return true;
	}
	const added = git(site.repoRoot, ['add', '--', ...rels]);
	if (added.status !== 0) {
		console.error(`  commit   git add failed\n${added.stderr}`);
		return false;
	}
	const staged = git(site.repoRoot, ['diff', '--cached', '--quiet']);
	if (staged.status === 0) {
		console.log('  commit   nothing to commit');
		return true;
	}
	console.log(`  commit   ${rels.join(', ')}`);
	const committed = git(
		site.repoRoot,
		[
			'commit',
			'-m',
			`Sync getfilepress to ${target}.`,
			'-m',
			'Update the engine pin and FilePress security headers.'
		],
		true
	);
	if (committed.status !== 0) {
		console.error(`  commit   git commit failed (exit ${committed.status})`);
		return false;
	}
	return true;
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
	const locked = lockedGetfilepressVersion(
		resolveLockfileDir(site.packageDir, site.repoRoot),
		site.packageDir
	);
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

  --apply      rewrite link: pins to npm, update registry pins, merge static/_headers,
               then commit those files in each sibling repo (no push)
  --ship       apply, then run pnpm ship where the site has a ship script
  --no-commit  apply or ship without creating a git commit
  --only       subset by sibling folder name (repeat or comma-separate)

Does not push. Not published on npm.`);
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
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

	const local = engineVersion();
	const published = await publishedGetfilepressVersion();
	const { target, note } = resolveSyncTarget(local, published);
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
	console.log(`Sibling FilePress sites  (${mode}, engine ${local}, npm ${published ?? 'unknown'})`);
	if (note) console.log(`  ${note}`);
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
		if (!applyUpdate(site, target) || !applyHeaders(site)) {
			failed++;
			continue;
		}
		if (args.commit) {
			if (!applyCommit(site, target)) {
				failed++;
				continue;
			}
		} else {
			console.log('  commit   skipped (--no-commit)');
		}
		if (args.ship) {
			if (!applyShip(site)) failed++;
		} else {
			console.log('  ship     skipped (pass --ship)');
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
	main().then((code) => {
		process.exitCode = code;
	});
}
