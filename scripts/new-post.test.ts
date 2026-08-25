import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newPostFilename, parseNewArgs, renderNewPost, writeNewPost } from './new-post.ts';

describe('parseNewArgs', () => {
	it('joins the title and reads flags', () => {
		const args = parseNewArgs(['Hello', 'world', '--draft', '--site', 'demo']);
		assert.equal(args.title, 'Hello world');
		assert.equal(args.draft, true);
		assert.equal(args.site, 'demo');
	});
});

describe('newPostFilename', () => {
	it('slugs the title after the date', () => {
		assert.deepEqual(newPostFilename('What next?', '2026-08-25'), {
			slug: 'what-next',
			filename: '2026-08-25-what-next.md'
		});
	});
});

describe('writeNewPost', () => {
	it('writes a skeleton and refuses to overwrite', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-new-'));
		writeFileSync(join(root, 'filepress.config.ts'), 'export default {}\n');
		const first = writeNewPost(root, 'A new post', {
			now: new Date('2026-08-25T12:00:00Z')
		});
		assert.equal(first.filename, '2026-08-25-a-new-post.md');
		assert.match(readFileSync(first.path, 'utf8'), /title: "A new post"/);
		assert.throws(() => writeNewPost(root, 'A new post', { now: new Date('2026-08-25T12:00:00Z') }), /already exists/);
	});

	it('can stamp a draft', () => {
		const body = renderNewPost('Drafty', '2026-08-25', true);
		assert.match(body, /draft: true/);
	});
});
