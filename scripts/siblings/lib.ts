/**
 * Shared sibling-site library (CLI + local dashboard).
 * Not part of the published getfilepress package.
 */
import { createHash } from 'node:crypto';
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
const SCAN_SKIP = new Set([
	'node_modules',
	'.git',
	'build',
	'dist',
	'.svelte-kit',
	'.filepress-genie',
	'.filepress-siblings',
	'coverage',
	'vendor'
]);
const STATE_DIR = join(filepressRoot, '.filepress-siblings');

export type PinKind = 'npm' | 'link' | 'git' | 'engine';
export type SiteOrigin = 'sibling' | 'in-repo' | 'enrolled';
export type LogFn = (line: string) => void;

export type SiblingSite = {
	name: string;
	repoRoot: string;
	packageDir: string;
	contentRoot: string;
	pin: string;
	pinKind: PinKind;
	origin: SiteOrigin;
	lockfileDir: string | null;
	lockedVersion: string | null;
	headersPath: string | null;
	shipDir: string | null;
};

export type HeadersPlan = { action: 'none' | 'merge' | 'ok'; added: string[] };

/** One `git status --porcelain -b` per repo — dirty plus ahead/behind, no extra spawn. */
export type GitTrack = {
	dirty: boolean | null;
	ahead: number | null;
	behind: number | null;
	branch: string | null;
};

/** Batched lookups shared by every row of one inventory pass. */
export type PlanContext = {
	leases: Map<string, number>;
	tracks: Map<string, GitTrack>;
};

export type SitePlan = {
	name: string;
	path: string;
	pin: string;
	pinKind: PinKind;
	origin: SiteOrigin;
	lockedVersion: string | null;
	update: string;
	headers: HeadersPlan;
	ship: string | null;
	/** HEAD + dirty tree digest — LocalHelm skips ship when this matches the last successful ship. */
	shipFingerprint: string | null;
	url: string | null;
	gitDirty: boolean | null;
	gitAhead: number | null;
	gitBehind: number | null;
	gitBranch: string | null;
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

function siteFromPackageJson(
	packageJsonPath: string,
	repoRoot: string,
	name: string,
	origin: SiteOrigin = 'sibling'
): SiblingSite | null {
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
		origin,
		lockfileDir,
		lockedVersion: lockedGetfilepressVersion(lockfileDir, packageDir),
		headersPath: existsSync(headersCandidate) ? headersCandidate : null,
		shipDir: shipDirFor(packageDir, repoRoot, pkg)
	};
}

function inRepoShipDir(engineRoot: string, siteName: string): string | null {
	const pkg = readJson(join(engineRoot, 'package.json'));
	const hay = `${pkg?.scripts?.ship ?? ''} ${pkg?.scripts?.['build:www'] ?? ''} ${pkg?.scripts?.['deploy:www'] ?? ''}`;
	if (hay.includes(`sites/${siteName}`) || hay.includes(`--site ${siteName}`)) return engineRoot;
	return null;
}

function siteFromInRepo(contentRoot: string, engineRoot: string, name: string): SiblingSite | null {
	if (!existsSync(join(contentRoot, 'filepress.config.ts'))) return null;
	const headersCandidate = join(contentRoot, 'static', '_headers');
	const lockfileDir = resolveLockfileDir(engineRoot, engineRoot);
	return {
		name,
		repoRoot: engineRoot,
		packageDir: engineRoot,
		contentRoot,
		pin: 'engine',
		pinKind: 'engine',
		origin: 'in-repo',
		lockfileDir,
		lockedVersion: readJson(join(engineRoot, 'package.json'))?.version ?? null,
		headersPath: existsSync(headersCandidate) ? headersCandidate : null,
		shipDir: inRepoShipDir(engineRoot, name)
	};
}

function uniqueName(base: string, seenNames: Set<string>): string {
	if (!seenNames.has(base)) return base;
	let i = 2;
	while (seenNames.has(`${base}-${i}`)) i++;
	return `${base}-${i}`;
}

