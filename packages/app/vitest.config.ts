import { defineConfig } from 'vitest/config';

/** Isolated from vite.config.ts so Genie plugin deps don't load for unit tests. */
export default defineConfig({
	test: {
		include: ['src/lib/genie/**/*.test.ts']
	}
});
