import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from './html-to-md.ts';

describe('htmlToMarkdown', () => {
	it('converts headings and paragraphs', () => {
		const md = htmlToMarkdown('<h2>Hello</h2><p>World <strong>bold</strong></p>');
		expect(md).toContain('## Hello');
		expect(md).toContain('**bold**');
	});

	it('strips scripts', () => {
		const md = htmlToMarkdown('<p>Safe</p><script>alert(1)</script>');
		expect(md).toBe('Safe');
		expect(md).not.toContain('alert');
	});
});
