import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	discoverSites,
	enrollExtraSites,
	extraSitePaths,
	scanFilepressSites,
	syncCommitPaths,
	updatePlan,
	unenrollExtraSites
} from './lib.ts';

function write(path: string, text: string): void {
	mkdirSync(join(path, '..'), { recursive: true });
	writeFileSync(path, text);
}

function fixture(): { workspace: string; engine: string; cleanup: () => void } {
	const workspace = mkdtempSync(join(tmpdir(), 'fp-sib-'));
	const engine = join(workspace, 'filepress');
	mkdirSync(join(engine, 'sites', 'getfilepress'), { recursive: true });
	mkdirSync(join(engine, 'sites', 'demo'), { recursive: true });
	write(
		join(engine, 'package.json'),
		JSON.stringify({
			name: 'getfilepress',
			version: '0.1.19',
			scripts: {
				ship: 'pnpm build:www && wrangler pages deploy sites/getfilepress/build --project-name getfilepress',
				'build:www': 'pnpm filepress build --site getfilepress'
			}
		})
	);
	write(join(engine, 'sites', 'getfilepress', 'filepress.config.ts'), `url: 'https://getfilepress.com'\n`);
	write(join(engine, 'sites', 'demo', 'filepress.config.ts'), `url: 'https://demo.example'\n`);

	const blog = join(workspace, 'my-blog');
	mkdirSync(blog);
	write(
		join(blog, 'package.json'),
		JSON.stringify({
			name: 'my-blog',
			devDependencies: { getfilepress: '^0.1.19' },
			scripts: { ship: 'wrangler pages deploy build' }
		})
	);
	write(join(blog, 'filepress.config.ts'), `url: 'https://my.blog'\n`);

	const nested = join(workspace, 'clients', 'acme', 'notes');
	mkdirSync(nested, { recursive: true });
	write(
		join(nested, 'package.json'),
		JSON.stringify({ devDependencies: { getfilepress: 'link:../../../filepress' } })
	);
	write(join(nested, 'filepress.config.ts'), `url: 'https://acme.example'\n`);

	return {
		workspace,
		engine,
		cleanup: () => rmSync(workspace, { recursive: true, force: true })
	};
}

describe('discoverSites', () => {
	it('includes sibling folders and in-repo sites/', () => {
		const { workspace, engine, cleanup } = fixture();
		try {
			const sites = discoverSites({ workspace, engineRoot: engine, extras: [], ignore: new Set() });
			const names = sites.map((s) => s.name).sort();
			assert.deepEqual(names, ['demo', 'getfilepress', 'my-blog']);
			const www = sites.find((s) => s.name === 'getfilepress');
			assert.equal(www?.origin, 'in-repo');
			assert.equal(www?.pinKind, 'engine');
			assert.equal(www?.shipDir, engine);
			const demo = sites.find((s) => s.name === 'demo');
			assert.equal(demo?.shipDir, null);
			const blog = sites.find((s) => s.name === 'my-blog');
			assert.equal(blog?.origin, 'sibling');
			assert.equal(blog?.pinKind, 'npm');
		} finally {
			cleanup();
		}
	});

	it('enrolls a nested site from extras and can remove it', () => {
		const { workspace, engine, cleanup } = fixture();
		const stateDir = join(workspace, '.state');
		try {
			const nested = join(workspace, 'clients', 'acme', 'notes');
			const { added } = enrollExtraSites([nested], stateDir);
			assert.equal(added.length, 1);
			assert.equal(extraSitePaths(stateDir).length, 1);
			const sites = discoverSites({
				workspace,
				engineRoot: engine,
				extras: extraSitePaths(stateDir),
				ignore: new Set()
			});
			const notes = sites.find((s) => s.name === 'notes');
			assert.equal(notes?.origin, 'enrolled');
			assert.equal(notes?.pinKind, 'link');
			const removed = unenrollExtraSites(['notes'], sites, stateDir);
			assert.equal(removed.length, 1);
			assert.equal(extraSitePaths(stateDir).length, 0);
		} finally {
			cleanup();
		}
	});
});

describe('scanFilepressSites', () => {
	it('proposes nested sites without writing extras', () => {
		const { workspace, engine, cleanup } = fixture();
		try {
			const enrolled = discoverSites({ workspace, engineRoot: engine, extras: [], ignore: new Set() });
			const rows = scanFilepressSites(workspace, {
				workspace,
				engineRoot: engine,
				maxDepth: 3,
				enrolled
			});
			const nested = rows.find((r) => r.name === 'notes');
			assert.ok(nested);
			assert.equal(nested.enrolled, false);
			assert.equal(nested.kind, 'link');
			const www = rows.find((r) => r.name === 'getfilepress');
			assert.equal(www?.enrolled, true);
		} finally {
			cleanup();
		}
	});
});

describe('in-repo pin', () => {
	it('skips engine pin rewrite and does not stage the engine package.json', () => {
		const { workspace, engine, cleanup } = fixture();
		try {
			const sites = discoverSites({ workspace, engineRoot: engine, extras: [], ignore: new Set() });
			const www = sites.find((s) => s.name === 'getfilepress');
			assert.ok(www);
			assert.match(updatePlan(www, '0.1.19'), /in-repo/);
			assert.ok(!syncCommitPaths(www).some((p) => p.endsWith('package.json')));
		} finally {
			cleanup();
		}
	});
});
