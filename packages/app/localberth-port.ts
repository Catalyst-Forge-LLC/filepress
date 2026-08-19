import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** `localberth get <name>` — undefined if the CLI or lease is missing. */
export function localberthGet(name: string): number | undefined {
	const r = spawnSync('localberth', ['get', name], {
		encoding: 'utf8',
		timeout: 5000,
		windowsHide: true,
		shell: process.platform === 'win32'
	});
	if (r.status !== 0) return undefined;
	const n = Number((r.stdout || '').trim());
	return Number.isInteger(n) && n > 0 && n <= 65535 ? n : undefined;
}

/** FILEPRESS_LEASE, then site package.json name, then the site folder name. */
export function filepressLeaseName(siteRoot: string): string {
	const fromEnv = process.env.FILEPRESS_LEASE?.trim();
	if (fromEnv) return fromEnv;
	const pkgPath = join(siteRoot, 'package.json');
	if (existsSync(pkgPath)) {
		try {
			const name = JSON.parse(readFileSync(pkgPath, 'utf8')).name;
			if (typeof name === 'string' && name.trim()) return name.trim();
		} catch {
			/* fall through */
		}
	}
	return siteRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'filepress';
}
