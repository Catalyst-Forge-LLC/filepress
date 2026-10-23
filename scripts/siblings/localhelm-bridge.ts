/**
 * JSON bridge so LocalHelm can host FilePress sibling jobs without reimplementing them.
 * Invoked by localhelm.plugin.mjs in this repo.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	applyEnrollSites,
	applyPushSite,
	applySiteAsync,
	buildInventory,
	discoverSiblingSites,
	enrollSitesUnder,
	loadEngineStrip,
	planEnrollSites,
	planEnrollSitesUnder,
	planLandSites,
	planPushSite,
	scanFilepressSites,
	workspaceRoot,
	type SiblingSite,
} from './lib.ts';

/** How many sibling ships run together inside this one bridge process. */
const SHIP_AT_A_TIME = 3;
/** LocalHelm writes this when Stop is pressed. Ships already running finish. */
const landStopFile = join(workspaceRoot, '.localhelm', 'land.stop');

function landStopRequested(): boolean {
	return existsSync(landStopFile);
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	const ran = new Array<boolean>(items.length).fill(false);
	let next = 0;
	async function worker(): Promise<void> {
		for (;;) {
			if (landStopRequested()) return;
			const i = next++;
			if (i >= items.length) return;
			results[i] = await fn(items[i]!);
			ran[i] = true;
		}
	}
	const workers = Math.min(Math.max(1, limit), items.length);
	if (workers > 0) await Promise.all(Array.from({ length: workers }, () => worker()));
	return results.filter((_, i) => ran[i]);
}

type Cmd = {
	cmd: 'inventory' | 'apply' | 'plan' | 'scan';
	action?: string;
	names?: string[];
	paths?: string[];
	root?: string;
	maxDepth?: number;
	commit?: boolean;
};

function takeOpt(argv: string[], flag: string): string | undefined {
	const i = argv.indexOf(flag);
	return i >= 0 ? argv[i + 1] : undefined;
}

function takeAll(argv: string[], flag: string): string[] {
	const out: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === flag && argv[i + 1]) {
			out.push(argv[++i]);
		}
	}
	return out;
}

function parsePaths(argv: string[]): string[] {
	const multi = takeAll(argv, '--path');
	const joined = (takeOpt(argv, '--paths') ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return [...multi, ...joined];
}

function parseArgs(argv: string[]): Cmd {
	const cmd = argv[0];
	if (cmd !== 'inventory' && cmd !== 'apply' && cmd !== 'plan' && cmd !== 'scan') {
		throw new Error(
			'usage: localhelm-bridge inventory | scan [--root path] | plan --action push|land|enroll|enroll-from [--names a,b] [--path p] | apply --action sync|ship|push|enroll|enroll-from [--names a,b] [--path p] [--no-commit]',
		);
	}
	const namesRaw = takeOpt(argv, '--names');
	const depthRaw = takeOpt(argv, '--max-depth');
	const depth = depthRaw ? Number(depthRaw) : undefined;
	return {
		cmd,
		action: takeOpt(argv, '--action') ?? 'sync',
		names: namesRaw ? namesRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
		paths: parsePaths(argv),
		root: takeOpt(argv, '--root'),
		maxDepth: Number.isInteger(depth) ? depth : undefined,
		commit: !argv.includes('--no-commit'),
	};
}

function pickSites(all: SiblingSite[], names?: string[]): SiblingSite[] {
	if (!names?.length) return all;
	const want = new Set(names);
	const picked = all.filter((site) => want.has(site.name));
	const missing = names.filter((n) => !picked.some((s) => s.name === n));
	if (missing.length) throw new Error(`unknown FilePress site(s): ${missing.join(', ')}`);
	return picked;
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	if (opts.cmd === 'inventory') {
		process.stdout.write(`${JSON.stringify(await buildInventory())}\n`);
		return;
	}

	if (opts.cmd === 'scan') {
		const root = (opts.root ?? workspaceRoot).trim() || workspaceRoot;
		const candidates = scanFilepressSites(root, { maxDepth: opts.maxDepth ?? 3 });
		process.stdout.write(`${JSON.stringify({ root, candidates })}\n`);
		return;
	}

	if (opts.action === 'enroll' || opts.action === 'enroll-from') {
		const paths = opts.paths ?? [];
		if (opts.cmd === 'plan') {
			const planned =
				opts.action === 'enroll-from' ? planEnrollSitesUnder(paths) : planEnrollSites(paths);
			process.stdout.write(`${JSON.stringify(planned)}\n`);
			return;
		}
		const applied =
			opts.action === 'enroll-from' ? enrollSitesUnder(paths) : applyEnrollSites(paths);
		process.stdout.write(`${JSON.stringify(applied)}\n`);
		return;
	}

	const sites = pickSites(discoverSiblingSites(), opts.names);

	if (opts.cmd === 'plan') {
		if (opts.action === 'land') {
			const planned = await planLandSites(sites);
			process.stdout.write(`${JSON.stringify({ action: 'land', ...planned })}\n`);
			return;
		}
		process.stdout.write(`${JSON.stringify({ action: 'push', rows: sites.map(planPushSite) })}\n`);
		return;
	}

	if (opts.action === 'push') {
		const log: string[] = [];
		const ran = await mapLimit(sites, SHIP_AT_A_TIME, async (site) => {
			const ok = applyPushSite(site, (line) => log.push(`${site.name} ${line}`));
			return { id: site.name, ok };
		});
		process.stdout.write(
			`${JSON.stringify({ action: 'push', results: ran, stopped: landStopRequested() || ran.length < sites.length, log })}\n`,
		);
		if (ran.some((row) => !row.ok)) process.exitCode = 1;
		return;
	}

	const action = opts.action === 'ship' ? 'ship' : 'sync';
	const engine = await loadEngineStrip();
	const log: string[] = [];
	const ran = await mapLimit(sites, SHIP_AT_A_TIME, async (site) => {
		const ok = await applySiteAsync(
			site,
			{ target: engine.target, ship: action === 'ship', commit: opts.commit !== false },
			(line) => log.push(`${site.name} ${line}`),
		);
		return { id: site.name, ok };
	});
	process.stdout.write(
		`${JSON.stringify({
			action,
			target: engine.target,
			note: engine.note,
			commit: opts.commit !== false,
			results: ran,
			stopped: landStopRequested() || ran.length < sites.length,
			log,
		})}\n`,
	);
	if (ran.some((row) => !row.ok)) process.exitCode = 1;
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
