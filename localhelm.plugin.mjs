/**
 * FilePress plugin for LocalHelm.
 * LocalHelm hosts the board; this file calls the sibling library (headers, link→npm, ship).
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const win = process.platform === 'win32';

function bridge(args) {
	const result = spawnSync(
		win ? 'pnpm.cmd' : 'pnpm',
		['exec', 'tsx', 'scripts/siblings/localhelm-bridge.ts', ...args],
		{ cwd: root, encoding: 'utf8', windowsHide: true, shell: win },
	);
	const stdout = result.stdout ?? '';
	const stderr = (result.stderr ?? '').trim();
	if (result.error) throw new Error(result.error.message);
	const text = stdout.trim();
	if (!text) throw new Error(stderr || `filepress bridge failed (exit ${result.status})`);
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(stderr || `filepress bridge returned non-JSON:\n${text.slice(0, 400)}`);
	}
}

function actionsFor(site) {
	const list = [{ id: 'sync', label: 'Sync engine', write: true }];
	if (site.ship) list.push({ id: 'ship', label: 'Ship', write: true });
	return list;
}

function siteNeedsSync(site) {
	const update = String(site.update ?? '');
	const updateWork = Boolean(update) && !update.startsWith('already') && !update.startsWith('skip');
	return updateWork || site.headers?.action === 'merge';
}

function boardFrom(inventory) {
	return {
		plugin: 'filepress',
		title: 'FilePress sites',
		note: [
			`Engine local ${inventory.engine.local}, npm ${inventory.engine.published ?? 'none'}, sync target ${inventory.engine.target}.`,
			inventory.engine.note,
			'Sync retargets getfilepress (including link:), merges static/_headers, and commits. Ship then runs pnpm ship. LocalHelm does not reimplement those jobs.',
		]
			.filter(Boolean)
			.join(' '),
		columns: [
			{ id: 'pin', label: 'pin' },
			{ id: 'locked', label: 'locked' },
			{ id: 'update', label: 'update' },
			{ id: 'headers', label: 'headers' },
			{ id: 'ship', label: 'ship' },
			{ id: 'git', label: 'git' },
			{ id: 'live', label: 'live' },
		],
		rows: inventory.sites.map((site) => ({
			id: site.name,
			cells: {
				pin: `${site.pinKind} ${site.pin}`,
				locked: site.lockedVersion ?? '—',
				update: site.update,
				headers:
					site.headers.action === 'merge'
						? `merge +${site.headers.added.join(', ')}`
						: site.headers.action,
				ship: site.ship ? 'yes' : 'no',
				git: site.gitDirty == null ? '—' : site.gitDirty ? 'dirty' : 'clean',
				live: site.url ?? '—',
			},
			actions: actionsFor(site),
		})),
	};
}

const plugin = {
	id: 'filepress',
	label: 'FilePress sites',
	async board() {
		return boardFrom(bridge(['inventory']));
	},
	async plan(action, ids) {
		const inventory = bridge(['inventory']);
		const want = new Set(ids);
		return {
			action,
			target: inventory.engine.target,
			note: inventory.engine.note,
			rows: inventory.sites
				.filter((site) => want.size === 0 || want.has(site.name))
				.map((site) => {
					if (action === 'ship') {
						return {
							id: site.name,
							update: site.update,
							headers: site.headers,
							ship: site.ship,
							writes: Boolean(site.ship),
							action: site.ship ? 'ship' : 'skip',
						};
					}
					const writes = siteNeedsSync(site);
					return {
						id: site.name,
						update: site.update,
						headers: site.headers,
						ship: 'skipped',
						writes,
						action: writes ? 'sync' : 'skip',
					};
				}),
		};
	},
	async apply(action, ids) {
		const args = ['apply', '--action', action === 'ship' ? 'ship' : 'sync'];
		if (ids.length) args.push('--names', ids.join(','));
		return bridge(args);
	},
};

export default plugin;
