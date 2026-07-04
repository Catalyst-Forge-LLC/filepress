import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({
				// Fully static output: fall back to a 404 page rather than SPA routing.
				fallback: '404.html',
				strict: true
			}),

			prerender: {
				// '*' prerenders every route with no required [parameters] — including
				// the /rss.xml, /sitemap.xml, and /robots.txt endpoints. Dynamic routes
				// (posts/[slug], tags/[tag]) supply their own `entries` generators, so
				// drafts still build even though nothing links to them (D7).
				entries: ['*']
			}
		})
	]
});
