import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defaultSecurityHeaders, writeBuildHeaders } from './headers';

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
