import { describe, expect, it } from 'vitest';
import { formatReadingTime, readingMinutes, tagDisplayLabel } from './format';

describe('readingMinutes', () => {
	it('is at least one minute', () => {
		expect(readingMinutes('Hello world.')).toBe(1);
		expect(readingMinutes('')).toBe(1);
	});

	it('rounds to the nearest minute at 228 wpm', () => {
		const words = Array.from({ length: 228 }, () => 'word').join(' ');
		expect(readingMinutes(words)).toBe(1);
		expect(readingMinutes(`${words} ${words}`)).toBe(2);
	});
});

describe('tagDisplayLabel', () => {
	it('prefers a curated topic label', () => {
		expect(tagDisplayLabel([{ label: 'Tips & Tricks', tag: 'tips-tricks' }], 'tips-tricks')).toBe(
			'Tips & Tricks'
		);
	});

	it('title-cases a slug when no topic is set', () => {
		expect(tagDisplayLabel([], 'articles')).toBe('Articles');
		expect(tagDisplayLabel([], 'tips-tricks')).toBe('Tips Tricks');
	});
});

describe('formatReadingTime', () => {
	it('pluralizes', () => {
		expect(formatReadingTime(1)).toBe('1 min read');
		expect(formatReadingTime(4)).toBe('4 min read');
	});
});
