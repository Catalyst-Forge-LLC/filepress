import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	criticalThemePlugin,
	writeCriticalThemeModule
} from './vite-plugin-critical-theme.ts';
import { geniePlugin } from './vite-plugin-genie.ts';

const appRoot = dirname(fileURLToPath(import.meta.url));
const defaultSiteRoot = resolve(appRoot, '../../sites/demo');

function resolveSiteRoot(): string {
	const raw = process.env.FILEPRESS_SITE_ROOT?.trim();
	return raw ? resolve(raw) : defaultSiteRoot;
}

const siteRoot = resolveSiteRoot();
const siteConfig = join(siteRoot, 'filepress.config.ts');
const siteStatic = join(siteRoot, 'static');
const siteBuild = join(siteRoot, 'build');
const fallbackStatic = join(appRoot, 'static');

// SvelteKit requires an assets directory to exist. Prefer the site's static/;
// fall back to packages/app/static for sites that haven't added one yet.
const assetsDir = existsSync(siteStatic) ? siteStatic : fallbackStatic;
if (!existsSync(fallbackStatic)) mkdirSync(fallbackStatic, { recursive: true });

if (!existsSync(siteConfig)) {
	throw new Error(`No filepress.config.ts at site root: ${siteConfig}`);
}

/**
 * Prefer site-root theme.css so Genie activate can overwrite a real file Vite watches.
 * Create an empty theme.css when absent (not the app stub path).
 */
function resolveSiteTheme(): string {
	const css = join(siteRoot, 'theme.css');
	if (existsSync(css)) return css;
	writeFileSync(css, '/* filepress site theme — edit freely or use Genie Mode in dev */\n');
	return css;
}

const siteTheme = resolveSiteTheme();
const filepressCache = join(siteRoot, '.filepress');
if (!existsSync(filepressCache)) mkdirSync(filepressCache, { recursive: true });
const criticalThemeOut = join(filepressCache, 'critical-theme.generated.ts');
writeCriticalThemeModule(siteTheme, criticalThemeOut);

const coreEntry = join(appRoot, '../core/src/lib/index.ts');
const coreServer = join(appRoot, '../core/src/lib/server.ts');
const coreTheme = join(appRoot, '../core/src/lib/theme.ts');

/** Optional fixed port from `filepress dev|preview --port` (via FILEPRESS_PORT). */
function resolvePort(): number | undefined {
	const raw = process.env.FILEPRESS_PORT?.trim();
	if (!raw) return undefined;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 && n <= 65535 ? n : undefined;
}

const fixedPort = resolvePort();

export default defineConfig({
	server: fixedPort
		? { port: fixedPort, strictPort: true }
		: undefined,
	preview: fixedPort
		? { port: fixedPort, strictPort: true }
		: undefined,
	// Regex aliases (exact) so npm installs don't need workspace links, and so a
	// bare `@filepress/core` string alias can't steal `/server` + `/theme`.
	resolve: {
		alias: [
			{ find: /^@filepress\/core\/server$/, replacement: coreServer },
			{ find: /^@filepress\/core\/theme$/, replacement: coreTheme },
			{ find: /^@filepress\/core$/, replacement: coreEntry }
		]
	},
	plugins: [
		criticalThemePlugin(siteTheme, criticalThemeOut),
		geniePlugin(siteRoot),
		sveltekit({
			alias: {
				// Site configs (monorepo or linked) import from `getfilepress`.
				getfilepress: coreEntry,
				'getfilepress/server': coreServer,
				'getfilepress/theme': coreTheme,
				'$site-config': siteConfig,
				// Loaded after the core Essay theme so site rules win the cascade.
				'$site-theme': siteTheme,
				// Per-site critical tokens (written under site/.filepress/).
				'$critical-theme': criticalThemeOut
			},

			// Absolute `/_app/...` asset URLs — more reliable on CDN/custom domains
			// than `./_app/...` relative links (avoids unstyled flashes on deploy).
			paths: {
				relative: false
			},

			files: {
				assets: assetsDir
			},

			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({
				pages: siteBuild,
				assets: siteBuild,
				fallback: '404.html',
				strict: true
			}),

			prerender: {
				entries: ['*'],

				// Some parameterized routes legitimately have zero pages: /page/[n]
				// when everything fits on page 1, /tags/[tag] when no listed post
				// carries a tag, and /[slug] itself when every post is still
				// draft:true (a site before its first published essay). Ignore
				// those; stay strict for any other unseen route.
				handleUnseenRoutes: ({ routes }) => {
					const emptyOk = new Set(['/page/[n]', '/tags/[tag]', '/[slug]']);
					const unexpected = routes.filter((r) => !emptyOk.has(r));
					if (unexpected.length > 0) {
						throw new Error(
							`Routes marked prerenderable but not prerendered: ${unexpected.join(', ')}`
						);
					}
				}
			}
		})
	]
});
