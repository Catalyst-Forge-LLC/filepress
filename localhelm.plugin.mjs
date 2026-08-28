/**
 * FilePress plugin for LocalHelm.
 * LocalHelm hosts the board; this file calls the sibling library (headers, link→npm, ship).
 */
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const win = process.platform === 'win32';

function bridge(args) {
	return new Promise((resolve, reject) => {
		const child = spawn(
			win ? 'pnpm.cmd' : 'pnpm',
			['exec', 'tsx', 'scripts/siblings/localhelm-bridge.ts', ...args],
			{ cwd: root, windowsHide: true, shell: win },
		);
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', (err) => reject(err));
		child.on('close', (status) => {
			const text = stdout.trim();
			const errText = stderr.trim();
			if (!text) {
				reject(new Error(errText || `filepress bridge failed (exit ${status})`));
				return;
			}
			try {
				resolve(JSON.parse(text));
			} catch {
				reject(new Error(errText || `filepress bridge returned non-JSON:\n${text.slice(0, 400)}`));
			}
		});
	});
}

function actionsFor(site) {
	const list = [
		{ id: 'sync', label: 'Sync engine', write: true, icon: 'lucide:refresh-cw' },
		{ id: 'push', label: 'Push', write: true, icon: 'lucide:upload' },
	];
	if (site.ship) list.push({ id: 'ship', label: 'Ship', write: true, icon: 'lucide:ship' });
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
			'Sync retargets getfilepress (including link:), merges static/_headers, and commits. Push is git push origin <branch> only — never --force. Ship then runs pnpm ship. LocalHelm does not reimplement those jobs.',
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
		return boardFrom(await bridge(['inventory']));
	},
	async plan(action, ids) {
		if (action === 'land') {
			const args = ['plan', '--action', 'land'];
			if (ids.length) args.push('--names', ids.join(','));
			return await bridge(args);
		}
		if (action === 'push') {
			const args = ['plan', '--action', 'push'];
			if (ids.length) args.push('--names', ids.join(','));
			return await bridge(args);
		}
		const inventory = await bridge(['inventory']);
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
							shipFingerprint: site.shipFingerprint ?? null,
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
		const job = action === 'ship' || action === 'push' ? action : 'sync';
		const args = ['apply', '--action', job];
		if (ids.length) args.push('--names', ids.join(','));
		return await bridge(args);
	},
};

export default plugin;
