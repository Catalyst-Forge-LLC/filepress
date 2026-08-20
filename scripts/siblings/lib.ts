/**
 * Shared sibling-site library (CLI + local dashboard).
 * Not part of the published getfilepress package.
 */
import { spawn, spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultSecurityHeaders, mergeSecurityHeaders } from '../../packages/core/src/lib/headers';

const here = dirname(fileURLToPath(import.meta.url));
export const filepressRoot = resolve(here, '../..');
export const workspaceRoot = resolve(filepressRoot, '..');
const win = process.platform === 'win32';

const SKIP_DIR = new Set(['filepress', 'node_modules']);
const STATE_DIR = join(filepressRoot, '.filepress-siblings');

export type PinKind = 'npm' | 'link' | 'git';
export type LogFn = (line: string) => void;

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

export type HeadersPlan = { action: 'none' | 'merge' | 'ok'; added: string[] };

/** Batched lookups shared by every row of one inventory pass. */
export type PlanContext = {
	leases: Map<string, number>;
	dirty: Map<string, boolean | null>;
};

export type SitePlan = {
	name: string;
	path: string;
	pin: string;
	pinKind: PinKind;
	lockedVersion: string | null;
	update: string;
	headers: HeadersPlan;
	ship: string | null;
	url: string | null;
	gitDirty: boolean | null;
	leasePort: number | null;
};

export type EngineStrip = {
	local: string;
	published: string | null;
	target: string;
	note: string | null;
};

export type Inventory = {
	engine: EngineStrip;
	workspace: string;
	sites: SitePlan[];
	builtAt: string;
	buildMs: number;
};

