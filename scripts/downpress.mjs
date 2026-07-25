#!/usr/bin/env node
// Run the shared @downpress/app SvelteKit project against a content site.
//
// Usage:
//   node scripts/downpress.mjs <dev|build|preview|check> --site <name>
//   pnpm downpress build --site example-site
//
// Sets DOWNPRESS_SITE_ROOT to sites/<name> (absolute), then runs the matching
// vite / svelte-check script inside packages/app. Build output lands in
// sites/<name>/build/.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const appDir = join(repoRoot, 'packages', 'app');
const sitesDir = join(repoRoot, 'sites');

const COMMANDS = new Set(['dev', 'build', 'preview', 'check']);

function fail(msg) {
	console.error(`downpress: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { _: [], site: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--site') {
			args.site = argv[++i];
			if (!args.site) fail('`--site` requires a site name.');
		} else if (a.startsWith('--site=')) {
			args.site = a.slice('--site='.length);
		} else {
			args._.push(a);
		}
	}
	return args;
}

function listSites() {
	if (!existsSync(sitesDir)) return [];
	return readdirSync(sitesDir).filter((name) => {
		const dir = join(sitesDir, name);
		return (
			statSync(dir).isDirectory() && existsSync(join(dir, 'downpress.config.ts'))
		);
	});
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

if (!command || !COMMANDS.has(command)) {
	fail(
		`usage: downpress <${[...COMMANDS].join('|')}> --site <name>\n` +
			`  known sites: ${listSites().join(', ') || '(none)'}`
	);
}

if (!args.site) {
	fail(`missing --site. Known sites: ${listSites().join(', ') || '(none)'}`);
}

const siteRoot = join(sitesDir, args.site);
if (!existsSync(siteRoot)) fail(`site not found: sites/${args.site}`);
if (!existsSync(join(siteRoot, 'downpress.config.ts'))) {
	fail(`sites/${args.site}/downpress.config.ts is missing.`);
}
if (!existsSync(appDir)) fail(`packages/app is missing.`);

const env = {
	...process.env,
	DOWNPRESS_SITE_ROOT: siteRoot
};

// On Windows, pnpm is a .cmd shim — spawn needs shell:true (or pnpm.cmd).
const isWin = process.platform === 'win32';
const child = spawn(isWin ? 'pnpm.cmd' : 'pnpm', ['--filter', '@downpress/app', 'run', command], {
	cwd: repoRoot,
	env,
	stdio: 'inherit',
	shell: isWin
});

child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
