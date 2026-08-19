/**
 * Default Cloudflare Pages / Netlify `_headers` for a FilePress build.
 * A site-owned `static/_headers` wins: adapter-static copies it first, and
 * we refuse to overwrite `build/_headers`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const templatePath = join(dirname(fileURLToPath(import.meta.url)), 'default-headers.txt');

export function defaultSecurityHeaders(): string {
	return readFileSync(templatePath, 'utf8');
}

export function writeBuildHeaders(buildDir: string): 'wrote' | 'kept' {
	const dest = join(buildDir, '_headers');
	if (existsSync(dest)) return 'kept';
	writeFileSync(dest, defaultSecurityHeaders());
	return 'wrote';
}
