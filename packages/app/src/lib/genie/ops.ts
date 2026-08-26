import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	DEFAULT_BRIEF,
	themeCssFromBrief,
	tokensFromSourceCss
} from '../../../../import/src/theme.ts';
import { formatAttributionMarkdown, searchStockImage } from '../../../../import/src/stock.ts';
import { fetchBuffer, fetchText } from '../../../../import/src/fetch.ts';
import {
	briefFromInspiration,
	extractInspirationSignals,
	type InspirationSignals
} from '../../../../import/src/inspire.ts';
import {
	assertOllamaEndpoint,
	generateDesignBrief,
	listOllamaModels,
	ollamaAvailable,
	ollamaSetupHint,
	summarizeHtmlForBrief
} from '../../../../import/src/ollama.ts';
import { scanOllamaNetwork } from '../../../../import/src/ollanet-scan.ts';
import type { DesignBrief, SiteIR } from '../../../../import/src/ir.ts';
import {
	activateVersion,
	ensureBaseline,
	getActive,
	listVersions,
	readVersionBrief,
	writeSnapshot
} from './store.ts';
import { stubIdentityFromConfig, type GenieConfigPatch } from './config-patch.ts';
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

function ollamaHost() {
	return assertOllamaEndpoint(process.env.OLLAMA_HOST?.trim() || 'http://127.0.0.1:11434');
}

function defaultOllamaModel() {
	return process.env.FILEPRESS_OLLAMA_MODEL?.trim() || 'gemma4:12b';
}

