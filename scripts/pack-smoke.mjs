#!/usr/bin/env node
// Pack getfilepress and install it into a throwaway site; fail if install or build breaks.
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
// spawnSync also used in finally to restore monorepo after prepack

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'getfilepress-pack-smoke-'));
const tgzName = 'getfilepress-0.1.0.tgz';

function run(cmd, args, cwd, { shell } = {}) {
	// Avoid shell:true with absolute paths that contain spaces (e.g. Program Files\node.exe).
	const useShell =
		shell ?? (process.platform === 'win32' && cmd !== process.execPath && !cmd.endsWith('node.exe'));
	const r = spawnSync(cmd, args, {
		cwd,
		env: process.env,
		encoding: 'utf8',
		shell: useShell
	});
	if (r.stdout) process.stdout.write(r.stdout);
	if (r.stderr) process.stderr.write(r.stderr);
	if (r.status !== 0) {
		console.error(`pack-smoke: failed: ${cmd} ${args.join(' ')}`);
		process.exit(r.status ?? 1);
	}
	return r;
}

console.log(`pack-smoke: workdir ${work}`);

try {
	run('npm', ['pack', '--pack-destination', work], repoRoot);
} finally {
	// If prepack ran but pack/postpack aborted, put the monorepo back.
	spawnSync(process.execPath, [join(repoRoot, 'scripts/postpack.mjs')], {
		cwd: repoRoot,
		stdio: 'ignore'
	});
}
const tgz = join(work, tgzName);
if (!existsSync(tgz)) {
	console.error(`pack-smoke: expected ${tgzName}`);
	process.exit(1);
}

// Extract with relative paths only (Windows tar treats "C:" as a remote host).
mkdirSync(join(work, 'extract'), { recursive: true });
run('tar', ['-xzf', tgzName, '-C', 'extract'], work);

const listing = run('tar', ['-tzf', tgzName], work);
const files = (listing.stdout || '').split(/\r?\n/).filter(Boolean);
const junk = files.filter((f) => /\/node_modules\/|\/\.vite\//.test(f));
if (junk.length) {
	console.error('pack-smoke: tarball still contains junk:\n' + junk.slice(0, 30).join('\n'));
	process.exit(1);
}

const pkgJson = JSON.parse(readFileSync(join(work, 'extract', 'package', 'package.json'), 'utf8'));
const depVals = Object.values(pkgJson.dependencies || {});
if (depVals.some((v) => String(v).startsWith('workspace:'))) {
	console.error('pack-smoke: published dependencies still use workspace:');
	process.exit(1);
}
if (pkgJson.dependencies?.['@filepress/core']) {
	console.error('pack-smoke: root must not depend on @filepress/* (embedded in files)');
	process.exit(1);
}

const site = join(work, 'site');
run(
	'node',
	[
		join(repoRoot, 'scripts/create-site.mjs'),
		'smoke',
		'--external',
		site,
		'--title',
		'Smoke',
		'--url',
		'https://smoke.example'
	],
	repoRoot
);

const siteTgz = join(site, tgzName);
copyFileSync(tgz, siteTgz);

const sitePkg = JSON.parse(readFileSync(join(site, 'package.json'), 'utf8'));
sitePkg.devDependencies = { getfilepress: `file:./${tgzName}` };
writeFileSync(join(site, 'package.json'), JSON.stringify(sitePkg, null, '\t') + '\n');

run('npm', ['install'], site);
// Some npm configs block lifecycle scripts — CLI also links, but sync helps check/build.
const post = join(site, 'node_modules', 'getfilepress', 'scripts', 'postinstall.mjs');
if (existsSync(post)) run(process.execPath, [post], site);
run('npx', ['filepress', 'build'], site);

if (!existsSync(join(site, 'build', 'index.html'))) {
	console.error('pack-smoke: build/index.html missing');
	process.exit(1);
}

console.log('pack-smoke: OK');
rmSync(work, { recursive: true, force: true });
