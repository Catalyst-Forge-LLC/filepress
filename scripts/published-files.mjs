/**
 * Every script listed in package.json `files` must ship its relative imports.
 * 0.1.24 published copy-path-mounts.mjs without assert-no-genie.mjs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const IMPORT_RE =
	/(?:from\s+|import\s*\(\s*)['"](\.\.?\/[^'"]+)['"]|join\(\s*scriptDir\s*,\s*['"]([^'"]+)['"]/g;

export function coveredByFilesList(rel, files) {
	const norm = rel.replace(/\\/g, '/');
	return files.some((entry) => {
		const e = entry.replace(/\\/g, '/').replace(/\/+$/, '');
		return norm === e || norm.startsWith(`${e}/`);
	});
}

export function relativeRefsInSource(source) {
	const refs = new Set();
	IMPORT_RE.lastIndex = 0;
	let m;
	while ((m = IMPORT_RE.exec(source))) {
		refs.add(m[1] || m[2]);
	}
	return [...refs];
}

/** Missing `scripts/*.mjs` (etc.) that a published script imports. */
export function missingPublishedScriptImports(pkg, repoRoot) {
	const files = Array.isArray(pkg.files) ? pkg.files : [];
	const missing = [];
	for (const entry of files) {
		if (!/^scripts\/.+\.(mjs|js|ts)$/.test(entry.replace(/\\/g, '/'))) continue;
		const abs = join(repoRoot, entry);
		if (!existsSync(abs)) {
			missing.push(`${entry} (listed in files, missing on disk)`);
			continue;
		}
		const src = readFileSync(abs, 'utf8');
		const dir = dirname(entry.replace(/\\/g, '/'));
		for (const ref of relativeRefsInSource(src)) {
			const resolved = posix.normalize(posix.join(dir, ref));
			if (!coveredByFilesList(resolved, files)) {
				missing.push(`${entry} → ${resolved}`);
			}
		}
	}
	return missing;
}
