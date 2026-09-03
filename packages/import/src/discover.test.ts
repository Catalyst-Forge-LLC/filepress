import { describe, expect, it } from 'vitest';
import { classify } from './discover.ts';

const origin = 'https://acmegeek.com';

describe('classify', () => {
	it('treats WordPress date permalinks as posts', () => {
		expect(classify('https://acmegeek.com/2024/03/05/cognition-is-all-you-need/', origin)).toBe(
			'post'
		);
	});

	it('treats category archives as tags, not posts', () => {
		expect(classify('https://acmegeek.com/category/recommendations/', origin)).toBe('tag');
		expect(classify('https://acmegeek.com/tag/foo/', origin)).toBe('tag');
	});

	it('ignores wp-content and wp-json', () => {
		expect(classify('https://acmegeek.com/wp-content/uploads/2020/02/logo.png', origin)).toBe(
			'other'
		);
		expect(classify('https://acmegeek.com/wp-json/wp/v2/posts', origin)).toBe('other');
	});
});
