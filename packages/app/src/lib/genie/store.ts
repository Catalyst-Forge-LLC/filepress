import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { DesignBrief, GenieActive, GenieVersionMeta } from './types.ts';
import { applyConfigPatch, readConfigPatchFile, type GenieConfigPatch } from './config-patch.ts';

const GENIE_DIR = '.filepress-genie';

export function genieRoot(siteRoot: string): string {
	return join(siteRoot, GENIE_DIR);
}

export function versionsDir(siteRoot: string): string {
	return join(genieRoot(siteRoot), 'versions');
}

export function versionPath(siteRoot: string, id: string): string {
	return join(versionsDir(siteRoot), id);
}

function ensureGenieDirs(siteRoot: string) {
	mkdirSync(versionsDir(siteRoot), { recursive: true });
}

export function newVersionId(): string {
	const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
	return `${ts}-${randomBytes(2).toString('hex')}`;
}

export function readJson<T>(path: string, fallback: T): T {
	if (!existsSync(path)) return fallback;
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		return fallback;
	}
}

export function writeJson(path: string, data: unknown) {
	mkdirSync(join(path, '..'), { recursive: true });
	writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export function getActive(siteRoot: string): GenieActive | null {
	return readJson<GenieActive | null>(join(genieRoot(siteRoot), 'active.json'), null);
}

export function listVersions(siteRoot: string): GenieVersionMeta[] {
	ensureGenieDirs(siteRoot);
	const dir = versionsDir(siteRoot);
	if (!existsSync(dir)) return [];
	const out: GenieVersionMeta[] = [];
	for (const id of readdirSync(dir)) {
		const meta = readJson<GenieVersionMeta | null>(join(dir, id, 'meta.json'), null);
		if (meta) out.push(meta);
	}
	return out.sort((a, b) => {
		if (a.starred !== b.starred) return a.starred ? -1 : 1;
		return b.createdAt.localeCompare(a.createdAt);
	});
}

export function readVersionBrief(siteRoot: string, id: string): DesignBrief | null {
	return readJson<DesignBrief | null>(join(versionPath(siteRoot, id), 'design-brief.json'), null);
}

export function readVersionTheme(siteRoot: string, id: string): string | null {
	const p = join(versionPath(siteRoot, id), 'theme.css');
	if (!existsSync(p)) return null;
	return readFileSync(p, 'utf8');
}

export type SnapshotInput = {
	id?: string;
	label: string;
	prompt?: string;
	parentId?: string | null;
	brief: DesignBrief;
	themeCss: string;
	steers?: Array<Record<string, unknown>>;
	/** Absolute or site-relative files to copy into version images/ as basename */
	imageFiles?: Array<{ absPath: string; destName: string }>;
	attribution?: string;
	configPatch?: GenieConfigPatch;
	inspireUrls?: string[];
	llm?: { used: boolean; model: string | null; host: string | null };
};

export function writeSnapshot(siteRoot: string, input: SnapshotInput): GenieVersionMeta {
	ensureGenieDirs(siteRoot);
	const id = input.id || newVersionId();
	const dir = versionPath(siteRoot, id);
	mkdirSync(join(dir, 'images'), { recursive: true });

	const meta: GenieVersionMeta = {
		id,
		createdAt: new Date().toISOString(),
		parentId: input.parentId ?? getActive(siteRoot)?.versionId ?? null,
		label: input.label,
		starred: false,
		prompt: input.prompt || '',
		steers: input.steers || [],
		inspireUrls: input.inspireUrls || [],
		llm: input.llm || { used: false, model: null, host: null }
	};

	writeJson(join(dir, 'meta.json'), meta);
	writeJson(join(dir, 'design-brief.json'), input.brief);
	writeJson(join(dir, 'config-patch.json'), input.configPatch || {});
	writeFileSync(join(dir, 'theme.css'), input.themeCss);
	if (input.attribution) {
		writeFileSync(join(dir, 'attribution.md'), input.attribution);
	}
	for (const img of input.imageFiles || []) {
		if (!existsSync(img.absPath)) continue;
		copyFileSync(img.absPath, join(dir, 'images', img.destName));
	}
	return meta;
}

/** Copy version theme + images into the site working tree. */
export function activateVersion(siteRoot: string, versionId: string): GenieActive {
	const dir = versionPath(siteRoot, versionId);
	if (!existsSync(join(dir, 'theme.css'))) {
		throw new Error(`Unknown Genie version: ${versionId}`);
	}

	const themeCss = readFileSync(join(dir, 'theme.css'), 'utf8');
	writeFileSync(join(siteRoot, 'theme.css'), themeCss);

	const imgDir = join(dir, 'images');
	const staticImg = join(siteRoot, 'static', 'images');
	mkdirSync(staticImg, { recursive: true });
	if (existsSync(imgDir)) {
		for (const name of readdirSync(imgDir)) {
			copyFileSync(join(imgDir, name), join(staticImg, name));
		}
	}

	const attr = join(dir, 'attribution.md');
	if (existsSync(attr)) {
		mkdirSync(join(siteRoot, '.filepress-import'), { recursive: true });
		copyFileSync(attr, join(siteRoot, '.filepress-import', 'IMAGE_ATTRIBUTION.md'));
	}

	const patch = readConfigPatchFile(join(dir, 'config-patch.json'));
	if (Object.keys(patch).length > 0) {
		applyConfigPatch(siteRoot, patch);
	}

	const active: GenieActive = {
		versionId,
		activatedAt: new Date().toISOString()
	};
	writeJson(join(genieRoot(siteRoot), 'active.json'), active);
	return active;
}

export function readVersionMeta(siteRoot: string, versionId: string): GenieVersionMeta {
	const meta = readJson<GenieVersionMeta | null>(join(versionPath(siteRoot, versionId), 'meta.json'), null);
	if (!meta) throw new Error(`Unknown Genie version: ${versionId}`);
	return meta;
}

export function updateVersionMeta(
	siteRoot: string,
	versionId: string,
	patch: { label?: string; starred?: boolean }
): GenieVersionMeta {
	const meta = readVersionMeta(siteRoot, versionId);
	if (typeof patch.label === 'string') {
		const label = patch.label.trim();
		if (!label) throw new Error('label cannot be empty');
		meta.label = label.slice(0, 80);
	}
	if (typeof patch.starred === 'boolean') {
		if (versionId === 'baseline' && patch.starred === false) {
			throw new Error('Cannot unstar the baseline version');
		}
		meta.starred = patch.starred;
	}
	writeJson(join(versionPath(siteRoot, versionId), 'meta.json'), meta);
	return meta;
}

/** Copy a snapshot folder to a new id. Does not activate. */
export function duplicateVersion(siteRoot: string, sourceId: string, label?: string): GenieVersionMeta {
	const src = versionPath(siteRoot, sourceId);
	if (!existsSync(join(src, 'theme.css'))) {
		throw new Error(`Unknown Genie version: ${sourceId}`);
	}
	const source = readVersionMeta(siteRoot, sourceId);
	const id = newVersionId();
	const dest = versionPath(siteRoot, id);
	cpSync(src, dest, { recursive: true });
	const meta: GenieVersionMeta = {
		...source,
		id,
		createdAt: new Date().toISOString(),
		parentId: sourceId,
		label: (label?.trim() || `Copy of ${source.label}`).slice(0, 80),
		starred: false
	};
	writeJson(join(dest, 'meta.json'), meta);
	return meta;
}

export function deleteVersion(siteRoot: string, versionId: string) {
	if (versionId === 'baseline') {
		throw new Error('Cannot delete the baseline version');
	}
	const active = getActive(siteRoot);
	if (active?.versionId === versionId) {
		throw new Error('Cannot delete the active version — activate another first');
	}
	const dir = versionPath(siteRoot, versionId);
	if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

export function ensureBaseline(
	siteRoot: string,
	opts: { brief: DesignBrief; themeCss: string }
): GenieVersionMeta {
	ensureGenieDirs(siteRoot);
	const baselineDir = versionPath(siteRoot, 'baseline');
	if (existsSync(join(baselineDir, 'meta.json'))) {
		return readJson<GenieVersionMeta>(join(baselineDir, 'meta.json'), {
			id: 'baseline',
			createdAt: new Date().toISOString(),
			parentId: null,
			label: 'baseline',
			starred: true,
			prompt: '',
			steers: [],
			inspireUrls: [],
			llm: { used: false, model: null, host: null }
		});
	}

	// Capture current static chrome images if present
	const imageFiles: SnapshotInput['imageFiles'] = [];
	const staticImg = join(siteRoot, 'static', 'images');
	if (existsSync(staticImg)) {
		for (const name of readdirSync(staticImg)) {
			if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(name)) continue;
			imageFiles.push({ absPath: join(staticImg, name), destName: name });
		}
	}

	const meta = writeSnapshot(siteRoot, {
		id: 'baseline',
		label: 'baseline',
		prompt: 'Snapshot of working tree before Genie edits',
		parentId: null,
		brief: opts.brief,
		themeCss: opts.themeCss,
		imageFiles,
		steers: [{ type: 'baseline' }]
	});
	meta.starred = true;
	writeJson(join(baselineDir, 'meta.json'), meta);

	if (!getActive(siteRoot)) {
		writeJson(join(genieRoot(siteRoot), 'active.json'), {
			versionId: 'baseline',
			activatedAt: new Date().toISOString()
		});
	}
	return meta;
}
