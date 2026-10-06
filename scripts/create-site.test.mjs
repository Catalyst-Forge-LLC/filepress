import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scaffold = fileURLToPath(new URL('./create-site.mjs', import.meta.url));
function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'filepress-scaffold-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
}
function run(target, ...args) {
	return spawnSync(process.execPath, [scaffold, 'test-site', '--external', target, ...args], { encoding: 'utf8' });
}
const deploy = ['--pages-project', 'test-pages', '--production-branch', 'production'];

test('standalone Pages site carries its own build/upload command and local CLI dependency', (t) => {
	const target = join(fixture(t), 'standalone');
	const result = run(target, ...deploy);
	assert.equal(result.status, 0, result.stderr);
	const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
	assert.equal(pkg.scripts.ship, 'pnpm build && wrangler pages deploy build --project-name test-pages --branch production');
	assert.ok(pkg.devDependencies.wrangler);
	assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /does not provision a cloud project/);
});

for (const sitePath of ['site', 'sites/uxcalibur-dev']) {
	test(`nested ${sitePath} gets root delegation without losing other scripts`, (t) => {
		const root = fixture(t);
		const rootPkg = join(root, 'package.json');
		writeFileSync(rootPkg, JSON.stringify({ name: 'app', scripts: { test: 'node test.mjs' } }, null, 2));
		const result = run(join(root, sitePath), ...deploy, '--root-package', rootPkg);
		assert.equal(result.status, 0, result.stderr);
		const pkg = JSON.parse(readFileSync(rootPkg, 'utf8'));
		assert.equal(pkg.scripts.ship, `pnpm --dir "${sitePath}" run ship`);
		assert.equal(pkg.scripts.test, 'node test.mjs');
	});
}

test('conflicting app ship is preserved and scaffold makes no partial site', (t) => {
	const root = fixture(t);
	const rootPkg = join(root, 'package.json');
	const original = '{"scripts":{"ship":"deploy-existing-app"}}';
	writeFileSync(rootPkg, original);
	const target = join(root, 'site');
	const result = run(target, ...deploy, '--root-package', rootPkg);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /already has a different ship/);
	assert.equal(readFileSync(rootPkg, 'utf8'), original);
	assert.equal(existsSync(target), false);
});

test('local-only scaffold is explicit about unfinished deployment', (t) => {
	const target = join(fixture(t), 'local');
	assert.equal(run(target).status, 0);
	const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
	assert.equal(pkg.scripts.ship, undefined);
	assert.equal(pkg.devDependencies.wrangler, undefined);
	assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /Deployment is not configured/);
});

test('missing and unsafe deployment arguments fail before writing files', (t) => {
	const root = fixture(t);
	for (const args of [
		['--pages-project', 'test-pages'],
		['--production-branch', 'main'],
		['--pages-project'],
		['--pages-project', 'test-pages', '--production-branch', 'main && echo bad'],
		['--pages-project', 'bad;project', '--production-branch', 'main'],
		['--unknown', 'value']
	]) {
		const target = join(root, 'invalid');
		assert.notEqual(run(target, ...args).status, 0);
		assert.equal(existsSync(target), false);
	}
});

test('root delegation cannot edit a package outside the site ancestors', (t) => {
	const root = fixture(t);
	const other = join(root, 'other');
	mkdirSync(other);
	const rootPkg = join(other, 'package.json');
	writeFileSync(rootPkg, '{}');
	const target = join(root, 'site');
	const result = run(target, ...deploy, '--root-package', rootPkg);
	assert.notEqual(result.status, 0);
	assert.equal(readFileSync(rootPkg, 'utf8'), '{}');
	assert.equal(existsSync(target), false);
});
