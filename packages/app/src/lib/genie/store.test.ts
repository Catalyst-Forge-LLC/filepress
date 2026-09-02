import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
	activateVersion,
	deleteVersion,
	duplicateVersion,
	ensureBaseline,
	getActive,
	listVersionRows,
	listVersions,
	updateVersionMeta,
	writeSnapshot
} from './store.ts';
import { geniePlugin, resolveGenieMount } from '../../../vite-plugin-genie.ts';

const brief = {
	mood: 'test',
	do: [],
	dont: [],
	tokens: { accent: '#111111', accentStrong: '#000000' },
	density: 'sparse' as const,
	cssNotes: []
};

function siteWithBaseline(prefix: string) {
	const root = mkdtempSync(join(tmpdir(), prefix));
	mkdirSync(join(root, 'static', 'images'), { recursive: true });
	writeFileSync(join(root, 'theme.css'), ':root { --accent: #111111; }\n');
	ensureBaseline(root, { brief, themeCss: readFileSync(join(root, 'theme.css'), 'utf8') });
	return root;
}

describe('genie store', () => {
	it('snapshots baseline, writes a version, and activates into working tree', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-genie-'));
		mkdirSync(join(root, 'static', 'images'), { recursive: true });
		writeFileSync(join(root, 'theme.css'), ':root { --accent: #111111; }\n');

		const brief = {
			mood: 'test',
			do: [],
			dont: [],
			tokens: { accent: '#111111', accentStrong: '#000000' },
			density: 'sparse' as const,
			cssNotes: []
		};

		ensureBaseline(root, { brief, themeCss: readFileSync(join(root, 'theme.css'), 'utf8') });
		expect(listVersions(root).some((v) => v.id === 'baseline')).toBe(true);

		const meta = writeSnapshot(root, {
			label: 'Blue accent',
			brief: {
				...brief,
				tokens: { accent: '#2244ff', accentStrong: '#1133cc' }
			},
			themeCss: ':root { --accent: #2244ff; }\n'
		});

		activateVersion(root, meta.id);
		expect(getActive(root)?.versionId).toBe(meta.id);
		expect(readFileSync(join(root, 'theme.css'), 'utf8')).toContain('#2244ff');
		expect(existsSync(join(root, '.filepress-genie', 'versions', meta.id, 'theme.css'))).toBe(
			true
		);
	});

	it('applies config-patch.json on activate', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-genie-cfg-'));
		mkdirSync(join(root, 'static', 'images'), { recursive: true });
		writeFileSync(join(root, 'theme.css'), ':root { --accent: #111111; }\n');
		writeFileSync(
			join(root, 'filepress.config.ts'),
			`import { defineFilepressConfig } from 'getfilepress';
export default defineFilepressConfig({
	title: 'X',
	url: 'https://x.example'
});
`
		);

		const brief = {
			mood: 'test',
			do: [],
			dont: [],
			tokens: { accent: '#111111', accentStrong: '#000000' },
			density: 'sparse' as const,
			cssNotes: []
		};
		ensureBaseline(root, { brief, themeCss: ':root{}\n' });
		const meta = writeSnapshot(root, {
			label: 'Lede patch',
			brief,
			themeCss: ':root{}\n',
			configPatch: { lede: 'From Genie', tagline: 'Tagged' }
		});
		activateVersion(root, meta.id);
		const cfg = readFileSync(join(root, 'filepress.config.ts'), 'utf8');
		expect(cfg).toContain('lede: "From Genie"');
		expect(cfg).toContain('tagline: "Tagged"');
	});

	it('stars, labels, and sorts starred versions first', () => {
		const root = siteWithBaseline('filepress-genie-meta-');
		const later = writeSnapshot(root, {
			label: 'Later look',
			brief,
			themeCss: ':root { --accent: #222222; }\n'
		});
		updateVersionMeta(root, later.id, { starred: true, label: 'Keeper' });
		const listed = listVersions(root);
		expect(listed[0].id).toBe(later.id);
		expect(listed[0].label).toBe('Keeper');
		expect(listed[0].starred).toBe(true);
		expect(() => updateVersionMeta(root, 'baseline', { starred: false })).toThrow(/unstar/);
	});

	it('duplicates a snapshot without activating it', () => {
		const root = siteWithBaseline('filepress-genie-dup-');
		writeFileSync(join(root, 'static', 'images', 'hero.png'), 'png-bytes');
		const source = writeSnapshot(root, {
			label: 'Blue',
			brief,
			themeCss: ':root { --accent: #2244ff; }\n',
			imageFiles: [{ absPath: join(root, 'static', 'images', 'hero.png'), destName: 'hero.png' }],
			attribution: 'Photo: test'
		});
		activateVersion(root, source.id);
		const copy = duplicateVersion(root, source.id);
		expect(copy.id).not.toBe(source.id);
		expect(copy.parentId).toBe(source.id);
		expect(copy.label).toBe('Copy of Blue');
		expect(copy.starred).toBe(false);
		expect(getActive(root)?.versionId).toBe(source.id);
		expect(readFileSync(join(root, '.filepress-genie', 'versions', copy.id, 'theme.css'), 'utf8')).toContain(
			'#2244ff'
		);
		expect(existsSync(join(root, '.filepress-genie', 'versions', copy.id, 'images', 'hero.png'))).toBe(
			true
		);
		expect(readFileSync(join(root, '.filepress-genie', 'versions', copy.id, 'attribution.md'), 'utf8')).toBe(
			'Photo: test'
		);
	});

	it('refuses to delete baseline or the active version, then deletes a spare', () => {
		const root = siteWithBaseline('filepress-genie-del-');
		const spare = writeSnapshot(root, {
			label: 'Spare',
			brief,
			themeCss: ':root { --accent: #333333; }\n'
		});
		expect(() => deleteVersion(root, 'baseline')).toThrow(/baseline/);
		activateVersion(root, spare.id);
		expect(() => deleteVersion(root, spare.id)).toThrow(/active/);
		activateVersion(root, 'baseline');
		deleteVersion(root, spare.id);
		expect(listVersions(root).some((v) => v.id === spare.id)).toBe(false);
	});

	it('activating baseline restores the pre-Genie theme', () => {
		const root = siteWithBaseline('filepress-genie-roll-');
		const blue = writeSnapshot(root, {
			label: 'Blue',
			brief,
			themeCss: ':root { --accent: #2244ff; }\n'
		});
		activateVersion(root, blue.id);
		expect(readFileSync(join(root, 'theme.css'), 'utf8')).toContain('#2244ff');
		activateVersion(root, 'baseline');
		expect(readFileSync(join(root, 'theme.css'), 'utf8')).toContain('#111111');
		expect(getActive(root)?.versionId).toBe('baseline');
	});

	it('lists what a version applied and the original prompt', () => {
		const root = siteWithBaseline('filepress-genie-did-');
		writeSnapshot(root, {
			label: 'Refine: Icy blue',
			prompt: 'Icy blue, but still a white/light background, think Antarctica',
			brief: {
				...brief,
				mood: 'Crisp, academic, and icy',
				paletteMode: 'light',
				hero: 'editorial',
				atmosphere: 'none',
				tokens: { accent: '#2c7bb6', accentStrong: '#1f5a8c', bg: '#f0f8ff' }
			},
			themeCss: ':root { --bg: #f0f8ff; }\n'
		});
		const icy = listVersionRows(root).find((v) => v.label.startsWith('Refine'));
		expect(icy?.prompt).toBe('Icy blue, but still a white/light background, think Antarctica');
		expect(icy?.did).toContain('Crisp, academic, and icy');
		expect(icy?.did).toContain('#f0f8ff');
		expect(icy?.did).toContain('#2c7bb6');
		expect(icy?.tokens.bg).toBe('#f0f8ff');
	});

	it('keeps the Genie plugin off the production Vite build', () => {
		expect(geniePlugin('/tmp/site').apply).toBe('serve');
	});

	it('aliases $genie-mount to the stub on vite build', () => {
		const stub = resolveGenieMount('/app', { command: 'build', mode: 'production' });
		const preview = resolveGenieMount('/app', { command: 'serve', mode: 'production' });
		const live = resolveGenieMount('/app', { command: 'serve', mode: 'development' });
		expect(stub.replace(/\\/g, '/')).toMatch(/GenieMount\.stub\.svelte$/);
		expect(preview.replace(/\\/g, '/')).toMatch(/GenieMount\.stub\.svelte$/);
		expect(live.replace(/\\/g, '/')).toMatch(/GenieHost\.svelte$/);
	});
});
