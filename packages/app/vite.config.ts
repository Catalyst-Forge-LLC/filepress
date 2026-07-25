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

// SvelteKit requires an assets directory to exist. Prefer the site's static/;
// fall back to packages/app/static for sites that haven't added one yet.
const assetsDir = existsSync(siteStatic) ? siteStatic : fallbackStatic;
if (!existsSync(fallbackStatic)) mkdirSync(fallbackStatic, { recursive: true });

if (!existsSync(siteConfig)) {
	throw new Error(`No downpress.config.ts at site root: ${siteConfig}`);
}

export default defineConfig({
	plugins: [
		sveltekit({
			alias: {
				'$site-config': siteConfig
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
