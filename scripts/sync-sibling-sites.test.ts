import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	npmPinFor,
	parseArgs,
	parseGitPorcelainBranch,
	parseLeaseTable,
	parseLockedGetfilepress,
	resolveLockfileDir,
	resolveSyncTarget,
	retargetGetfilepressToNpm
} from './sync-sibling-sites.ts';

describe('parseArgs', () => {
	it('defaults to dry-run', () => {
		assert.deepEqual(parseArgs([]), {
			apply: false,
			ship: false,
			commit: true,
			only: [],
			help: false
		});
	});

	it('accepts --no-commit', () => {
		assert.equal(parseArgs(['--apply', '--no-commit']).commit, false);
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

describe('resolveSyncTarget', () => {
	it('uses npm latest when local is unpublished', () => {
		const resolved = resolveSyncTarget('0.1.8', '0.1.7');
		assert.equal(resolved.target, '0.1.7');
		assert.match(resolved.note ?? '', /not on npm yet/);
	});

	it('uses local when it matches or is behind npm', () => {
		assert.equal(resolveSyncTarget('0.1.7', '0.1.7').target, '0.1.7');
		assert.equal(resolveSyncTarget('0.1.7', '0.1.8').target, '0.1.7');
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

describe('parseGitPorcelainBranch', () => {
	it('reads ahead and behind from the -b header', () => {
		const track = parseGitPorcelainBranch('## main...origin/main [ahead 2, behind 1]\n M package.json\n');
		assert.deepEqual(track, { dirty: true, ahead: 2, behind: 1, branch: 'main' });
	});

	it('treats a matching upstream as synced and clean', () => {
		const track = parseGitPorcelainBranch('## main...origin/main\n');
		assert.deepEqual(track, { dirty: false, ahead: 0, behind: 0, branch: 'main' });
	});

	it('leaves ahead/behind null without an upstream', () => {
		const track = parseGitPorcelainBranch('## main\n');
		assert.deepEqual(track, { dirty: false, ahead: null, behind: null, branch: 'main' });
	});

	it('handles a detached HEAD', () => {
		const track = parseGitPorcelainBranch('## HEAD (no branch)\n');
		assert.deepEqual(track, { dirty: false, ahead: null, behind: null, branch: null });
	});
});

describe('parseLeaseTable', () => {
	it('maps lowercased lease names to ports', () => {
		const tsv = [
			'smellcheck-site\t5181\t127.0.0.1\talways\tskipped',
			'Catalyst-Forge\t6173\t0.0.0.0\talways\tneeds-elevation',
			''
		].join('\n');
		const leases = parseLeaseTable(tsv);
		assert.equal(leases.get('smellcheck-site'), 5181);
		assert.equal(leases.get('catalyst-forge'), 6173);
		assert.equal(leases.size, 2);
	});

	it('drops rows without a usable port', () => {
		const leases = parseLeaseTable('broken\nnoport\t\t127.0.0.1\nhuge\t99999\t127.0.0.1');
		assert.equal(leases.size, 0);
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