function pushSite(found: SiblingSite[], seen: Set<string>, seenNames: Set<string>, site: SiblingSite | null): void {
	if (!site) return;
	const key = resolve(site.contentRoot);
	if (seen.has(key)) return;
	seen.add(key);
	const name = uniqueName(site.name, seenNames);
	seenNames.add(name);
	found.push(name === site.name ? site : { ...site, name });
}

export type DiscoverOpts = {
	workspace?: string;
	engineRoot?: string;
	extras?: string[];
	ignore?: Set<string>;
};

function extraSiteFromPath(raw: string, workspace: string, engineRoot: string): SiblingSite | null {
	const abs = resolve(workspace, raw);
	if (!existsSync(abs) || !statSync(abs).isDirectory()) return null;
	const folder = abs.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? 'site';
	for (const rel of ['package.json', join('site', 'package.json')]) {
		const site = siteFromPackageJson(join(abs, rel), abs, folder, 'enrolled');
		if (site) return site;
	}
	if (existsSync(join(abs, 'filepress.config.ts'))) {
		const underEngine = resolve(abs).startsWith(resolve(engineRoot, 'sites'));
		if (underEngine) return siteFromInRepo(abs, engineRoot, folder);
	}
	return null;
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

export function extraSitePaths(stateDir = STATE_DIR): string[] {
	const path = join(stateDir, 'extras.json');
	if (!existsSync(path)) return [];
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as { paths?: unknown };
		const paths = Array.isArray(raw.paths) ? raw.paths : [];
		return paths.filter((p): p is string => typeof p === 'string' && p.trim() !== '');
	} catch {
		return [];
	}
}

export function writeExtraSitePaths(paths: string[], stateDir = STATE_DIR): string[] {
	const unique: string[] = [];
	const seen = new Set<string>();
	for (const raw of paths) {
		const trimmed = raw.trim();
		if (!trimmed) continue;
		const key = resolve(trimmed).toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(trimmed.replace(/\\/g, '/'));
	}
	mkdirSync(stateDir, { recursive: true });
	writeFileSync(join(stateDir, 'extras.json'), `${JSON.stringify({ paths: unique }, null, 2)}\n`);
	return unique;
}

export function enrollExtraSites(paths: string[], stateDir = STATE_DIR): { added: string[]; already: string[] } {
	const have = extraSitePaths(stateDir);
	const haveKeys = new Set(have.map((p) => resolve(workspaceRoot, p).toLowerCase()));
	const added: string[] = [];
	const already: string[] = [];
	for (const raw of paths) {
		const abs = resolve(workspaceRoot, raw);
		if (haveKeys.has(abs.toLowerCase())) {
			already.push(abs);
			continue;
		}
		haveKeys.add(abs.toLowerCase());
		const rel = relative(workspaceRoot, abs).replace(/\\/g, '/');
		have.push(rel.startsWith('..') ? abs.replace(/\\/g, '/') : rel);
		added.push(abs);
	}
	writeExtraSitePaths(have, stateDir);
	return { added, already };
}

export function unenrollExtraSites(names: string[], sites: SiblingSite[], stateDir = STATE_DIR): string[] {
	const drop = new Set(names.map((n) => n.toLowerCase()));
	const dropRoots = new Set(
		sites.filter((s) => s.origin === 'enrolled' && drop.has(s.name.toLowerCase())).map((s) => resolve(s.contentRoot))
	);
	const kept = extraSitePaths(stateDir).filter((p) => !dropRoots.has(resolve(workspaceRoot, p)));
	writeExtraSitePaths(kept, stateDir);
	return [...dropRoots];
}

