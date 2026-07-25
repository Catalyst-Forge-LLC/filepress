import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const defaultSiteRoot = resolve(appRoot, '../../sites/demo');

function resolveSiteRoot(): string {
	const raw = process.env.DOWNPRESS_SITE_ROOT?.trim();
	return raw ? resolve(raw) : defaultSiteRoot;
}

const siteRoot = resolveSiteRoot();
const siteConfig = join(siteRoot, 'downpress.config.ts');
const siteStatic = join(siteRoot, 'static');
const siteBuild = join(siteRoot, 'build');
const fallbackStatic = join(appRoot, 'static');
const emptyTheme = join(appRoot, 'src/lib/empty-theme.css');

// SvelteKit requires an assets directory to exist. Prefer the site's static/;
// fall back to packages/app/static for sites that haven't added one yet.
const assetsDir = existsSync(siteStatic) ? siteStatic : fallbackStatic;
if (!existsSync(fallbackStatic)) mkdirSync(fallbackStatic, { recursive: true });

if (!existsSync(siteConfig)) {
	throw new Error(`No downpress.config.ts at site root: ${siteConfig}`);
}

/** Optional site override: theme.css, else theme.scss, else empty stub. */
function resolveSiteTheme(): string {
	const css = join(siteRoot, 'theme.css');
	if (existsSync(css)) return css;
	const scss = join(siteRoot, 'theme.scss');
	if (existsSync(scss)) return scss;
	return emptyTheme;
}

const siteTheme = resolveSiteTheme();

const coreEntry = join(appRoot, '../core/src/lib/index.ts');
const coreServer = join(appRoot, '../core/src/lib/server.ts');
const coreTheme = join(appRoot, '../core/src/lib/theme.ts');

export default defineConfig({
	plugins: [
		sveltekit({
			alias: {
				// Site configs (monorepo or linked) import from `downpress`.
				downpress: coreEntry,
				'downpress/server': coreServer,
				'downpress/theme': coreTheme,
				'$site-config': siteConfig,
				// Loaded after the core Essay theme so site rules win the cascade.
				'$site-theme': siteTheme
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

				// The paginated /page/[n] route legitimately has zero pages on a small
				// site (everything fits on page 1). Ignore that one case; stay strict
				// for any other unseen route.
				handleUnseenRoutes: ({ routes }) => {
					const unexpected = routes.filter((r) => r !== '/page/[n]');
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
