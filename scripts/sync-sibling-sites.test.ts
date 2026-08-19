import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { npmPinFor, parseArgs, retargetGetfilepressToNpm } from './sync-sibling-sites.ts';

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
