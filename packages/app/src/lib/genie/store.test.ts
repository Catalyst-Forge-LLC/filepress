import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
	activateVersion,
	ensureBaseline,
	getActive,
	listVersions,
	writeSnapshot
} from './store.ts';

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
});
