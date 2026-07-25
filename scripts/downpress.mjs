#!/usr/bin/env node
// Run the shared @downpress/app SvelteKit project against a content site.
//
// Modes:
//   Monorepo:  downpress <cmd> --site <name>     → sites/<name>/
//   Linked:    downpress <cmd>                   → process.cwd() (content-only site)
//   Explicit:  downpress <cmd> --root <path>
//
// Local sibling site:
//   "downpress": "file:../downpress"
// Cloudflare / CI (once this repo is on GitHub):
//   "downpress": "github:Catalyst-Forge-LLC/downpress#<tag-or-sha>"

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
/** Install root of the downpress package (monorepo root, or linked file: copy). */
const packageRoot = resolve(scriptDir, '..');
const appDir = join(packageRoot, 'packages', 'app');
const sitesDir = join(packageRoot, 'sites');

const COMMANDS = new Set(['dev', 'build', 'preview', 'check']);

function fail(msg) {
	console.error(`downpress: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { _: [], site: null, root: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--site') {
			args.site = argv[++i];
			if (!args.site) fail('`--site` requires a site name.');
		} else if (a.startsWith('--site=')) {
			args.site = a.slice('--site='.length);
		} else if (a === '--root') {
			args.root = argv[++i];
			if (!args.root) fail('`--root` requires a path.');
		} else if (a.startsWith('--root=')) {
			args.root = a.slice('--root='.length);
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
		return statSync(dir).isDirectory() && existsSync(join(dir, 'downpress.config.ts'));
	});
}

function resolveSiteRoot(args) {
	if (args.site && args.root) {
		fail('use either `--site` or `--root`, not both.');
	}
	if (args.site) {
		const siteRoot = join(sitesDir, args.site);
		if (!existsSync(siteRoot)) fail(`site not found: sites/${args.site}`);
		return siteRoot;
	}
	if (args.root) {
		return resolve(args.root);
	}
	// Linked / external site: the content root is the caller's cwd.
	return resolve(process.cwd());
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

if (!command || !COMMANDS.has(command)) {
	fail(
		`usage:\n` +
			`  downpress <${[...COMMANDS].join('|')}> --site <name>   # monorepo\n` +
			`  downpress <${[...COMMANDS].join('|')}>                 # cwd is the site\n` +
			`  downpress <${[...COMMANDS].join('|')}> --root <path>\n` +
			`monorepo sites: ${listSites().join(', ') || '(none)'}`
	);
}

const siteRoot = resolveSiteRoot(args);
const configPath = join(siteRoot, 'downpress.config.ts');
if (!existsSync(configPath)) {
	fail(
		`no downpress.config.ts in ${siteRoot}\n` +
			`  (monorepo: pass --site <name>; linked site: run from the site root)`
	);
}
if (!existsSync(appDir)) fail(`packages/app is missing under ${packageRoot}`);

// Ensure the engine workspace has been installed (file: link does not install it).
if (!existsSync(join(packageRoot, 'node_modules'))) {
	fail(
		`downpress dependencies are missing at ${packageRoot}.\n` +
			`  Run \`pnpm install\` once inside the downpress repo, then retry.`
	);
}

const env = {
	...process.env,
	DOWNPRESS_SITE_ROOT: siteRoot
};

const isWin = process.platform === 'win32';
const child = spawn(isWin ? 'pnpm.cmd' : 'pnpm', ['--filter', '@downpress/app', 'run', command], {
	cwd: packageRoot,
	env,
	stdio: 'inherit',
	shell: isWin
});

child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
