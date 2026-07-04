import { defineConfig } from 'vitest/config';

// Standalone Vitest config (no SvelteKit plugin) so the pure content-parsing
// logic in src/lib/content/parse.ts can be tested in isolation without pulling
// in Vite's import.meta.glob or the full app build.
export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node'
	}
});
