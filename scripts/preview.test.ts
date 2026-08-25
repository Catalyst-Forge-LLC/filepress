import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBuildFile } from './preview.mjs';

describe('resolveBuildFile', () => {
	it('maps pretty URLs even when an empty sibling directory exists', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-preview-'));
		writeFileSync(join(root, 'index.html'), '<html></html>');
		writeFileSync(join(root, 'posts.html'), '<html>index</html>');
		mkdirSync(join(root, 'posts'));
		writeFileSync(join(root, 'posts', 'hello.html'), '<html>post</html>');
		mkdirSync(join(root, 'posts', 'hello'));
		assert.match(resolveBuildFile(root, '/') ?? '', /index\.html$/);
		assert.match(resolveBuildFile(root, '/posts') ?? '', /posts\.html$/);
		assert.match(resolveBuildFile(root, '/posts/hello') ?? '', /hello\.html$/);
		assert.equal(resolveBuildFile(root, '/missing'), null);
	});
});