type PkgJson = {
	name?: string;
	version?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

export function readJson(path: string): PkgJson | null {
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

export function lockedGetfilepressVersion(lockfileDir: string | null, packageDir?: string): string | null {
	if (!lockfileDir) return null;
	const text = readFileSync(join(lockfileDir, 'pnpm-lock.yaml'), 'utf8');
	const importer = packageDir ? lockfileImporter(packageDir, lockfileDir) : '.';
	return parseLockedGetfilepress(text, importer) ?? parseLockedGetfilepress(text, '.') ?? null;
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

export function ignoredFolderNames(): Set<string> {
	const path = join(STATE_DIR, 'ignore.json');
	if (!existsSync(path)) return new Set();
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as { names?: unknown };
		const names = Array.isArray(raw.names) ? raw.names : [];
		return new Set(names.filter((n): n is string => typeof n === 'string').map((n) => n.toLowerCase()));
	} catch {
		return new Set();
	}
}

export function discoverSiblingSites(workspace = workspaceRoot): SiblingSite[] {
	const ignore = ignoredFolderNames();
	const found: SiblingSite[] = [];
	const seen = new Set<string>();
	for (const entry of readdirSync(workspace)) {
		if (SKIP_DIR.has(entry) || ignore.has(entry.toLowerCase())) continue;
		if (entry.startsWith('.') || entry.startsWith('__')) continue;
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

export function engineVersion(): string {
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

export async function publishedGetfilepressVersion(): Promise<string | null> {
	try {
		const res = await fetch('https://registry.npmjs.org/getfilepress/latest');
		if (!res.ok) return null;
		const body = (await res.json()) as { version?: string };
		return typeof body.version === 'string' ? body.version : null;
	} catch {
		return null;
	}
}

export async function loadEngineStrip(): Promise<EngineStrip> {
	const local = engineVersion();
	const published = await publishedGetfilepressVersion();
	const { target, note } = resolveSyncTarget(local, published);
	return { local, published, target, note };
}

export function headersPlan(site: SiblingSite): HeadersPlan {
	if (!site.headersPath) return { action: 'none', added: [] };
	const existing = readFileSync(site.headersPath, 'utf8');
	const merged = mergeSecurityHeaders(existing, defaultSecurityHeaders());
	if (!merged.changed) return { action: 'ok', added: [] };
	return { action: 'merge', added: merged.added };
}

export function updatePlan(site: SiblingSite, target: string): string {
	const next = npmPinFor(target);
	if (site.pinKind === 'link') {
		return `package.json ${site.pin} → ${next}, then pnpm update getfilepress`;
	}
	if (site.pinKind === 'git') return `skip (git pin ${site.pin} — edit package.json)`;
	if (site.pin === next && site.lockedVersion === target) return `already ${next}`;
	if (site.lockedVersion === target) return `already ${target}`;
	return `pnpm update getfilepress  (${site.lockedVersion ?? site.pin} → ${target})`;
}

export function readConfigUrl(contentRoot: string): string | null {
	const path = join(contentRoot, 'filepress.config.ts');
	if (!existsSync(path)) return null;
	const text = readFileSync(path, 'utf8');
	const match = text.match(/\burl:\s*['"](https?:\/\/[^'"]+)['"]/);
	return match?.[1] ?? null;
}

type ExecResult = { status: number | null; stdout: string; stderr: string; spawnFailed: boolean };

function exec(
	cmd: string,
	args: string[],
	opts: { cwd?: string; timeout?: number } = {}
): Promise<ExecResult> {
	return new Promise((done) => {
		const child = spawn(cmd, args, {
			cwd: opts.cwd,
			shell: win,
			windowsHide: true,
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let stdout = '';
		let stderr = '';
		let settled = false;
		const finish = (r: ExecResult) => {
			if (settled) return;
			settled = true;
			done(r);
		};
		const timer = setTimeout(() => {
			child.kill();
			finish({ status: null, stdout, stderr: 'timed out', spawnFailed: false });
		}, opts.timeout ?? 8000);
		child.stdout?.setEncoding('utf8');
		child.stdout?.on('data', (chunk: string) => {
			stdout += chunk;
		});
		child.stderr?.setEncoding('utf8');
		child.stderr?.on('data', (chunk: string) => {
			stderr += chunk;
		});
		child.on('error', (err) => {
			clearTimeout(timer);
			finish({ status: null, stdout: '', stderr: String(err), spawnFailed: true });
		});
		child.on('close', (status) => {
			clearTimeout(timer);
			finish({ status, stdout, stderr, spawnFailed: false });
		});
	});
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]);
		}
	});
	await Promise.all(workers);
	return out;
}

export async function gitDirtyMap(repoRoots: string[]): Promise<Map<string, boolean | null>> {
	const repos = [...new Set(repoRoots)];
	const states = await mapLimit(repos, 8, async (repo) => {
		const r = await exec('git', ['status', '--porcelain'], { cwd: repo, timeout: 8000 });
		return r.status === 0 ? Boolean(r.stdout.trim()) : null;
	});
	return new Map(repos.map((repo, i) => [repo, states[i]]));
}

/** `localberth ls` prints `name\tport\tbind\tkind\tfirewall` per lease. */
export function parseLeaseTable(tsv: string): Map<string, number> {
	const leases = new Map<string, number>();
	for (const line of tsv.split(/\r?\n/)) {
		const [name, port] = line.split('\t');
		if (!name || !port) continue;
		const n = Number(port.trim());
		if (Number.isInteger(n) && n > 0 && n <= 65535) leases.set(name.trim().toLowerCase(), n);
	}
	return leases;
}

const LEASE_TTL_MS = 30_000;
let localberthMissing = false;
let leaseCache: { at: number; table: Map<string, number> } | null = null;

/**
 * One `localberth ls` per pass beats one `localberth get` per site by ~8s on Windows.
 * Only a spawn failure (no localberth on PATH) disables the lookup; a slow or failed
 * run keeps the last good table so ports do not blink out of the board.
 */
export async function leaseTable(): Promise<Map<string, number>> {
	if (localberthMissing) return new Map();
	if (leaseCache && Date.now() - leaseCache.at < LEASE_TTL_MS) return leaseCache.table;
	const r = await exec('localberth', ['ls'], { timeout: 6000 });
	if (r.spawnFailed) {
		localberthMissing = true;
		return new Map();
	}
	if (r.status !== 0) {
		console.warn(`siblings: localberth ls failed (${r.status}) ${r.stderr.trim()}`);
		return leaseCache?.table ?? new Map();
	}
	const table = parseLeaseTable(r.stdout);
	leaseCache = { at: Date.now(), table };
	return table;
}

export function leaseNames(site: SiblingSite): string[] {
	const pkg = readJson(join(site.contentRoot, 'package.json'));
	const folder = site.contentRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop();
	return [pkg?.name, folder, site.name]
		.filter((n): n is string => Boolean(n))
		.map((n) => n.toLowerCase());
}

export function leasePortFor(site: SiblingSite, leases: Map<string, number>): number | null {
	for (const name of leaseNames(site)) {
		const port = leases.get(name);
		if (port) return port;
	}
	return null;
}

export async function planContext(sites: SiblingSite[]): Promise<PlanContext> {
	const [leases, dirty] = await Promise.all([
		leaseTable(),
		gitDirtyMap(sites.map((s) => s.repoRoot))
	]);
	return { leases, dirty };
}

export function planSite(site: SiblingSite, target: string, ctx?: PlanContext): SitePlan {
	return {
		name: site.name,
		path: relative(workspaceRoot, site.contentRoot),
		pin: site.pin,
		pinKind: site.pinKind,
		lockedVersion: site.lockedVersion,
		update: updatePlan(site, target),
		headers: headersPlan(site),
		ship: site.shipDir ? `pnpm ship in ${relative(workspaceRoot, site.shipDir)}` : null,
		url: readConfigUrl(site.contentRoot),
		gitDirty: ctx ? (ctx.dirty.get(site.repoRoot) ?? null) : null,
		leasePort: ctx ? leasePortFor(site, ctx.leases) : null
	};
}

export async function buildInventory(): Promise<Inventory> {
	const started = Date.now();
	const sites = discoverSiblingSites();
	const [engine, ctx] = await Promise.all([loadEngineStrip(), planContext(sites)]);
	return {
		engine,
		workspace: workspaceRoot,
		sites: sites.map((site) => planSite(site, engine.target, ctx)),
		builtAt: new Date().toISOString(),
		buildMs: Date.now() - started
	};
}

export function syncCommitPaths(site: SiblingSite): string[] {
	const abs = [
		join(site.packageDir, 'package.json'),
		site.lockfileDir ? join(site.lockfileDir, 'pnpm-lock.yaml') : null,
		site.headersPath
	].filter((p): p is string => Boolean(p) && existsSync(p));
	return abs.map((p) => relative(site.repoRoot, p)).filter((rel) => rel && !rel.startsWith('..'));
}

function say(log: LogFn | null, line: string): void {
	if (log) log(line);
	else console.log(line);
}

function git(
	repo: string,
	args: string[],
	log: LogFn | null
): { status: number | null; stdout: string; stderr: string } {
	const result = spawnSync('git', args, {
		cwd: repo,
		encoding: 'utf8',
		shell: false,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: process.env
	});
	const stdout = result.stdout ?? '';
	const stderr = result.stderr ?? '';
	if (log) {
		if (stdout.trim()) log(stdout.trimEnd());
		if (stderr.trim()) log(stderr.trimEnd());
	}
	return { status: result.status, stdout, stderr };
}

function run(
	cmd: string,
	args: string[],
	cwd: string,
	log: LogFn | null
): { ok: boolean; status: number | null } {
	const inherit = log === null;
	const opts: SpawnSyncOptions = {
		cwd,
		encoding: 'utf8',
		shell: win,
		stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
		env: process.env
	};
	const result = spawnSync(cmd, args, opts);
	if (log) {
		const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trimEnd();
		if (out) log(out);
	}
	return { ok: result.status === 0, status: result.status };
}

export function applyUpdate(site: SiblingSite, target: string, log: LogFn | null = null): boolean {
	const plan = updatePlan(site, target);
	if (plan.startsWith('skip') || plan.startsWith('already')) {
		say(log, `  update   ${plan}`);
		return true;
	}
	say(log, `  update   ${plan}`);

	if (site.pinKind === 'link') {
		const pkgPath = join(site.packageDir, 'package.json');
		const rewritten = retargetGetfilepressToNpm(readFileSync(pkgPath, 'utf8'), npmPinFor(target));
		if (rewritten.changed) writeFileSync(pkgPath, rewritten.text);
	}

	const installCmd = site.lockfileDir ? (['update', 'getfilepress'] as const) : (['install'] as const);
	const { ok, status } = run('pnpm', [...installCmd], site.packageDir, log);
	if (!ok) {
		say(log, `  update   failed (exit ${status})`);
		return false;
	}
	const locked = lockedGetfilepressVersion(
		resolveLockfileDir(site.packageDir, site.repoRoot),
		site.packageDir
	);
	if (locked !== target) {
		say(log, `  update   still ${locked ?? 'unresolved'} after pnpm; getfilepress@${target} is not installed.`);
		say(log, `  update   publish ${target} to npm, then re-run.`);
		return false;
	}
	return true;
}

export function applyHeaders(site: SiblingSite, log: LogFn | null = null): boolean {
	const plan = headersPlan(site);
	if (plan.action === 'none') {
		say(log, '  headers  none (engine writes build/_headers)');
		return true;
	}
	if (plan.action === 'ok') {
		say(log, '  headers  static/_headers already has defaults');
		return true;
	}
	if (!site.headersPath) return true;
	const existing = readFileSync(site.headersPath, 'utf8');
	const merged = mergeSecurityHeaders(existing, defaultSecurityHeaders());
	writeFileSync(site.headersPath, merged.text);
	say(log, `  headers  merged (+${merged.added.join(', ')})`);
	return true;
}

export function applyCommit(site: SiblingSite, target: string, log: LogFn | null = null): boolean {
	const probe = git(site.repoRoot, ['rev-parse', '--is-inside-work-tree'], log);
	if (probe.status !== 0 || probe.stdout.trim() !== 'true') {
		say(log, '  commit   skip (not a git repo)');
		return true;
	}
	const rels = syncCommitPaths(site);
	if (rels.length === 0) {
		say(log, '  commit   none');
		return true;
	}
	const added = git(site.repoRoot, ['add', '--', ...rels], log);
	if (added.status !== 0) {
		say(log, `  commit   git add failed`);
		return false;
	}
	const staged = git(site.repoRoot, ['diff', '--cached', '--quiet'], log);
	if (staged.status === 0) {
		say(log, '  commit   nothing to commit');
		return true;
	}
	say(log, `  commit   ${rels.join(', ')}`);
	const committed = git(
		site.repoRoot,
		[
			'commit',
			'-m',
			`Sync getfilepress to ${target}.`,
			'-m',
			'Update the engine pin and FilePress security headers.'
		],
		log
	);
	if (committed.status !== 0) {
		say(log, `  commit   git commit failed (exit ${committed.status})`);
		return false;
	}
	return true;
}

export function applyShip(site: SiblingSite, log: LogFn | null = null): boolean {
	if (!site.shipDir) {
		say(log, '  ship     none');
		return true;
	}
	say(log, `  ship     pnpm ship in ${relative(workspaceRoot, site.shipDir)}`);
	const { ok, status } = run('pnpm', ['ship'], site.shipDir, log);
	if (!ok) {
		say(log, `  ship     failed (exit ${status})`);
		return false;
	}
	return true;
}

export function applySite(
	site: SiblingSite,
	opts: { target: string; ship: boolean; commit: boolean },
	log: LogFn | null = null
): boolean {
	if (!applyUpdate(site, opts.target, log) || !applyHeaders(site, log)) return false;
	if (opts.commit) {
		if (!applyCommit(site, opts.target, log)) return false;
	} else {
		say(log, '  commit   skipped (--no-commit)');
	}
	if (opts.ship) return applyShip(site, log);
	say(log, '  ship     skipped (pass --ship)');
	return true;
}

export function persistInventory(inventory: Inventory): void {
	mkdirSync(STATE_DIR, { recursive: true });
	writeFileSync(join(STATE_DIR, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
}
