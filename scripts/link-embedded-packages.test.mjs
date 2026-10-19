import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { linkEmbeddedPackages } from './link-embedded-packages.mjs';

test('replaces a dangling junction instead of leaving EEXIST', () => {
	const root = mkdtempSync(join(tmpdir(), 'filepress-link-'));
	const target = join(root, 'packages', 'core');
	mkdirSync(target, { recursive: true });
	mkdirSync(join(root, 'packages', 'app'), { recursive: true });
	mkdirSync(join(root, 'packages', 'import'), { recursive: true });
	const link = join(root, 'node_modules', '@filepress', 'core');
	mkdirSync(join(root, 'node_modules', '@filepress'), { recursive: true });
	const kind = process.platform === 'win32' ? 'junction' : 'dir';
	symlinkSync(join(root, 'missing', 'core'), link, kind);
	assert.equal(lstatSync(link).isSymbolicLink(), true);

	const linked = linkEmbeddedPackages(root);
	assert.equal(linked, 3);
	assert.equal(realpathSync(link), realpathSync(target));
	rmSync(root, { recursive: true, force: true });
});