export function discoverSites(opts: DiscoverOpts = {}): SiblingSite[] {
	const workspace = opts.workspace ?? workspaceRoot;
	const engineRoot = opts.engineRoot ?? filepressRoot;
	const ignore = opts.ignore ?? ignoredFolderNames();
	const extras = opts.extras ?? extraSitePaths();
	const found: SiblingSite[] = [];
	const seen = new Set<string>();
	const seenNames = new Set<string>();

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
			pushSite(found, seen, seenNames, siteFromPackageJson(join(repoRoot, rel), repoRoot, entry, 'sibling'));
		}
	}

	const sitesDir = join(engineRoot, 'sites');
	if (existsSync(sitesDir)) {
		for (const entry of readdirSync(sitesDir)) {
			if (ignore.has(entry.toLowerCase()) || entry.startsWith('.') || entry.startsWith('__')) continue;
			const contentRoot = join(sitesDir, entry);
			try {
				if (!statSync(contentRoot).isDirectory()) continue;
			} catch {
				continue;
			}
			pushSite(found, seen, seenNames, siteFromInRepo(contentRoot, engineRoot, entry));
		}
	}

	for (const extra of extras) {
		const site = extraSiteFromPath(extra, workspace, engineRoot);
		if (!site) continue;
		if (ignore.has(site.name.toLowerCase())) continue;
		pushSite(found, seen, seenNames, site);
	}

	return found.sort((a, b) => a.name.localeCompare(b.name));
}

export function discoverSiblingSites(workspace = workspaceRoot): SiblingSite[] {
	return discoverSites({ workspace });
}

export type ScanCandidate = {
	name: string;
	path: string;
	absPath: string;
	kind: PinKind;
	origin: SiteOrigin;
	enrolled: boolean;
	url: string | null;
};

function walkDirs(root: string, maxDepth: number): string[] {
	const out: string[] = [root];
	const walk = (dir: string, depth: number) => {
		if (depth >= maxDepth) return;
		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			return;
		}
		for (const entry of entries) {
			if (SCAN_SKIP.has(entry) || entry.startsWith('.') || entry.startsWith('__')) continue;
			const child = join(dir, entry);
			try {
				if (!statSync(child).isDirectory()) continue;
			} catch {
				continue;
			}
			out.push(child);
			walk(child, depth + 1);
		}
	};
	walk(root, 0);
	return out;
}

