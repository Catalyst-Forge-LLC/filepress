import { defineConfig } from 'vitest/config';

// Vitest over the pure content-parsing logic (parse.ts, rehype-figure.ts) in
// isolation. Full type-checking of the library happens via each site's
// `svelte-check`, which compiles the whole imported graph.
export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node'
	}
});
