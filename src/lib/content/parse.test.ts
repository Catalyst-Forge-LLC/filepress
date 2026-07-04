import { describe, it, expect } from 'vitest';
import {
	ContentError,
	assertUniqueSlugs,
	assertValidDate,
	filenameOf,
	normalizeTag,
	parsePost,
	slugify
} from './parse';
import type { PostSource } from './types';

const frontmatter = (fields: string, body = 'Body text.') => `---\n${fields}\n---\n${body}\n`;

describe('slugify', () => {
	it('lowercases, trims, and hyphenates whitespace/underscores', () => {
		expect(slugify('  Hello World  ')).toBe('hello-world');
		expect(slugify('snake_case_title')).toBe('snake-case-title');
		expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
	});

	it('strips punctuation and collapses repeated hyphens', () => {
		expect(slugify('What?! Really...')).toBe('what-really');
		expect(slugify('a---b')).toBe('a-b');
		expect(slugify('--edge--')).toBe('edge');
	});

	it('keeps accented Unicode letters but drops emoji', () => {
		expect(slugify('Café Déjà Vu')).toBe('café-déjà-vu');
		expect(slugify('Launch 🚀 day')).toBe('launch-day');
	});
});

describe('normalizeTag', () => {
	it('trims and lowercases', () => {
		expect(normalizeTag('  SvelteKit ')).toBe('sveltekit');
		expect(normalizeTag('NOTES')).toBe('notes');
	});
});

describe('filenameOf', () => {
	it('extracts the base name without directory or extension', () => {
		expect(filenameOf('/posts/hello-world.md')).toBe('hello-world');
		expect(filenameOf('/posts/nested/deep.md')).toBe('deep');
	});
});

describe('assertValidDate', () => {
	it('accepts strict YYYY-MM-DD', () => {
		expect(assertValidDate('2026-07-04', 'date', 'f.md')).toBe('2026-07-04');
	});

	it('rejects non-ISO formats', () => {
		expect(() => assertValidDate('07/04/2026', 'date', 'f.md')).toThrow(ContentError);
		expect(() => assertValidDate('2026-7-4', 'date', 'f.md')).toThrow(/strictly YYYY-MM-DD/);
	});

	it('rejects impossible calendar dates', () => {
		expect(() => assertValidDate('2026-13-01', 'date', 'f.md')).toThrow(/not a real calendar date/);
		expect(() => assertValidDate('2026-02-30', 'date', 'f.md')).toThrow(/not a real calendar date/);
	});
});

describe('parsePost', () => {
	it('parses a valid post and normalizes fields', () => {
		const post = parsePost(
			'/posts/my-post.md',
			frontmatter('title: "My Post"\ndate: 2026-07-04\ntags: [Notes, notes, SvelteKit]')
		);
		expect(post.slug).toBe('my-post');
		expect(post.title).toBe('My Post');
		expect(post.date).toBe('2026-07-04');
		expect(post.tags).toEqual(['notes', 'sveltekit']); // deduped + lowercased
		expect(post.draft).toBe(false);
		expect(post.description).toBeNull();
		expect(post.body.trim()).toBe('Body text.');
	});

	it('derives the slug from the filename when not given', () => {
		const post = parsePost('/posts/A Fine Title.md', frontmatter('title: X\ndate: 2026-01-01'));
		expect(post.slug).toBe('a-fine-title');
	});

	it('prefers an explicit slug over the filename', () => {
		const post = parsePost(
			'/posts/whatever.md',
			frontmatter('title: X\ndate: 2026-01-01\nslug: custom-slug')
		);
		expect(post.slug).toBe('custom-slug');
	});

	it('reads description, falling back to excerpt', () => {
		const withDesc = parsePost(
			'/posts/a.md',
			frontmatter('title: X\ndate: 2026-01-01\ndescription: Hello')
		);
		expect(withDesc.description).toBe('Hello');
		const withExcerpt = parsePost(
			'/posts/b.md',
			frontmatter('title: X\ndate: 2026-01-01\nexcerpt: From excerpt')
		);
		expect(withExcerpt.description).toBe('From excerpt');
	});

	it('normalizes an unquoted YAML date (Date object) to YYYY-MM-DD', () => {
		const post = parsePost('/posts/a.md', frontmatter('title: X\ndate: 2026-03-09'));
		expect(post.date).toBe('2026-03-09');
	});

	it('tolerates trailing whitespace after the closing delimiter', () => {
		const raw = '---\ntitle: X\ndate: 2026-01-01\n---   \n\nBody.\n';
		const post = parsePost('/posts/a.md', raw);
		expect(post.title).toBe('X');
	});

	it('fails loudly, naming the file, when title is missing', () => {
		expect(() => parsePost('/posts/no-title.md', frontmatter('date: 2026-01-01'))).toThrow(
			/\/posts\/no-title\.md: missing required frontmatter field `title`/
		);
	});

	it('fails loudly, naming the file, when date is missing', () => {
		expect(() => parsePost('/posts/no-date.md', frontmatter('title: X'))).toThrow(
			/`date`/
		);
	});

	it('rejects a non-list tags field', () => {
		expect(() =>
			parsePost('/posts/a.md', frontmatter('title: X\ndate: 2026-01-01\ntags: notes'))
		).toThrow(/`tags` must be a YAML list/);
	});

	it('treats draft: true as a draft, other values as not', () => {
		const draft = parsePost('/posts/a.md', frontmatter('title: X\ndate: 2026-01-01\ndraft: true'));
		expect(draft.draft).toBe(true);
		const notDraft = parsePost(
			'/posts/b.md',
			frontmatter('title: X\ndate: 2026-01-01\ndraft: false')
		);
		expect(notDraft.draft).toBe(false);
	});
});

describe('assertUniqueSlugs', () => {
	const make = (slug: string, sourcePath: string): PostSource => ({
		slug,
		title: 't',
		date: '2026-01-01',
		updated: null,
		description: null,
		tags: [],
		draft: false,
		sourcePath,
		body: ''
	});

	it('passes when all slugs are unique', () => {
		expect(() => assertUniqueSlugs([make('a', '/posts/a.md'), make('b', '/posts/b.md')])).not.toThrow();
	});

	it('fails naming both colliding files', () => {
		expect(() =>
			assertUniqueSlugs([make('dup', '/posts/one.md'), make('dup', '/posts/two.md')])
		).toThrow(/\/posts\/one\.md and \/posts\/two\.md/);
	});
});