export async function health(siteRoot: string) {
	const host = ollamaHost();
	const model = defaultOllamaModel();
	const up = await ollamaAvailable(host);
	const models = up ? await listOllamaModels(host) : [];
	ensureBaselineIfNeeded(siteRoot);
	return {
		ok: true,
		mode: 'genie',
		siteRoot,
		ollama: {
			host,
			model,
			models,
			available: up,
			hint: up
				? models.length
					? `Ollama is reachable (${models.length} model${models.length === 1 ? '' : 's'}). Pick a server/model below, or tune with Finetuna: https://github.com/Catalyst-Forge-LLC/finetuna`
					: `Ollama is up but no models listed. Pull one (e.g. ollama pull ${model}) or use Finetuna: https://github.com/Catalyst-Forge-LLC/finetuna`
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

function resolveRequestHost(raw?: string) {
	return raw?.trim() ? assertOllamaEndpoint(raw) : ollamaHost();
}

/** Optional ollanet discovery (localhost / config / Tailscale; LAN only when requested). */
export async function scanOllamaHosts(opts: { lan?: boolean } = {}) {
	const result = await scanOllamaNetwork({ lan: Boolean(opts.lan) });
	return {
		...result,
		defaultHost: ollamaHost(),
		defaultModel: defaultOllamaModel()
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

export function applySteer(
	siteRoot: string,
	patch: GenieSteerPatch & { configPatch?: GenieConfigPatch }
) {
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
		steers: [{ type: 'steer', patch: patch.brief || {} }],
		configPatch: patch.configPatch
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
	const extMatch = safeBase.match(/\.(jpe?g|png|webp|gif|svg)$/i);
	let ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
	if (ext === '.jpeg') ext = '.jpg';
	const destName = `${opts.role}${ext}`;

	const staticImg = join(siteRoot, 'static', 'images');
	mkdirSync(staticImg, { recursive: true });
	writeFileSync(join(staticImg, destName), buf);

	const imagePath = `/images/${destName}`;
	return applySteer(siteRoot, {
		label: `Upload ${opts.role}`,
		prompt: `Local upload → ${opts.role}`,
		brief: { images: { [opts.role]: imagePath } },
		configPatch: opts.role === 'logo' ? { logo: imagePath } : undefined,
		activate: opts.activate !== false
	});
}

export function doActivate(siteRoot: string, versionId: string) {
	ensureBaselineIfNeeded(siteRoot);
	return activateVersion(siteRoot, versionId);
}

function assertHttpUrls(urls: string[]): string[] {
	const out: string[] = [];
	for (const raw of urls) {
		const u = raw.trim();
		if (!u) continue;
		let parsed: URL;
		try {
			parsed = new URL(u);
		} catch {
			throw new Error(`Invalid URL: ${u}`);
		}
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error(`Only http(s) inspire URLs allowed: ${u}`);
		}
		out.push(parsed.href);
	}
	if (!out.length) throw new Error('Provide 1–3 inspire URLs');
	if (out.length > 3) throw new Error('At most 3 inspire URLs');
	return out;
}

function stubSiteIr(siteRoot: string): SiteIR {
	const identity = stubIdentityFromConfig(siteRoot);
	return {
		source: { url: identity.canonicalUrl, generator: null },
		identity,
		posts: [],
		pages: [],
		nav: [],
		topics: [],
		lede: null,
		homeMarkdown: null,
		notes: [],
		assets: []
	};
}

/** Live inspire crawl → DesignBrief snapshot (optional Ollama refine). */
export async function runInspire(
	siteRoot: string,
	opts: {
		urls: string[];
		useLlm?: boolean;
		model?: string;
		host?: string;
		activate?: boolean;
		label?: string;
	}
) {
	ensureBaselineIfNeeded(siteRoot);
	const urls = assertHttpUrls(opts.urls);
	const signals: InspirationSignals[] = [];
	const summaries: string[] = [];
	const notes: string[] = [];

	for (const u of urls) {
		try {
			const sig = await extractInspirationSignals(u);
			signals.push(sig);
			const { text } = await fetchText(u);
			summaries.push(`${u}: ${summarizeHtmlForBrief(text)}`);
			notes.push(`${u} → ${sig.paletteMode}`);
		} catch (e) {
			throw new Error(
				`Inspire failed for ${u}: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	let brief = mergeBrief(loadWorkingBrief(siteRoot), briefFromInspiration(signals));
	// Prefer inspire look for chrome; keep any already-chosen image paths unless inspire cleared them
	const host = resolveRequestHost(opts.host);
	const model = (opts.model || defaultOllamaModel()).trim();
	let llm = { used: false, model: null as string | null, host: null as string | null };

	if (opts.useLlm !== false) {
		const up = await ollamaAvailable(host);
		if (up) {
			brief = await generateDesignBrief({
				host,
				model,
				ir: stubSiteIr(siteRoot),
				inspireSummaries: summaries,
				inspireSignals: signals,
				seed: brief
			});
			llm = { used: true, model, host };
		} else {
			notes.push('Ollama unavailable — used deterministic inspire brief');
		}
	}

	const themeCss = themeCssFromBrief(brief);
	const meta = writeSnapshot(siteRoot, {
		label: opts.label || `Inspire: ${urls.map((u) => new URL(u).hostname).join(', ')}`.slice(0, 72),
		prompt: urls.join('\n'),
		brief,
		themeCss,
		imageFiles: collectImageFiles(siteRoot, brief),
		inspireUrls: urls,
		llm,
		steers: [{ type: 'inspire', urls, notes }]
	});
	const active =
		opts.activate !== false ? activateVersion(siteRoot, meta.id) : getActive(siteRoot);
	return { meta, active, brief, notes, llm };
}

/** Ollama refine of the working brief from a short natural-language prompt. */
export async function refineWithOllama(
	siteRoot: string,
	opts: { prompt: string; model?: string; host?: string; activate?: boolean }
) {
	ensureBaselineIfNeeded(siteRoot);
	const prompt = opts.prompt.trim();
	if (!prompt) throw new Error('`prompt` is required');

	const host = resolveRequestHost(opts.host);
	const model = (opts.model || defaultOllamaModel()).trim();
	if (!(await ollamaAvailable(host))) {
		throw new Error(ollamaSetupHint(host));
	}

	const seed = loadWorkingBrief(siteRoot);
	const logLabel = `filepress genie: refine ${model} @ ${host}`;
	console.log(`${logLabel}: prompt “${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}”`);
	const brief = await generateDesignBrief({
		host,
		model,
		ir: stubSiteIr(siteRoot),
		inspireSummaries: [`Author steer: ${prompt}`],
		inspireSignals: [],
		seed,
		strictParse: true,
		logLabel
	});
	const themeCss = themeCssFromBrief(brief);
	const meta = writeSnapshot(siteRoot, {
		label: `Refine: ${prompt.slice(0, 40)}`,
		prompt,
		brief,
		themeCss,
		imageFiles: collectImageFiles(siteRoot, brief),
		llm: { used: true, model, host },
		steers: [{ type: 'refine', prompt }]
	});
	console.log(`${logLabel}: wrote ${meta.id}`);
	const active =
		opts.activate !== false ? activateVersion(siteRoot, meta.id) : getActive(siteRoot);
	return { meta, active, brief, llm: { used: true, model, host } };
}

/** Snapshot a config-only chrome patch (lede / tagline / logo). */
export function applyConfigOnly(
	siteRoot: string,
	opts: { patch: GenieConfigPatch; label?: string; activate?: boolean }
) {
	ensureBaselineIfNeeded(siteRoot);
	const keys = Object.keys(opts.patch).filter(
		(k) => opts.patch[k as keyof GenieConfigPatch] !== undefined
	);
	if (!keys.length) throw new Error('No config fields to patch');

	const brief = opts.patch.logo
		? mergeBrief(loadWorkingBrief(siteRoot), { images: { logo: opts.patch.logo } })
		: loadWorkingBrief(siteRoot);
	const themeCss = loadWorkingThemeCss(siteRoot, brief);
	const meta = writeSnapshot(siteRoot, {
		label: opts.label || `Config: ${keys.join(', ')}`,
		prompt: JSON.stringify(opts.patch),
		brief,
		themeCss,
		imageFiles: collectImageFiles(siteRoot, brief),
		configPatch: opts.patch,
		steers: [{ type: 'config', patch: opts.patch }]
	});
	const active =
		opts.activate !== false ? activateVersion(siteRoot, meta.id) : getActive(siteRoot);
	return { meta, active, brief };
}
