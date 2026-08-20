#!/usr/bin/env node
// Run the shared @filepress/app SvelteKit project against a content site.
//
// Modes:
//   Monorepo:  filepress <cmd> --site <name>     → sites/<name>/
//   Linked:    filepress <cmd>                   → process.cwd() (content-only site)
//   Explicit:  filepress <cmd> --root <path>
//
// Install:
//   Local:     "getfilepress": "link:../filepress"
//   Git:       "getfilepress": "github:Catalyst-Forge-LLC/filepress#<tag-or-sha>"
//   npm:       "getfilepress": "^0.1.0"

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
/** Install root of the filepress package (monorepo root, or linked/npm copy). */
const packageRoot = resolve(scriptDir, '..');
const appDir = join(packageRoot, 'packages', 'app');
const importDir = join(packageRoot, 'packages', 'import');
const sitesDir = join(packageRoot, 'sites');

const COMMANDS = new Set(['dev', 'build', 'preview', 'check']);

function fail(msg) {
	console.error(`filepress: ${msg}`);
	process.exit(1);
}

/** If npm skipped postinstall, still wire embedded @filepress/* packages. */
async function ensureEmbeddedLinks() {
	if (!packageRoot.split(/[/\\]/).includes('node_modules')) return;
	const corePkg = join(packageRoot, 'node_modules', '@filepress', 'core', 'package.json');
	if (existsSync(corePkg)) return;
	const mod = await import(pathToFileURL(join(scriptDir, 'link-embedded-packages.mjs')).href);
	mod.linkEmbeddedPackages(packageRoot);
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
			const next = argv[i + 1];
			if (next && !next.startsWith('-')) {
				args.host = argv[++i];
			} else {
				args.host = 'true';
			}
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

/** Resolve a package bin JS entry by walking node_modules from start dirs. */
function findPackageBin(pkgName, binName, starts = [appDir, importDir, packageRoot]) {
	for (const start of starts) {
		let dir = start;
		for (;;) {
			const pkgJsonPath = join(dir, 'node_modules', ...pkgName.split('/'), 'package.json');
			if (existsSync(pkgJsonPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
					const binField = pkg.bin;
					const binRel =
						typeof binField === 'string' ? binField : binField?.[binName];
					if (binRel) {
						const abs = join(dirname(pkgJsonPath), binRel);
						if (existsSync(abs)) return abs;
					}
				} catch {
					/* continue */
				}
			}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	return null;
}

function runNodeBin(pkgName, binName, args, { cwd, env, onSuccess } = {}) {
	const bin = findPackageBin(pkgName, binName);
	if (!bin) {
		fail(
			`cannot find \`${binName}\` from package \`${pkgName}\`.\n` +
				`  Install getfilepress dependencies (pnpm/npm install), then retry.`
		);
	}
	const child = spawn(process.execPath, [bin, ...args], {
		cwd: cwd ?? packageRoot,
		env: env ?? process.env,
		stdio: 'inherit',
		shell: false
	});
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal);
		if (code) process.exit(code ?? 1);
		if (typeof onSuccess === 'function') {
			const result = onSuccess();
			// If onSuccess returns a ChildProcess, wait for it instead of exiting now.
			if (result && typeof result.on === 'function') {
				result.on('exit', (c, s) => {
					if (s) process.kill(process.pid, s);
					process.exit(c ?? 1);
				});
				return;
			}
		}
		process.exit(0);
	});
	return child;
}

/** `filepress import …` → @filepress/import CLI (does not need a site root). */
function runImport(argv) {
	const importCli = join(importDir, 'src', 'cli.ts');
	if (!existsSync(importCli)) fail(`import CLI missing at ${importCli}`);
	runNodeBin('tsx', 'tsx', [importCli, ...argv], { cwd: packageRoot });
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
await ensureEmbeddedLinks();
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
				`  filepress dev --port <n> [--host]   # vite dev; optional fixed port / LAN\n` +
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

	if (!findPackageBin('vite', 'vite')) {
		fail(
			`filepress dependencies are missing (vite not found).\n` +
				`  If this is the engine repo: run \`pnpm install\` here, then retry.\n` +
				`  If getfilepress is an npm dependency: reinstall it in the site.`
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
	if (args.host !== null) {
		env.HOST = args.host === 'true' ? '0.0.0.0' : args.host;
	}

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
		const port = args.port || process.env.FILEPRESS_PORT || '27777';
		console.log(`filepress: preview http://localhost:${port} → ${buildDir}`);
		runNodeBin(
			'sirv-cli',
			'sirv',
			[
				buildDir,
				'--dev',
				'--port',
				String(port),
				'--host',
				args.host && args.host !== 'true' ? args.host : args.host === 'true' ? '0.0.0.0' : '127.0.0.1'
			],
			{ cwd: appDir, env }
		);
		return;
	}

	if (args.port) {
		env.FILEPRESS_PORT = String(args.port);
		console.log(`filepress: ${command} on http://localhost:${args.port} (site: ${siteRoot})`);
	}

	if (command === 'check') {
		const syncBin = findPackageBin('@sveltejs/kit', 'svelte-kit');
		if (syncBin) {
			const sync = spawn(process.execPath, [syncBin, 'sync'], {
				cwd: appDir,
				env,
				stdio: 'inherit'
			});
			sync.on('exit', (code, signal) => {
				if (signal) process.kill(process.pid, signal);
				if (code) process.exit(code);
				runNodeBin('svelte-check', 'svelte-check', ['--tsconfig', './tsconfig.json'], {
					cwd: appDir,
					env
				});
			});
			return;
		}
		runNodeBin('svelte-check', 'svelte-check', ['--tsconfig', './tsconfig.json'], {
			cwd: appDir,
			env
		});
		return;
	}

	// dev | build → vite
	const viteArgs = [command];
	if (args.host !== null) viteArgs.push('--host', args.host === 'true' ? '0.0.0.0' : args.host);
	viteArgs.push(...args.extra);
	runNodeBin('vite', 'vite', viteArgs, {
		cwd: appDir,
		env,
		onSuccess:
			command === 'build'
				? () => {
						const copyScript = join(scriptDir, 'copy-path-mounts.mjs');
						if (!existsSync(copyScript)) return;
						return spawn(process.execPath, [copyScript, siteRoot], {
							cwd: packageRoot,
							env,
							stdio: 'inherit',
							shell: false
						});
					}
				: undefined
	});
}
