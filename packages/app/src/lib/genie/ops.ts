import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	DEFAULT_BRIEF,
	themeCssFromBrief,
	tokensFromSourceCss
} from '../../../../import/src/theme.ts';
import { formatAttributionMarkdown, searchStockImage } from '../../../../import/src/stock.ts';
import { fetchBuffer } from '../../../../import/src/fetch.ts';
import { ollamaAvailable, ollamaSetupHint } from '../../../../import/src/ollama.ts';
import type { DesignBrief } from '../../../../import/src/ir.ts';
import {
	activateVersion,
	ensureBaseline,
	getActive,
	listVersions,
	readVersionBrief,
	writeSnapshot
} from './store.ts';
import type { GenieSteerPatch } from './types.ts';

/** Build a starting brief from on-disk theme.css + optional prior genie brief. */
export function loadWorkingBrief(siteRoot: string): DesignBrief {
	const active = getActive(siteRoot);
	if (active) {
		const fromVer = readVersionBrief(siteRoot, active.versionId);
		if (fromVer) return structuredClone(fromVer) as DesignBrief;
	}
	const themePath = join(siteRoot, 'theme.css');
	const css = existsSync(themePath) ? readFileSync(themePath, 'utf8') : '';
	const tokens = tokensFromSourceCss(`<style>${css}</style>`);
	const dark = Boolean(tokens.bg && /^#0|^#1[0-9a-f]/i.test(tokens.bg));
	return {
		...DEFAULT_BRIEF,
		tokens: { ...DEFAULT_BRIEF.tokens, ...tokens },
		paletteMode: dark ? 'dark' : 'light',
		hero: dark ? 'bold' : 'editorial',
		atmosphere: dark ? 'noise' : 'none',
		navStyle: dark ? 'uppercase-tracked' : 'soft',
		elevatedCards: dark,
		density: dark ? 'balanced' : 'sparse',
		cssNotes: [...DEFAULT_BRIEF.cssNotes]
	};
}

export function loadWorkingThemeCss(siteRoot: string, brief: DesignBrief): string {
	const themePath = join(siteRoot, 'theme.css');
	if (existsSync(themePath)) return readFileSync(themePath, 'utf8');
	return themeCssFromBrief(brief);
}

export function ensureSiteThemeFile(siteRoot: string) {
	const themePath = join(siteRoot, 'theme.css');
	if (!existsSync(themePath)) {
		const brief = loadWorkingBrief(siteRoot);
		writeFileSync(themePath, themeCssFromBrief(brief));
	}
	mkdirSync(join(siteRoot, 'static', 'images'), { recursive: true });
}

function mergeBrief(base: DesignBrief, patch: Partial<DesignBrief>): DesignBrief {
	return {
		...base,
		...patch,
		tokens: { ...base.tokens, ...patch.tokens },
		fonts: patch.fonts
			? {
					serif: patch.fonts.serif ?? base.fonts?.serif ?? 'Georgia',
					sans: patch.fonts.sans ?? base.fonts?.sans ?? 'system-ui',
					mono: patch.fonts.mono ?? base.fonts?.mono ?? 'monospace',
					googleHref:
						patch.fonts.googleHref !== undefined
							? patch.fonts.googleHref
							: (base.fonts?.googleHref ?? null)
				}
			: base.fonts,
		images: { ...base.images, ...patch.images },
		do: patch.do ?? base.do,
		dont: patch.dont ?? base.dont,
		cssNotes: patch.cssNotes ?? base.cssNotes
	};
}

export function ensureBaselineIfNeeded(siteRoot: string) {
	ensureSiteThemeFile(siteRoot);
	const brief = loadWorkingBrief(siteRoot);
	const themeCss = loadWorkingThemeCss(siteRoot, brief);
	return ensureBaseline(siteRoot, { brief, themeCss });
}

export async function health(siteRoot: string) {
	const host = process.env.OLLAMA_HOST?.trim() || 'http://127.0.0.1:11434';
	const model = process.env.DOWNPRESS_OLLAMA_MODEL?.trim() || 'gemma4:12b';
	const up = await ollamaAvailable(host);
	ensureBaselineIfNeeded(siteRoot);
	return {
		ok: true,
		mode: 'genie',
		siteRoot,
		ollama: {
			host,
			model,
			available: up,
			hint: up
				? `Ollama is reachable. For a GPU-tuned named variant, try Finetuna: https://github.com/Catalyst-Forge-LLC/finetuna — then set DOWNPRESS_OLLAMA_MODEL.`
				: ollamaSetupHint(host)
		},
		active: getActive(siteRoot),
		versions: listVersions(siteRoot).map((v) => ({
			id: v.id,
			label: v.label,
			createdAt: v.createdAt,
			starred: v.starred,
			parentId: v.parentId
		})),
		brief: loadWorkingBrief(siteRoot)
	};
}

function collectImageFiles(siteRoot: string, brief: DesignBrief) {
	const imageFiles: Array<{ absPath: string; destName: string }> = [];
	for (const slot of ['hero', 'header', 'background', 'logo', 'portrait'] as const) {
		const rel = brief.images?.[slot];
		if (!rel || !rel.startsWith('/images/')) continue;
		const name = rel.slice('/images/'.length);
		const abs = join(siteRoot, 'static', 'images', name);
		if (existsSync(abs)) imageFiles.push({ absPath: abs, destName: name });
	}
	return imageFiles;
}

export function applySteer(siteRoot: string, patch: GenieSteerPatch) {
	ensureBaselineIfNeeded(siteRoot);
	const base = loadWorkingBrief(siteRoot);
	const brief = mergeBrief(base, patch.brief || {});
	const themeCss = themeCssFromBrief(brief);
	const label =
		patch.label ||
		patch.prompt?.slice(0, 48) ||
		`Steer ${new Date().toISOString().slice(11, 19)}`;

	const meta = writeSnapshot(siteRoot, {
		label,
		prompt: patch.prompt || '',
		brief,
		themeCss,
		imageFiles: collectImageFiles(siteRoot, brief),
		steers: [{ type: 'steer', patch: patch.brief || {} }]
	});

	const shouldActivate = patch.activate !== false;
	const active = shouldActivate ? activateVersion(siteRoot, meta.id) : getActive(siteRoot);
	return { meta, active, brief };
}

export async function fetchStockCover(
	siteRoot: string,
	opts: { query: string; role?: 'background' | 'hero' | 'header'; activate?: boolean }
) {
	ensureBaselineIfNeeded(siteRoot);
	const role = opts.role || 'background';
	const query = opts.query.trim() || 'abstract dark texture';
	const hit = await searchStockImage(query);
	if (!hit) {
		throw new Error(
			`No Openverse hit for “${query}”. Try a shorter query like “abstract dark texture”.`
		);
	}

	const buf = await fetchBuffer(hit.url);
	const ext = hit.url.toLowerCase().includes('.png')
		? '.png'
		: hit.url.toLowerCase().includes('.webp')
			? '.webp'
			: '.jpg';
	const destName = `${role}${ext}`;
	const staticImg = join(siteRoot, 'static', 'images');
	mkdirSync(staticImg, { recursive: true });
	writeFileSync(join(staticImg, destName), buf);

	const attribution = `# Image attribution\n\n${formatAttributionMarkdown({ [role]: hit })}\n`;
	const base = loadWorkingBrief(siteRoot);
	const brief = mergeBrief(base, { images: { ...base.images, [role]: `/images/${destName}` } });
	const themeCss = themeCssFromBrief(brief);
	const meta = writeSnapshot(siteRoot, {
		label: `Stock ${role}: ${query.slice(0, 40)}`,
		prompt: query,
		brief,
		themeCss,
		imageFiles: collectImageFiles(siteRoot, brief),
		attribution,
		steers: [{ type: 'stock', role, query, title: hit.title }]
	});
	const active =
		opts.activate !== false ? activateVersion(siteRoot, meta.id) : getActive(siteRoot);
	return { meta, active, brief, hit };
}

const MAX_UPLOAD = 5 * 1024 * 1024;

export function receiveUpload(
	siteRoot: string,
	opts: {
		role: 'hero' | 'background' | 'header' | 'logo';
		filename: string;
		dataBase64: string;
		activate?: boolean;
	}
) {
	ensureBaselineIfNeeded(siteRoot);
	const raw = opts.dataBase64.replace(/^data:[^;]+;base64,/, '');
	const buf = Buffer.from(raw, 'base64');
	if (!buf.length) throw new Error('Empty upload');
	if (buf.length > MAX_UPLOAD) throw new Error('Upload exceeds 5MB limit');

	const safeBase = opts.filename.replace(/[^\w.-]+/g, '-').slice(0, 80) || opts.role;
	const extMatch = safeBase.match(/\.(jpe?g|png|webp|gif)$/i);
	let ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
	if (ext === '.jpeg') ext = '.jpg';
	const destName = `${opts.role}${ext}`;

	const staticImg = join(siteRoot, 'static', 'images');
	mkdirSync(staticImg, { recursive: true });
	writeFileSync(join(staticImg, destName), buf);

	return applySteer(siteRoot, {
		label: `Upload ${opts.role}`,
		prompt: `Local upload → ${opts.role}`,
		brief: { images: { [opts.role]: `/images/${destName}` } },
		activate: opts.activate !== false
	});
}

export function doActivate(siteRoot: string, versionId: string) {
	ensureBaselineIfNeeded(siteRoot);
	return activateVersion(siteRoot, versionId);
}
