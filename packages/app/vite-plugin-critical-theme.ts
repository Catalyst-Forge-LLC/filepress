import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:downpress-critical-theme';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

/**
 * Extract early paint tokens from the site theme: `:root` blocks (including
 * those nested in `prefers-color-scheme` media) and top-level `body { ... }`.
 */
export function extractCriticalTheme(css: string): string {
	const chunks: string[] = [];

	for (const m of css.matchAll(/:root\s*\{[^}]*\}/g)) {
		chunks.push(m[0]);
	}

	for (const m of css.matchAll(
		/@media\s*\([^)]*prefers-color-scheme[^)]*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/g
	)) {
		chunks.push(m[0]);
	}

	for (const m of css.matchAll(/(?:^|\n)body\s*\{[^}]*\}/g)) {
		chunks.push(m[0].trim());
	}

	return chunks.join('\n');
}

/**
 * Expose site tokens as `virtual:downpress-critical-theme` for inline
 * `<svelte:head>` injection (first paint before the full stylesheet).
 */
export function criticalThemePlugin(siteThemePath: string): Plugin {
	return {
		name: 'downpress-critical-theme',
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_ID) return;
			let css = '';
			try {
				css = readFileSync(siteThemePath, 'utf8');
			} catch {
				css = '';
			}
			const critical = extractCriticalTheme(css);
			return `export default ${JSON.stringify(critical)};\n`;
		},
		handleHotUpdate({ file, server }) {
			if (file === siteThemePath || file.replace(/\\/g, '/') === siteThemePath.replace(/\\/g, '/')) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					return [mod];
				}
			}
		}
	};
}
