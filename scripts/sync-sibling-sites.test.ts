import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	npmPinFor,
	parseArgs,
	parseLockedGetfilepress,
	resolveLockfileDir,
	retargetGetfilepressToNpm
} from './sync-sibling-sites.ts';

describe('parseArgs', () => {
	it('defaults to dry-run', () => {
		assert.deepEqual(parseArgs([]), { apply: false, ship: false, only: [], help: false });
	});

	it('treats --ship as apply', () => {
		assert.equal(parseArgs(['--ship']).apply, true);
		assert.equal(parseArgs(['--ship']).ship, true);
	});
});

describe('retargetGetfilepressToNpm', () => {
	it('rewrites a link: pin and allows the postinstall', () => {
		const raw = `{
	"devDependencies": {
		"getfilepress": "link:../../filepress"
	}
}
`;
		const result = retargetGetfilepressToNpm(raw, '^0.1.5');
		assert.equal(result.changed, true);
		assert.equal(result.previous, 'link:../../filepress');
		const pkg = JSON.parse(result.text);
		assert.equal(pkg.devDependencies.getfilepress, '^0.1.5');
		assert.deepEqual(pkg.pnpm.onlyBuiltDependencies, ['getfilepress']);
	});

	it('keeps an existing onlyBuiltDependencies list', () => {
		const raw = `{
	"devDependencies": {
		"getfilepress": "link:../filepress"
	},
	"pnpm": {
		"onlyBuiltDependencies": ["esbuild", "workerd"]
	}
}
`;
		const pkg = JSON.parse(retargetGetfilepressToNpm(raw, '^0.1.5').text);
		assert.deepEqual(pkg.pnpm.onlyBuiltDependencies, ['esbuild', 'workerd', 'getfilepress']);
	});

	it('is a no-op when the pin is already the target', () => {
		const raw = `{
	"devDependencies": {
		"getfilepress": "^0.1.5"
	},
	"pnpm": {
		"onlyBuiltDependencies": ["getfilepress"]
	}
}
`;
		const result = retargetGetfilepressToNpm(raw, '^0.1.5');
		assert.equal(result.previous, '^0.1.5');
		assert.equal(JSON.parse(result.text).devDependencies.getfilepress, '^0.1.5');
	});
});

describe('npmPinFor', () => {
	it('uses a caret range', () => {
		assert.equal(npmPinFor('0.1.5'), '^0.1.5');
	});
});

describe('parseLockedGetfilepress', () => {
	it('reads the importer version in a v9 lockfile', () => {
		const lock = `importers:
  .:
    devDependencies:
      getfilepress:
        specifier: ^0.1.3
        version: 0.1.7(esbuild@0.28.2)
packages:
  getfilepress@0.1.6:
    resolution: {integrity: sha512-old}
`;
		assert.equal(parseLockedGetfilepress(lock, '.'), '0.1.7');
	});

	it('reads a workspace site importer in a v6 lockfile', () => {
		const lock = `importers:
  .:
    devDependencies:
      typescript:
        specifier: ^5.9.3
        version: 5.9.3
  site:
    devDependencies:
      getfilepress:
        specifier: ^0.1.7
        version: 0.1.7
packages:
`;
		assert.equal(parseLockedGetfilepress(lock, 'site'), '0.1.7');
	});
});

describe('resolveLockfileDir', () => {
	it('prefers a parent workspace lockfile over site/pnpm-lock.yaml', () => {
		const files = new Set(['/repo/site/pnpm-lock.yaml', '/repo/pnpm-lock.yaml', '/repo/pnpm-workspace.yaml']);
		assert.equal(
			resolveLockfileDir('/repo/site', '/repo', (p) => files.has(p.replace(/\\/g, '/'))),
			'/repo'
		);
	});

	it('uses the site lockfile when there is no workspace', () => {
		const files = new Set(['/repo/site/pnpm-lock.yaml']);
		assert.equal(
			resolveLockfileDir('/repo/site', '/repo', (p) => files.has(p.replace(/\\/g, '/'))),
			'/repo/site'
		);
	});
});