/** Propose FilePress sites under a folder. Does not enroll. */
export function scanFilepressSites(
	root: string,
	opts: { workspace?: string; engineRoot?: string; maxDepth?: number; enrolled?: SiblingSite[] } = {}
): ScanCandidate[] {
	const workspace = opts.workspace ?? workspaceRoot;
	const engineRoot = opts.engineRoot ?? filepressRoot;
	const maxDepth = opts.maxDepth ?? 3;
	const absRoot = resolve(workspace, root);
	if (!existsSync(absRoot) || !statSync(absRoot).isDirectory()) {
		throw new Error(`scan root is not a directory: ${root}`);
	}
	const have = new Set((opts.enrolled ?? discoverSites({ workspace, engineRoot })).map((s) => resolve(s.contentRoot)));
	const rows: ScanCandidate[] = [];
	const seen = new Set<string>();
	for (const dir of walkDirs(absRoot, maxDepth)) {
		const folder = dir.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? 'site';
		let site: SiblingSite | null = null;
		for (const rel of ['package.json', join('site', 'package.json')]) {
			site = siteFromPackageJson(join(dir, rel), dir, folder, 'enrolled');
			if (site) break;
		}
		if (!site && existsSync(join(dir, 'filepress.config.ts'))) {
			const underEngine = resolve(dir).startsWith(resolve(join(engineRoot, 'sites')));
			if (underEngine) site = siteFromInRepo(dir, engineRoot, folder);
		}
		if (!site) continue;
		const key = resolve(site.contentRoot);
		if (seen.has(key)) continue;
		seen.add(key);
		rows.push({
			name: site.name,
			path: relative(workspace, site.contentRoot).replace(/\\/g, '/') || '.',
			absPath: site.contentRoot,
			kind: site.pinKind,
			origin: have.has(key) ? site.origin : 'enrolled',
			enrolled: have.has(key),
			url: readConfigUrl(site.contentRoot)
		});
	}
	return rows.sort((a, b) => a.path.localeCompare(b.path));
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
	if (site.pinKind === 'engine') return 'skip (in-repo — engine is the pin)';
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

/**
 * Parse `git status --porcelain -b`. First line is `## branch...upstream [ahead N, behind M]`.
 * No extra subprocess: the same stdout already tells us dirty vs clean.
 */
export function parseGitPorcelainBranch(stdout: string): GitTrack {
	const lines = stdout.replace(/\r\n/g, '\n').split('\n');
	const header = lines[0] ?? '';
	if (!header.startsWith('## ')) {
		return { dirty: Boolean(stdout.trim()), ahead: null, behind: null, branch: null };
	}
	const dirty = Boolean(lines.slice(1).join('\n').trim());
	if (/^## HEAD \(no branch\)/.test(header)) {
		return { dirty, ahead: null, behind: null, branch: null };
	}
	const named = /^## ([^\s.]+)/.exec(header);
	const branch = named?.[1] ?? null;
	const hasUpstream = header.includes('...');
	if (!hasUpstream) return { dirty, ahead: null, behind: null, branch };
	const aheadMatch = /ahead (\d+)/.exec(header);
	const behindMatch = /behind (\d+)/.exec(header);
	return {
		dirty,
		ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
		behind: behindMatch ? Number(behindMatch[1]) : 0,
		branch
	};
}

export async function gitTrackMap(repoRoots: string[]): Promise<Map<string, GitTrack>> {
	const repos = [...new Set(repoRoots)];
	const missing: GitTrack = { dirty: null, ahead: null, behind: null, branch: null };
	const states = await mapLimit(repos, 8, async (repo) => {
		const r = await exec('git', ['status', '--porcelain', '-b'], { cwd: repo, timeout: 8000 });
		return r.status === 0 ? parseGitPorcelainBranch(r.stdout) : missing;
	});
	return new Map(repos.map((repo, i) => [repo, states[i]]));
}

export async function gitDirtyMap(repoRoots: string[]): Promise<Map<string, boolean | null>> {
	const tracks = await gitTrackMap(repoRoots);
	return new Map([...tracks].map(([repo, t]) => [repo, t.dirty]));
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
	const [leases, tracks] = await Promise.all([
		leaseTable(),
		gitTrackMap(sites.map((s) => s.repoRoot))
	]);
	return { leases, tracks };
}

export function planSite(site: SiblingSite, target: string, ctx?: PlanContext): SitePlan {
	const track = ctx?.tracks.get(site.repoRoot);
	return {
		name: site.name,
		path: relative(workspaceRoot, site.contentRoot),
		pin: site.pin,
		pinKind: site.pinKind,
		origin: site.origin,
		lockedVersion: site.lockedVersion,
		update: updatePlan(site, target),
		headers: headersPlan(site),
		ship: site.shipDir ? `pnpm ship in ${relative(workspaceRoot, site.shipDir)}` : null,
		shipFingerprint: shipFingerprint(site),
		url: readConfigUrl(site.contentRoot),
		gitDirty: track?.dirty ?? null,
		gitAhead: track?.ahead ?? null,
		gitBehind: track?.behind ?? null,
		gitBranch: track?.branch ?? null,
		leasePort: ctx ? leasePortFor(site, ctx.leases) : null
	};
}

/** True when Sync engine would rewrite the pin or merge headers. */
export function siteNeedsSync(site: Pick<SitePlan, 'update' | 'headers'>): boolean {
	const update = site.update ?? '';
	const updateWork = Boolean(update) && !update.startsWith('already') && !update.startsWith('skip');
	return updateWork || site.headers.action === 'merge';
}

/**
 * Fingerprint of the tree ship would deploy. Unchanged after a successful ship until
 * commits or uncommitted files change — LocalHelm uses this to skip a no-op ship.
 */
export function shipFingerprint(site: SiblingSite): string | null {
	if (!site.shipDir) return null;
	const head = git(site.repoRoot, ['rev-parse', 'HEAD'], null);
	if (head.status !== 0) return null;
	const porcelain = git(site.repoRoot, ['status', '--porcelain'], null);
	const dirty = (porcelain.stdout ?? '').replace(/\r\n/g, '\n');
	const digest = createHash('sha1').update(dirty).digest('hex').slice(0, 12);
	return `${head.stdout.trim()}:${digest}`;
}

export type LandSitePlanRow = {
	id: string;
	sync: { writes: boolean; update: string; headers: HeadersPlan };
	push: SitePushPlan;
	ship: { writes: boolean; fingerprint: string | null; script: string | null };
};

/** One-pass plan for LocalHelm Land: sync + push + ship needs for named sites only. */
export async function planLandSites(sites: SiblingSite[]): Promise<{
	engine: EngineStrip;
	rows: LandSitePlanRow[];
	buildMs: number;
}> {
	const started = Date.now();
	const [engine, ctx] = await Promise.all([loadEngineStrip(), planContext(sites)]);
	const rows = sites.map((site) => {
		const planned = planSite(site, engine.target, ctx);
		const push = planPushSite(site);
		return {
			id: site.name,
			sync: {
				writes: siteNeedsSync(planned),
				update: planned.update,
				headers: planned.headers,
			},
			push,
			ship: {
				writes: Boolean(site.shipDir),
				fingerprint: planned.shipFingerprint,
				script: planned.ship,
			},
		};
	});
	return { engine, rows, buildMs: Date.now() - started };
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
	const abs =
		site.pinKind === 'engine'
			? [site.headersPath]
			: [
					join(site.packageDir, 'package.json'),
					site.lockfileDir ? join(site.lockfileDir, 'pnpm-lock.yaml') : null,
					site.headersPath
				];
	return abs
		.filter((p): p is string => Boolean(p) && existsSync(p))
		.map((p) => relative(site.repoRoot, p))
		.filter((rel) => rel && !rel.startsWith('..'));
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
	if (site.pinKind === 'engine') {
		say(log, '  update   skip (in-repo — engine is the pin)');
		return true;
	}
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

export type SitePushPlan = {
	id: string;
	action: 'push' | 'skip';
	writes: boolean;
	reason: string;
	branch?: string;
	origin?: string;
	ahead?: number;
};

export function planPushSite(site: SiblingSite): SitePushPlan {
	const skip = (reason: string, extra: Partial<SitePushPlan> = {}): SitePushPlan => ({
		id: site.name,
		action: 'skip',
		writes: false,
		reason,
		...extra,
	});
	const probe = git(site.repoRoot, ['rev-parse', '--is-inside-work-tree'], null);
	if (probe.status !== 0 || probe.stdout.trim() !== 'true') return skip('no git');
	const porcelain = git(site.repoRoot, ['status', '--porcelain'], null);
	if (porcelain.status !== 0) return skip('git status failed');
	if (porcelain.stdout.trim()) return skip('dirty');
	const branch = git(site.repoRoot, ['branch', '--show-current'], null).stdout.trim();
	if (!branch) return skip('detached');
	const origin = git(site.repoRoot, ['remote', 'get-url', 'origin'], null);
	const originUrl = origin.stdout.trim();
	if (origin.status !== 0 || !originUrl) return skip('no origin');
	const count = git(site.repoRoot, ['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`], null);
	if (count.status !== 0) return skip('no upstream', { branch, origin: originUrl });
	const [behindRaw, aheadRaw] = count.stdout.trim().split(/\s+/);
	const behind = Number(behindRaw);
	const ahead = Number(aheadRaw);
	if (!Number.isFinite(ahead) || !Number.isFinite(behind)) return skip('no upstream', { branch, origin: originUrl });
	if (behind > 0) return skip('diverged', { branch, origin: originUrl, ahead });
	if (ahead === 0) return skip('not ahead', { branch, origin: originUrl, ahead: 0 });
	return {
		id: site.name,
		action: 'push',
		writes: true,
		reason: `${ahead} on ${branch} → ${originUrl}`,
		branch,
		origin: originUrl,
		ahead,
	};
}

export function applyPushSite(site: SiblingSite, log: LogFn | null = null): boolean {
	const plan = planPushSite(site);
	if (plan.action !== 'push' || !plan.branch) {
		say(log, `  push     ${plan.reason}`);
		return true;
	}
	say(log, `  push     git push origin ${plan.branch} (never --force)`);
	const result = git(site.repoRoot, ['push', 'origin', plan.branch], log);
	if (result.status !== 0) {
		say(log, '  push     failed');
		return false;
	}
	say(log, '  push     pushed');
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
