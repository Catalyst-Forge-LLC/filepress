import { describe, expect, it } from 'vitest';
import { shouldMountGenie } from './enabled';

describe('shouldMountGenie', () => {
	it('mounts only in the browser during Vite dev', () => {
		expect(shouldMountGenie({ browser: true, viteDev: true })).toBe(true);
	});

	it('stays off during prerender / SSR even in Vite dev', () => {
		expect(shouldMountGenie({ browser: false, viteDev: true })).toBe(false);
	});

	it('stays off in production client and prerender', () => {
		expect(shouldMountGenie({ browser: true, viteDev: false })).toBe(false);
		expect(shouldMountGenie({ browser: false, viteDev: false })).toBe(false);
	});
});
