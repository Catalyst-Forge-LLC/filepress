import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	coveredByFilesList,
	missingPublishedScriptImports,
	relativeRefsInSource
} from './published-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('published files', () => {
	it('resolves relative imports next to the importer', () => {
		expectRefs(`import { x } from './assert-no-genie.mjs';`, ['./assert-no-genie.mjs']);
		expectRefs(`join(scriptDir, 'copy-path-mounts.mjs')`, ['copy-path-mounts.mjs']);
	});

	it('treats directory files entries as covering children', () => {
		assert.equal(coveredByFilesList('packages/app/vite.config.ts', ['packages/app']), true);
		assert.equal(coveredByFilesList('scripts/assert-no-genie.mjs', ['scripts/copy-path-mounts.mjs']), false);
	});

	it('lists every relative import of a published script in package.json files', () => {
		const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
		const missing = missingPublishedScriptImports(pkg, repoRoot);
		assert.deepEqual(missing, []);
	});
});

function expectRefs(source, expected) {
	assert.deepEqual(relativeRefsInSource(source).sort(), expected.sort());
}
