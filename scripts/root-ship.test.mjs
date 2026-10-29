import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	ancestorPackagePath,
	delegatesToSite,
	rootShipCommand,
	rootShipGap
} from './root-ship.mjs';

function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'filepress-root-ship-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
	return dir;
}

test('delegation matches the site directory and not a longer path', () => {
	assert.equal(delegatesToSite('pnpm --dir "site" run ship', 'site'), true);
	assert.equal(delegatesToSite('pnpm --dir site run ship', 'site'), true);
	assert.equal(delegatesToSite('pnpm --dir="sites/handbook" run ship', 'sites/handbook'), true);
	assert.equal(delegatesToSite('pnpm --dir "site" run ship && pnpm --dir "sites/other" run ship', 'site'), true);
	assert.equal(delegatesToSite('pnpm --dir "sites/handbook" run ship', 'site'), false);
	assert.equal(delegatesToSite('pnpm --dir sites/handbook run ship', 'site'), false);
	assert.equal(delegatesToSite('deploy-existing-app', 'site'), false);
});

test('a nested site with ship and no root delegation is a gap', (t) => {
	const root = fixture(t);
	const site = join(root, 'site');
	mkdirSync(site);
	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'app', scripts: { test: 'node test.mjs' } }));
	writeFileSync(join(site, 'package.json'), JSON.stringify({ scripts: { ship: 'pnpm build && wrangler pages deploy build' } }));
	const gap = rootShipGap(site);
	assert.equal(gap.ancestor, ancestorPackagePath(site));
	assert.equal(gap.expected, rootShipCommand('site'));
	assert.equal(gap.current, null);
});

test('root delegation closes the gap, including a composed command', (t) => {
	const root = fixture(t);
	const site = join(root, 'sites', 'handbook');
	mkdirSync(site, { recursive: true });
	writeFileSync(join(site, 'package.json'), JSON.stringify({ scripts: { ship: 'pnpm build' } }));
	writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { ship: 'pnpm --dir "sites/handbook" run ship' } }));
	assert.equal(rootShipGap(site), null);
	writeFileSync(
		join(root, 'package.json'),
		JSON.stringify({ scripts: { ship: 'pnpm --dir "sites/handbook" run ship && pnpm test' } })
	);
	assert.equal(rootShipGap(site), null);
});

test('a site without ship, a standalone repo, and a directory outside git are not gaps', (t) => {
	const root = fixture(t);
	const site = join(root, 'site');
	mkdirSync(site);
	writeFileSync(join(site, 'package.json'), JSON.stringify({ scripts: { build: 'filepress build' } }));
	writeFileSync(join(root, 'package.json'), '{}');
	assert.equal(rootShipGap(site), null);

	const alone = join(root, 'alone');
	mkdirSync(alone);
	execFileSync('git', ['init'], { cwd: alone, stdio: 'ignore' });
	writeFileSync(join(alone, 'package.json'), JSON.stringify({ scripts: { ship: 'pnpm build' } }));
	assert.equal(ancestorPackagePath(alone), null);
	assert.equal(rootShipGap(alone), null);

	const loose = mkdtempSync(join(tmpdir(), 'filepress-root-ship-loose-'));
	t.after(() => rmSync(loose, { recursive: true, force: true }));
	const looseSite = join(loose, 'site');
	mkdirSync(looseSite);
	writeFileSync(join(loose, 'package.json'), '{}');
	writeFileSync(join(looseSite, 'package.json'), JSON.stringify({ scripts: { ship: 'pnpm build' } }));
	assert.equal(ancestorPackagePath(looseSite), null);
	assert.equal(rootShipGap(looseSite), null);
});

test('the engine demo site has no nested ship gap', () => {
	const demo = join(dirname(fileURLToPath(import.meta.url)), '..', 'sites', 'demo');
	assert.equal(rootShipGap(demo), null);
});
