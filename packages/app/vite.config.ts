import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, createServer } from 'vite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
	criticalThemePlugin,
	writeCriticalThemeModule
} from './vite-plugin-critical-theme.ts';
import { geniePlugin } from './vite-plugin-genie.ts';
import { pathMountsPlugin } from './vite-plugin-path-mounts.ts';
import { filepressLeaseName, localberthGet } from './localberth-port.ts';
import type { PathMount } from '../core/src/lib/paths-shared.ts';
import { unexpectedUnseenPrerenderRoutes } from './src/lib/prerender-empty-ok.ts';
import { buildRedirectRules, THEME_PRESETS, type ThemePreset } from '../core/src/lib/config.ts';
import { serializeRedirects, type RedirectRule } from '../core/src/lib/redirects.ts';

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

const assetsDir = existsSync(siteStatic) ? siteStatic : fallbackStatic;
if (!existsSync(fallbackStatic)) mkdirSync(fallbackStatic, { recursive: true });

if (!existsSync(siteConfig)) {
	throw new Error(`No filepress.config.ts at site root: ${siteConfig}`);
}

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
const coreConfig = join(appRoot, '../core/src/lib/config.ts');
const coreServer = join(appRoot, '../core/src/lib/server.ts');
const coreTheme = join(appRoot, '../core/src/lib/theme.ts');

type SiteHints = {
	paths: PathMount[];
	theme: ThemePreset;
	redirects: RedirectRule[];
};

/** Load config via a short-lived Vite SSR graph (config-only getfilepress alias). */
async function loadSiteHints(): Promise<SiteHints> {
	const fallback: SiteHints = { paths: [], theme: 'essay', redirects: [] };
	const temp = await createServer({
		configFile: false,
		root: siteRoot,
		logLevel: 'silent',
		resolve: {
			alias: [
				{ find: /^getfilepress\/server$/, replacement: coreServer },
				{ find: /^getfilepress\/theme$/, replacement: coreTheme },
				// Config-only — avoid pulling Essay Svelte components into this loader.
				{ find: /^getfilepress$/, replacement: coreConfig }
			]
		},
		server: { middlewareMode: true },
		appType: 'custom',
		optimizeDeps: { noDiscovery: true, include: [] }
	});
	try {
		const mod = await temp.ssrLoadModule(pathToFileURL(siteConfig).href);
		const cfg = mod.default as {
			paths?: PathMount[];
			theme?: ThemePreset;
			homePage?: string | null;
			redirects?: RedirectRule[];
		} | null;
		const theme = cfg?.theme && THEME_PRESETS.includes(cfg.theme) ? cfg.theme : 'essay';
		return {
			paths: Array.isArray(cfg?.paths) ? cfg.paths : [],
			theme,
			redirects: buildRedirectRules({
				homePage: cfg?.homePage ?? null,
				redirects: Array.isArray(cfg?.redirects) ? cfg.redirects : []
			})
		};
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		console.warn(`filepress: could not load site config (${detail}); continuing with defaults.`);
		return fallback;
	} finally {
		await temp.close();
	}
}

function resolveSitePreset(theme: ThemePreset): string {
	const file = join(appRoot, '../core/src/lib/styles/presets', `${theme}.css`);
	return existsSync(file) ? file : join(appRoot, '../core/src/lib/styles/presets/essay.css');
}

function resolvePort(): number | undefined {
	const raw = process.env.FILEPRESS_PORT?.trim();
	if (raw) {
		const n = Number(raw);
		return Number.isInteger(n) && n > 0 && n <= 65535 ? n : undefined;
	}
	return localberthGet(filepressLeaseName(siteRoot));
}

const fixedPort = resolvePort();

export default defineConfig(async () => {
	const hints = await loadSiteHints();
	const pathMounts = hints.paths;
	const sitePreset = resolveSitePreset(hints.theme);
	writeFileSync(
		join(filepressCache, 'path-mounts.json'),
		`${JSON.stringify(pathMounts, null, '\t')}\n`
	);
	writeFileSync(join(filepressCache, 'redirects.txt'), serializeRedirects(hints.redirects));

	const host = process.env.HOST?.trim() || '127.0.0.1';
	return {
		server: fixedPort
			? { host, port: fixedPort, strictPort: true }
			: undefined,
		preview: fixedPort
			? { host, port: fixedPort, strictPort: true }
			: undefined,
		resolve: {
			alias: [
				{ find: /^@filepress\/core\/server$/, replacement: coreServer },
				{ find: /^@filepress\/core\/theme$/, replacement: coreTheme },
				{ find: /^@filepress\/core$/, replacement: coreEntry }
			]
		},
		optimizeDeps: {
			exclude: ['ollanet']
		},
		ssr: {
			external: ['ollanet']
		},
		plugins: [
			criticalThemePlugin(siteTheme, criticalThemeOut),
			geniePlugin(siteRoot),
			pathMountsPlugin({ siteRoot, mounts: pathMounts }),
			sveltekit({
				alias: {
					getfilepress: coreEntry,
					'getfilepress/server': coreServer,
					'getfilepress/theme': coreTheme,
					'$site-config': siteConfig,
					'$site-theme': siteTheme,
					'$site-preset': sitePreset,
					'$critical-theme': criticalThemeOut
				},
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
					handleHttpError: ({ path, message }) => {
						// Nav may link into `paths` mounts; those are copied after vite build.
						if (pathMounts.some((m) => path === m.url || path.startsWith(`${m.url}/`))) {
							return;
						}
						throw new Error(message);
					},
					handleUnseenRoutes: ({ routes }) => {
						const unexpected = unexpectedUnseenPrerenderRoutes(routes);
						if (unexpected.length > 0) {
							throw new Error(
								`Routes marked prerenderable but not prerendered: ${unexpected.join(', ')}`
							);
						}
					}
				}
			})
		]
	};
});
