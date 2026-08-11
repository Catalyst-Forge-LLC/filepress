import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { applyConfigPatch } from './config-patch.ts';

describe('applyConfigPatch', () => {
	it('inserts and updates lede/tagline/logo in filepress.config.ts', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-cfg-'));
		const path = join(root, 'filepress.config.ts');
		writeFileSync(
			path,
			`import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({
	title: 'Demo',
	url: 'https://demo.example',
	author: 'Demo'
});
`
		);

		applyConfigPatch(root, {
			lede: 'Hello lede',
			tagline: 'A tagline',
			logo: '/images/logo.svg'
		});
		let src = readFileSync(path, 'utf8');
		expect(src).toContain('lede: "Hello lede"');
		expect(src).toContain('tagline: "A tagline"');
		expect(src).toContain('logo: "/images/logo.svg"');

		applyConfigPatch(root, { lede: 'Updated' });
		src = readFileSync(path, 'utf8');
		expect(src).toContain('lede: "Updated"');
		expect(src).toContain('tagline: "A tagline"');
	});
});
