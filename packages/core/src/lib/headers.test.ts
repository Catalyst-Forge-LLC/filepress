import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defaultSecurityHeaders, writeBuildHeaders, mergeSecurityHeaders } from './headers';

describe('defaultSecurityHeaders', () => {
	it('covers HSTS, framing, and the Pages CORS detach', () => {
		const text = defaultSecurityHeaders();
		expect(text).toContain('Strict-Transport-Security: max-age=31536000');
		expect(text).toContain("Content-Security-Policy: frame-ancestors 'none'");
		expect(text).toContain('X-Frame-Options: DENY');
		expect(text).toContain('X-Content-Type-Options: nosniff');
		expect(text).toContain('Referrer-Policy: strict-origin-when-cross-origin');
		expect(text).toContain('! Access-Control-Allow-Origin');
	});

	it('leaves includeSubDomains and preload to the site', () => {
		const text = defaultSecurityHeaders();
		expect(text).not.toMatch(/includeSubDomains/i);
		expect(text).not.toMatch(/\bpreload\b/i);
	});
});

describe('writeBuildHeaders', () => {
	it('writes the default file when build/_headers is missing', () => {
		const build = mkdtempSync(join(tmpdir(), 'fp-headers-'));
		try {
			expect(writeBuildHeaders(build)).toBe('wrote');
			expect(readFileSync(join(build, '_headers'), 'utf8')).toBe(defaultSecurityHeaders());
		} finally {
			rmSync(build, { recursive: true, force: true });
		}
	});

	it('keeps a site-provided build/_headers', () => {
		const build = mkdtempSync(join(tmpdir(), 'fp-headers-'));
		try {
			mkdirSync(build, { recursive: true });
			writeFileSync(join(build, '_headers'), '/*\n  X-Frame-Options: SAMEORIGIN\n');
			expect(writeBuildHeaders(build)).toBe('kept');
			expect(readFileSync(join(build, '_headers'), 'utf8')).toContain('SAMEORIGIN');
		} finally {
			rmSync(build, { recursive: true, force: true });
		}
	});
});

describe('mergeSecurityHeaders', () => {
	it('appends a /* security block after cache-only rules', () => {
		const existing =
			'# Long-cache hashed SvelteKit assets\n/_app/immutable/*\n  Cache-Control: public, max-age=31536000, immutable\n';
		const result = mergeSecurityHeaders(existing);
		expect(result.changed).toBe(true);
		expect(result.added).toContain('strict-transport-security');
		expect(result.added).toContain('access-control-allow-origin');
		expect(result.text).toContain('/_app/immutable/*');
		expect(result.text).toContain('Cache-Control: public, max-age=31536000, immutable');
		expect(result.text).toContain("Content-Security-Policy: frame-ancestors 'none'");
		expect(result.text).toMatch(/\/_app\/immutable\/\*[\s\S]*\n\/\*\n/);
	});

	it('fills missing rules on an existing /* block and keeps site values', () => {
		const existing = '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n';
		const result = mergeSecurityHeaders(existing);
		expect(result.changed).toBe(true);
		expect(result.added).toEqual(
			expect.arrayContaining([
				'strict-transport-security',
				'content-security-policy',
				'x-frame-options',
				'access-control-allow-origin'
			])
		);
		expect(result.added).not.toContain('x-content-type-options');
		expect(result.added).not.toContain('referrer-policy');
		expect(result.text).toMatch(/X-Content-Type-Options: nosniff/);
	});

	it('does not detach CORS when the site already sets Access-Control-Allow-Origin', () => {
		const existing = '/*\n  Access-Control-Allow-Origin: https://example.com\n';
		const result = mergeSecurityHeaders(existing);
		expect(result.text).toContain('Access-Control-Allow-Origin: https://example.com');
		expect(result.text).not.toContain('! Access-Control-Allow-Origin');
		expect(result.added).not.toContain('access-control-allow-origin');
	});

	it('is a no-op when the defaults are already present', () => {
		const result = mergeSecurityHeaders(defaultSecurityHeaders());
		expect(result.changed).toBe(false);
		expect(result.added).toEqual([]);
	});
});
