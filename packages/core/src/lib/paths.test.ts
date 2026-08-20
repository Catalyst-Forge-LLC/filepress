import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
	normalizePathMounts,
	pathMountReservedSlugs,
	isPathMountHref,
	copyPathMounts,
	listPathMountHtmlUrls
} from './paths';

describe('normalizePathMounts', () => {
	it('returns [] for undefined', () => {
		expect(normalizePathMounts(undefined)).toEqual([]);
	});

	it('strips trailing slashes', () => {
		expect(normalizePathMounts([{ url: '/docs/', dir: 'a/b/' }])).toEqual([
			{ url: '/docs', dir: 'a/b' }
		]);
	});

	it('rejects absolute dirs and ..', () => {
		expect(() => normalizePathMounts([{ url: '/docs', dir: '/abs' }])).toThrow(/relative/);
		expect(() => normalizePathMounts([{ url: '/docs', dir: 'a/../b' }])).toThrow(/\.\./);
	});

	it('rejects nested url prefixes', () => {
		expect(() =>
			normalizePathMounts([
				{ url: '/docs', dir: 'a' },
				{ url: '/docs/api', dir: 'b' }
			])
		).toThrow(/nest/);
	});
});

describe('isPathMountHref', () => {
	const mounts = [{ url: '/docs', dir: 'docs/dist' }];

	it('matches the mount and nested pages', () => {
		expect(isPathMountHref('/docs', mounts)).toBe(true);
		expect(isPathMountHref('/docs/install', mounts)).toBe(true);
		expect(isPathMountHref('/docs/install?x=1', mounts)).toBe(true);
		expect(isPathMountHref('/install', mounts)).toBe(false);
		expect(isPathMountHref('https://example.com/docs', mounts)).toBe(false);
	});
});

describe('pathMountReservedSlugs', () => {
	it('returns the first url segment', () => {
		expect(pathMountReservedSlugs([{ url: '/docs', dir: 'x' }])).toEqual(['docs']);
	});
});

describe('copyPathMounts + listPathMountHtmlUrls', () => {
	it('copies a mount tree and lists html urls', () => {
		const root = mkdtempSync(join(tmpdir(), 'fp-mount-'));
		try {
			const src = join(root, 'docs', 'dist');
			mkdirSync(join(src, 'guide'), { recursive: true });
			writeFileSync(join(src, 'index.html'), '<h1>home</h1>');
			writeFileSync(join(src, 'guide', 'index.html'), '<h1>guide</h1>');
			writeFileSync(join(src, 'guide', 'install.html'), '<h1>install</h1>');

			const build = join(root, 'build');
			mkdirSync(build);
			const mounts = [{ url: '/docs', dir: 'docs/dist' }];
			copyPathMounts(root, build, mounts);

			expect(existsSync(join(build, 'docs', 'index.html'))).toBe(true);
			expect(readFileSync(join(build, 'docs', 'guide', 'install.html'), 'utf8')).toContain(
				'install'
			);

			const urls = listPathMountHtmlUrls(root, mounts);
			expect(urls).toEqual(['/docs', '/docs/guide', '/docs/guide/install']);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
