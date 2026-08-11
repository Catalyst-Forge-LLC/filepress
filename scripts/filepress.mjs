#!/usr/bin/env node
// Run the shared @filepress/app SvelteKit project against a content site.
//
// Modes:
//   Monorepo:  filepress <cmd> --site <name>     → sites/<name>/
//   Linked:    filepress <cmd>                   → process.cwd() (content-only site)
//   Explicit:  filepress <cmd> --root <path>
//
// Local sibling site:
//   "filepress": "file:../filepress"
// Cloudflare / CI (once this repo is on GitHub):
//   "filepress": "github:Catalyst-Forge-LLC/filepress#<tag-or-sha>"

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
/** Install root of the filepress package (monorepo root, or linked file: copy). */
const packageRoot = resolve(scriptDir, '..');
const appDir = join(packageRoot, 'packages', 'app');
const sitesDir = join(packageRoot, 'sites');

const COMMANDS = new Set(['dev', 'build', 'preview', 'check']);

function fail(msg) {
	console.error(`filepress: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { _: [], site: null, root: null, port: null, host: null, extra: [] };
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
		} else if (a === '--port' || a === '-p') {
			args.port = argv[++i];
			if (!args.port) fail('`--port` requires a number.');
		} else if (a.startsWith('--port=')) {
			args.port = a.slice('--port='.length);
		} else if (a === '--host') {
			args.host = argv[++i] ?? 'true';
		} else if (a.startsWith('--host=')) {
			args.host = a.slice('--host='.length);
		} else if (a === '--') {
			args.extra.push(...argv.slice(i + 1));
			break;
		} else {
			args._.push(a);
		}
	}
	return args;
}

/** `filepress import …` → @filepress/import CLI (does not need a site root). */
function runImport(argv) {
	const importCli = join(packageRoot, 'packages', 'import', 'src', 'cli.ts');
	if (!existsSync(importCli)) fail(`import CLI missing at ${importCli}`);
	if (!existsSync(join(packageRoot, 'node_modules'))) {
		fail(
			`filepress dependencies are missing at ${packageRoot}.\n` +
				`  Run \`pnpm install\` once inside the filepress repo, then retry.`
		);
	}
	const isWin = process.platform === 'win32';
	const child = spawn(
		isWin ? 'pnpm.cmd' : 'pnpm',
		['--filter', '@filepress/import', 'exec', 'tsx', importCli, ...argv],
		{ cwd: packageRoot, stdio: 'inherit', shell: isWin }
	);
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal);
		process.exit(code ?? 1);
	});
}

function listSites() {
	if (!existsSync(sitesDir)) return [];
	return readdirSync(sitesDir).filter((name) => {
		const dir = join(sitesDir, name);
		return statSync(dir).isDirectory() && existsSync(join(dir, 'filepress.config.ts'));
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

const argv = process.argv.slice(2);
if (argv[0] === 'import') {
	runImport(argv.slice(1));
} else {
	runSiteCommand(argv);
}

function runSiteCommand(argv) {
const args = parseArgs(argv);
const command = args._[0];

if (!command || !COMMANDS.has(command)) {
	fail(
		`usage:\n` +
			`  filepress <${[...COMMANDS].join('|')}> --site <name>   # monorepo\n` +
			`  filepress <${[...COMMANDS].join('|')}>                 # cwd is the site\n` +
			`  filepress <${[...COMMANDS].join('|')}> --root <path>\n` +
			`  filepress preview [--port 27777]  # serves <site>/build (default 27777)\n` +
			`  filepress dev --port <n>            # vite dev; optional fixed port\n` +
			`  filepress import --source <url> [--inspire <url>] …\n` +
			`monorepo sites: ${listSites().join(', ') || '(none)'}`
	);
}

const siteRoot = resolveSiteRoot(args);
const configPath = join(siteRoot, 'filepress.config.ts');
if (!existsSync(configPath)) {
	fail(
		`no filepress.config.ts in ${siteRoot}\n` +
			`  (monorepo: pass --site <name>; linked site: run from the site root)`
	);
}
if (!existsSync(appDir)) fail(`packages/app is missing under ${packageRoot}`);

// Ensure the engine workspace has been installed (file: link does not install it).
if (!existsSync(join(packageRoot, 'node_modules'))) {
	fail(
		`filepress dependencies are missing at ${packageRoot}.\n` +
			`  Run \`pnpm install\` once inside the filepress repo, then retry.`
	);
}

if (args.port !== null) {
	const n = Number(args.port);
	if (!Number.isInteger(n) || n < 1 || n > 65535) {
		fail(`\`--port\` must be an integer 1–65535 (got "${args.port}").`);
	}
}

const env = {
	...process.env,
	FILEPRESS_SITE_ROOT: siteRoot
};

const isWin = process.platform === 'win32';

// Preview must serve the site's own build/ — not packages/app/.svelte-kit
// (shared across sites; another agent's last build can leak onto vite preview).
if (command === 'preview') {
	const buildDir = join(siteRoot, 'build');
	if (!existsSync(join(buildDir, 'index.html'))) {
		fail(
			`no build at ${buildDir}\n` +
				`  Run \`filepress build\` first, then preview.`
		);
	}
	// Sticky default so sibling previews don't scatter across random ports.
	const port = args.port || process.env.FILEPRESS_PORT || '27777';
	console.log(`filepress: preview http://localhost:${port} → ${buildDir}`);
	const child = spawn(
		isWin ? 'pnpm.cmd' : 'pnpm',
		[
			'--filter',
			'@filepress/app',
			'exec',
			'sirv',
			buildDir,
			'--dev',
			'--port',
			String(port),
			'--host',
			args.host && args.host !== 'true' ? args.host : '127.0.0.1'
		],
		{ cwd: packageRoot, env, stdio: 'inherit', shell: isWin }
	);
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal);
		process.exit(code ?? 1);
	});
	return;
}

// Port is applied via FILEPRESS_PORT in packages/app/vite.config.ts (more
// reliable on Windows than forwarding CLI args through `pnpm run`).
if (args.port) {
	env.FILEPRESS_PORT = String(args.port);
	console.log(`filepress: ${command} on http://localhost:${args.port} (site: ${siteRoot})`);
}

const viteArgs = [];
if (args.host !== null) viteArgs.push('--host', args.host === 'true' ? 'true' : args.host);
viteArgs.push(...args.extra);

const pnpmArgs = ['--filter', '@filepress/app', 'run', command];
if (viteArgs.length && command === 'dev') {
	pnpmArgs.push('--', ...viteArgs);
}

const child = spawn(isWin ? 'pnpm.cmd' : 'pnpm', pnpmArgs, {
	cwd: packageRoot,
	env,
	stdio: 'inherit',
	shell: isWin
});

child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
}
