/**
 * JSON bridge so LocalHelm can host FilePress sibling jobs without reimplementing them.
 * Invoked by localhelm.plugin.mjs in this repo.
 */
import {
	applyPushSite,
	applySite,
	buildInventory,
	discoverSiblingSites,
	loadEngineStrip,
	planLandSites,
	planPushSite,
	type SiblingSite,
} from './lib.ts';

type Cmd = {
	cmd: 'inventory' | 'apply' | 'plan';
	action?: string;
	names?: string[];
	commit?: boolean;
};

function parseArgs(argv: string[]): Cmd {
	const cmd = argv[0];
	if (cmd !== 'inventory' && cmd !== 'apply' && cmd !== 'plan') {
		throw new Error(
			'usage: localhelm-bridge inventory | plan --action push|land [--names a,b] | apply --action sync|ship|push [--names a,b] [--no-commit]',
		);
	}
	const namesRaw = (() => {
		const i = argv.indexOf('--names');
		return i >= 0 ? argv[i + 1] : undefined;
	})();
	return {
		cmd,
		action: argv.includes('--action') ? argv[argv.indexOf('--action') + 1] : 'sync',
		names: namesRaw ? namesRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
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
		const results = sites.map((site) => {
			const ok = applyPushSite(site, (line) => log.push(`${site.name} ${line}`));
			return { id: site.name, ok };
		});
		process.stdout.write(`${JSON.stringify({ action: 'push', results, log })}\n`);
		if (results.some((row) => !row.ok)) process.exitCode = 1;
		return;
	}

	const action = opts.action === 'ship' ? 'ship' : 'sync';
	const engine = await loadEngineStrip();
	const log: string[] = [];
	const results = sites.map((site) => {
		const ok = applySite(
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
			results,
			log,
		})}\n`,
	);
	if (results.some((row) => !row.ok)) process.exitCode = 1;
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
