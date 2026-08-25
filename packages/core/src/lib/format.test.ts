import { describe, expect, it } from 'vitest';
import { formatReadingTime, readingMinutes } from './format';

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

describe('formatReadingTime', () => {
	it('pluralizes', () => {
		expect(formatReadingTime(1)).toBe('1 min read');
		expect(formatReadingTime(4)).toBe('4 min read');
	});
});
