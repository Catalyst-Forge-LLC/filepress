import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({
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
