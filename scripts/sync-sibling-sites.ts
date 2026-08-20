/**
 * Local operator CLI: find sibling FilePress sites and sync them to this engine.
 *
 *   pnpm sync-siblings              dry-run
 *   pnpm sync-siblings --apply      npm pins, merge headers, commit in each repo (no push)
 *   pnpm sync-siblings --ship       apply, then pnpm ship where a ship script exists
 *   pnpm sync-siblings --only name
 *   pnpm sync-siblings --apply --no-commit
 *
 * Dashboard: pnpm siblings
 * Not part of the published package. Does not push.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	applySite,
	discoverSiblingSites,
	loadEngineStrip,
	planSite,
	workspaceRoot,
	type SiblingSite
} from './siblings/lib.ts';

export {
	npmPinFor,
	parseLockedGetfilepress,
	resolveLockfileDir,
	resolveSyncTarget,
	retargetGetfilepressToNpm
} from './siblings/lib.ts';

export type SyncArgs = {
	apply: boolean;
	ship: boolean;
	commit: boolean;
	only: string[];
	help: boolean;
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

function printSite(site: SiblingSite, target: string): void {
	const plan = planSite(site, target);
	console.log(`\n${plan.name}`);
	console.log(`  path     ${plan.path}`);
	const lock = plan.pinKind === 'npm' && plan.lockedVersion ? `  locked ${plan.lockedVersion}` : '';
	console.log(`  pin      ${plan.pin}${lock}`);
	console.log(`  update   ${plan.update}`);
	if (plan.headers.action === 'none') {
		console.log('  headers  none (engine writes build/_headers)');
	} else if (plan.headers.action === 'ok') {
		console.log('  headers  static/_headers already has defaults');
	} else {
		console.log(`  headers  merge static/_headers (+${plan.headers.added.join(', ')})`);
	}
	console.log(`  ship     ${plan.ship ?? 'none'}`);
	console.log('  commit   git commit in repo (no push)');
}

function usage(): void {
	console.log(`Usage: pnpm sync-siblings [--apply] [--ship] [--only name[,name]]

Discover sibling folders that depend on getfilepress. Dry-run by default.

  --apply      rewrite link: pins to npm, update registry pins, merge static/_headers,
               then commit those files in each sibling repo (no push)
  --ship       apply, then run pnpm ship where the site has a ship script
  --no-commit  apply or ship without creating a git commit
  --only       subset by sibling folder name (repeat or comma-separate)

Dashboard: pnpm siblings
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

	const engine = await loadEngineStrip();
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
	console.log(`Sibling FilePress sites  (${mode}, engine ${engine.local}, npm ${engine.published ?? 'unknown'})`);
	if (engine.note) console.log(`  ${engine.note}`);
	console.log(`Workspace ${workspaceRoot}`);

	if (sites.length === 0) {
		console.log('No sibling sites found.');
		return 0;
	}

	if (!args.apply) {
		for (const site of sites) printSite(site, engine.target);
		console.log(`\n${sites.length} site(s). Dry-run only. Re-run with --apply or --ship.`);
		return 0;
	}

	let failed = 0;
	for (const site of sites) {
		console.log(`\n${site.name}`);
		if (!applySite(site, { target: engine.target, ship: args.ship, commit: args.commit }, null)) {
			failed++;
		}
	}

	console.log(
		failed
			? `\n${sites.length - failed}/${sites.length} ok, ${failed} failed.`
			: `\n${sites.length} site(s) ${mode} ok.`
	);
	return failed ? 1 : 0;
}

const here = fileURLToPath(import.meta.url);
const entry = process.argv[1];
if (entry && resolve(entry) === resolve(here)) {
	main().then((code) => {
		process.exitCode = code;
	});
}
