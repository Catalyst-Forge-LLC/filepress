import { describe, expect, it } from 'vitest';
import {
	mergeRedirects,
	normalizeRedirectPath,
	parseRedirectsFile,
	redirectsFromSourceUrls,
	serializeRedirects,
	writingPostRedirects
} from './redirects';

describe('normalizeRedirectPath', () => {
	it('keeps a path and strips a trailing slash', () => {
		expect(normalizeRedirectPath('/writing/foo/')).toBe('/writing/foo');
	});

	it('takes the pathname from an absolute URL', () => {
		expect(normalizeRedirectPath('https://old.example/writing/foo/')).toBe('/writing/foo');
	});
});

describe('serialize and parse', () => {
	it('round-trips Cloudflare _redirects lines', () => {
		const text = serializeRedirects(writingPostRedirects());
		expect(text).toContain('/writing  /posts  308');
		expect(text).toContain('/writing/*  /posts/:splat  301');
		expect(parseRedirectsFile(text)).toEqual(writingPostRedirects());
	});
});

describe('mergeRedirects', () => {
	it('appends only missing rules', () => {
		const existing = '/old  /new  301\n';
		const merged = mergeRedirects(existing, [
			{ from: '/old', to: '/new', status: 301 },
			{ from: '/writing', to: '/posts', status: 308 }
		]);
		expect(merged).toBe('/old  /new  301\n/writing  /posts  308\n');
	});
});

describe('redirectsFromSourceUrls', () => {
	it('skips the origin home and duplicates', () => {
		const rules = redirectsFromSourceUrls([
			{ sourceUrl: 'https://ex.com/', destPath: '/home' },
			{ sourceUrl: 'https://ex.com/writing/a/', destPath: '/posts/a' },
			{ sourceUrl: 'https://ex.com/writing/a/', destPath: '/posts/a' }
		]);
		expect(rules).toEqual([{ from: '/writing/a', to: '/posts/a', status: 301 }]);
	});
});
