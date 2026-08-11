import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Limited chrome keys Genie may bake into `filepress.config.ts` (Q8). */
export type GenieConfigPatch = {
	lede?: string | null;
	tagline?: string | null;
	logo?: string | null;
};

const KEYS = ['lede', 'tagline', 'logo'] as const;

function upsertStringField(src: string, key: string, value: string | null | undefined): string {
	if (value === undefined) return src;
	const fieldRe = new RegExp(`(\\n\\t)${key}:\\s*(['\`"])([\\s\\S]*?)\\2,?`, 'm');
	if (value === null || value === '') {
		return src.replace(fieldRe, '');
	}
	const quoted = JSON.stringify(value);
	if (fieldRe.test(src)) {
		return src.replace(fieldRe, `$1${key}: ${quoted},`);
	}
	// Insert after defineFilepressConfig({
	return src.replace(
		/(defineFilepressConfig\(\{\s*)/,
		`$1\n\t${key}: ${quoted},`
	);
}

/** Apply a config patch to the site's `filepress.config.ts` (string fields only). */
export function applyConfigPatch(siteRoot: string, patch: GenieConfigPatch): void {
	const path = join(siteRoot, 'filepress.config.ts');
	if (!existsSync(path)) {
		throw new Error('No filepress.config.ts at site root — cannot patch config');
	}
	let src = readFileSync(path, 'utf8');
	const before = src;
	for (const key of KEYS) {
		if (key in patch) src = upsertStringField(src, key, patch[key]);
	}
	if (src !== before) writeFileSync(path, src);
}

export function readConfigPatchFile(path: string): GenieConfigPatch {
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as GenieConfigPatch;
	} catch {
		return {};
	}
}

/** Best-effort identity fields for Ollama prompts (no TS evaluate). */
export function stubIdentityFromConfig(siteRoot: string): {
	title: string;
	description: string;
	author: string;
	canonicalUrl: string;
} {
	const path = join(siteRoot, 'filepress.config.ts');
	const src = existsSync(path) ? readFileSync(path, 'utf8') : '';
	const pick = (key: string, fallback: string) => {
		const m = src.match(new RegExp(`${key}:\\s*['\`"]([^'\`"]+)['\`"]`));
		return m?.[1]?.trim() || fallback;
	};
	return {
		title: pick('title', 'Site'),
		description: pick('description', ''),
		author: pick('author', pick('title', 'Author')),
		canonicalUrl: pick('url', 'https://example.com')
	};
}
