import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DesignBrief, SiteIR } from './ir.ts';
import type { InspirationSignals } from './inspire.ts';
import { DEFAULT_BRIEF, parseBriefJson } from './theme.ts';

export type BriefIntent = 'import' | 'steer';

const BRIEF_SHAPE = `{
  "mood": "short phrase",
  "do": ["..."],
  "dont": ["..."],
  "tokens": {
    "accent": "#rrggbb",
    "accentStrong": "#rrggbb",
    "bg": "#rrggbb",
    "ink": "#rrggbb",
    "inkSoft": "#rrggbb",
    "surface": "#rrggbb",
    "rule": "#rrggbb",
    "ruleStrong": "#rrggbb"
  },
  "density": "sparse" | "balanced" | "dense",
  "paletteMode": "dark" | "light",
  "fonts": {
    "serif": "Font Name",
    "sans": "Font Name",
    "mono": "Font Name",
    "googleHref": "https://fonts.googleapis.com/css2?..." or null
  },
  "hero": "bold" | "editorial",
  "atmosphere": "noise" | "none",
  "navStyle": "uppercase-tracked" | "soft",
  "elevatedCards": true | false,
  "cssNotes": ["..."]
}`;

/** Paper / ice defaults when the author asked for light and the model still returns a cave. */
export const LIGHT_FLOOR = {
	bg: '#f3f7fb',
	surface: '#ffffff',
	ink: '#16324a',
	inkSoft: '#3d5a70',
	rule: '#c5d6e4',
	ruleStrong: '#8eafc8',
	accent: '#1a6fa8',
	accentStrong: '#0e4d7a'
};

export function paletteHintFromSteer(text: string): 'light' | 'dark' | null {
	const t = text.toLowerCase();
	const wantsLight =
		/\b(light|bright|white|snow|ice|icy|antarctica|antarctic|arctic|glacier|frost|daylight|crisp|parchment|paper)\b/.test(
			t
		);
	const wantsDark = /\b(dark|night|black|midnight|noir|charcoal|obsidian)\b/.test(t);
	if (wantsLight && !wantsDark) return 'light';
	if (wantsDark && !wantsLight) return 'dark';
	if (wantsLight) return 'light';
	if (wantsDark) return 'dark';
	return null;
}

export function hexRelativeLuminance(hex: string | undefined): number | null {
	if (!hex) return null;
	const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!m) return null;
	let h = m[1];
	if (h.length === 3) h = [...h].map((c) => `${c}${c}`).join('');
	const n = parseInt(h, 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function applyPaletteHint(brief: DesignBrief, hint: 'light' | 'dark' | null): DesignBrief {
	if (!hint) return brief;
	const tokens = { ...brief.tokens };
	if (hint === 'light') {
		const bgLum = hexRelativeLuminance(tokens.bg);
		const inkLum = hexRelativeLuminance(tokens.ink);
		if (bgLum === null || bgLum < 0.75) {
			tokens.bg = LIGHT_FLOOR.bg;
			tokens.surface = LIGHT_FLOOR.surface;
			tokens.rule = tokens.rule && (hexRelativeLuminance(tokens.rule) ?? 0) > 0.55 ? tokens.rule : LIGHT_FLOOR.rule;
			tokens.ruleStrong =
				tokens.ruleStrong && (hexRelativeLuminance(tokens.ruleStrong) ?? 0) > 0.4
					? tokens.ruleStrong
					: LIGHT_FLOOR.ruleStrong;
		}
		if (inkLum === null || inkLum > 0.45) {
			tokens.ink = LIGHT_FLOOR.ink;
			tokens.inkSoft = LIGHT_FLOOR.inkSoft;
		}
		return { ...brief, paletteMode: 'light', tokens };
	}
	return { ...brief, paletteMode: 'dark' };
}

export function buildDesignBriefPrompt(opts: {
	intent: BriefIntent;
	seed: DesignBrief;
	ir: SiteIR;
	inspireSummaries: string[];
	inspireSignals: InspirationSignals[];
	steer?: string;
}): { system: string; user: string } {
	const notes = opts.inspireSignals.flatMap((s) => s.notes).join('; ') || '(none)';
	const snippets =
		opts.inspireSummaries.map((s, i) => `(${i + 1}) ${s}`).join('\n') || '(none)';
	if (opts.intent === 'steer') {
		return {
			system:
				'You output only valid JSON. Honor the author\'s written palette. Light, ice, snow, or Antarctica means a bright page — never a black one unless they also say dark or night.',
			user: `You are restyling a filepress Essay site from the author's written direction.
The seed is only a starting point. When the direction conflicts with the seed, the direction wins.
Return ONLY JSON (no fences) with this shape:
${BRIEF_SHAPE}

Hard rules:
- Follow the author's palette. Light / bright / white / snow / ice / Antarctica / daylight → paletteMode "light", background #e8 or lighter (paper, snow, ice), dark readable ink. Do not use near-black backgrounds.
- "Cold" or "icy" is color temperature (blue, white, crisp) — not a night scene unless they also say dark/night/black.
- Dark/night/black only when the author asks for that.
- Do not invent marketing section layouts.
- Avoid purple-on-white clichés.

Author direction:
${opts.steer?.trim() || '(none)'}

Seed brief (override freely when the direction conflicts):
${JSON.stringify(opts.seed, null, 2)}

Site identity (content only — do not force its old palette):
${JSON.stringify(opts.ir.identity, null, 2)}
`
		};
	}
	return {
		system:
			'You output only valid JSON. Preserve dark inspiration palettes; do not flatten them into cream editorial.',
		user: `You are a design director restyling a personal Markdown blog (filepress Essay chrome).
The seed brief below was extracted from inspiration site CSS/fonts. Refine it — keep the punch.
Return ONLY JSON (no fences) with this shape:
${BRIEF_SHAPE}

Hard rules:
- If inspiration is dark/modern, paletteMode MUST stay "dark" with bold hero + noise + tracked nav.
- Personal essay site: do NOT invent marketing section layouts.
- Prefer inspiration fonts/colors over the source site's cream-editorial look.
- Avoid purple-on-white clichés.

Seed brief (from inspiration extraction):
${JSON.stringify(opts.seed, null, 2)}

Site identity (content only — do not force its old palette):
${JSON.stringify(opts.ir.identity, null, 2)}

Inspiration notes:
${notes}

Inspiration text snippets:
${snippets}
`
	};
}

/** Strip trailing slashes; used to compare Genie picker values with env. */
export function normalizeOllamaHost(host: string): string {
	return host.trim().replace(/\/+$/, '');
}

/** Allow only http(s) Ollama URLs (no credentials). */
export function assertOllamaEndpoint(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Ollama host is empty');
	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		throw new Error(`Invalid Ollama host "${trimmed}"`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`Ollama host must be http(s), got ${url.protocol}`);
	}
	if (url.username || url.password) {
		throw new Error('Ollama host must not include credentials');
	}
	return `${url.protocol}//${url.host}`;
}

export async function ollamaAvailable(host: string): Promise<boolean> {
	try {
		const res = await fetch(`${host.replace(/\/+$/, '')}/api/tags`, {
			signal: AbortSignal.timeout(4000)
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Model names from `GET /api/tags` (empty if unreachable). */
export async function listOllamaModels(host: string): Promise<string[]> {
	try {
		const res = await fetch(`${host.replace(/\/+$/, '')}/api/tags`, {
			signal: AbortSignal.timeout(4000)
		});
		if (!res.ok) return [];
		const data = (await res.json()) as { models?: Array<{ name?: string }> };
		return (data.models || [])
			.map((m) => (m.name || '').trim())
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
}

/** Shared copy for import + Genie Mode when Ollama is missing or unused. */
export function ollamaSetupHint(host: string): string {
	const h = host.replace(/\/+$/, '') || 'http://127.0.0.1:11434';
	return [
		`Ollama not reachable at ${h}.`,
		`Install from https://ollama.com then pull a model (e.g. ollama pull gemma4:12b).`,
		`For a GPU-tuned named variant, use Finetuna: https://github.com/Catalyst-Forge-LLC/finetuna`,
		`Then set FILEPRESS_OLLAMA_MODEL to that name (and OLLAMA_HOST if remote).`,
		`To find other Ollama boxes (Tailscale, LAN, OLLANET_HOSTS), use Genie “Scan network” or filepress import --scan (ollanet).`
	].join(' ');
}

/** Wall-clock budget for `/api/chat`. 12B first-load often exceeds 3 minutes. */
export const DEFAULT_OLLAMA_CHAT_TIMEOUT_MS = 600_000;

export function ollamaChatTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
	const raw = env.FILEPRESS_OLLAMA_TIMEOUT_MS?.trim();
	if (!raw) return DEFAULT_OLLAMA_CHAT_TIMEOUT_MS;
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 10_000) return DEFAULT_OLLAMA_CHAT_TIMEOUT_MS;
	return Math.min(n, 3_600_000);
}

export function ollamaTimeoutMessage(opts: { host: string; model: string; timeoutMs: number }): string {
	const secs = Math.round(opts.timeoutMs / 1000);
	return (
		`Ollama did not finish within ${secs}s (${opts.model} at ${opts.host}). ` +
		`The model may still be loading — check \`ollama ps\`, then retry (a warm model is much faster). ` +
		`Or raise FILEPRESS_OLLAMA_TIMEOUT_MS (milliseconds; default ${DEFAULT_OLLAMA_CHAT_TIMEOUT_MS}).`
	);
}

export function isAbortLike(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const name = 'name' in err ? String(err.name) : '';
	const msg = 'message' in err ? String(err.message) : '';
	return (
		name === 'TimeoutError' ||
		name === 'AbortError' ||
		/aborted due to timeout/i.test(msg) ||
		/The operation was aborted/i.test(msg)
	);
}

/** Append one NDJSON line from Ollama `stream: true` `/api/chat`. */
export function appendOllamaChatDelta(line: string, acc: { content: string }): void {
	const trimmed = line.trim();
	if (!trimmed) return;
	const ev = JSON.parse(trimmed) as { message?: { content?: string }; error?: string };
	if (ev.error) throw new Error(ev.error);
	if (ev.message?.content) acc.content += ev.message.content;
}

async function readOllamaChatStream(
	res: Response,
	logLabel: string,
	started: number
): Promise<string> {
	if (!res.body) throw new Error('Ollama chat returned an empty body');
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buf = '';
	const acc = { content: '' };
	let lastLog = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });
		const lines = buf.split(/\r?\n/);
		buf = lines.pop() ?? '';
		for (const line of lines) appendOllamaChatDelta(line, acc);
		const elapsed = Date.now() - started;
		if (elapsed - lastLog >= 15_000) {
			lastLog = elapsed;
			console.log(
				`${logLabel}: still generating… ${Math.round(elapsed / 1000)}s, ${acc.content.length} chars`
			);
		}
	}
	if (buf.trim()) appendOllamaChatDelta(buf, acc);
	return acc.content;
}

export async function generateDesignBrief(opts: {
	host: string;
	model: string;
	ir: SiteIR;
	inspireSummaries: string[];
	inspireSignals: InspirationSignals[];
	seed: DesignBrief;
	/** When true, unparseable model JSON fails instead of silently using the seed. */
	strictParse?: boolean;
	logLabel?: string;
	/** `steer` uses the author-direction prompt; default is the import/inspire prompt. */
	intent?: BriefIntent;
	steer?: string;
	/** Write raw + applied brief JSON here (Genie: `.filepress-genie/last-ollama.json`). */
	dumpPath?: string;
}): Promise<DesignBrief> {
	const host = opts.host.replace(/\/+$/, '');
	const timeoutMs = ollamaChatTimeoutMs();
	const started = Date.now();
	const logLabel = opts.logLabel ?? `filepress: Ollama ${opts.model} @ ${host}`;
	const intent = opts.intent ?? 'import';
	const hint = intent === 'steer' ? paletteHintFromSteer(opts.steer ?? '') : null;
	const messages = buildDesignBriefPrompt({
		intent,
		seed: opts.seed,
		ir: opts.ir,
		inspireSummaries: opts.inspireSummaries,
		inspireSignals: opts.inspireSignals,
		steer: opts.steer
	});
	console.log(`${logLabel}: starting chat (up to ${Math.round(timeoutMs / 1000)}s) intent=${intent}`);
	if (hint) console.log(`${logLabel}: author palette hint = ${hint}`);

	let content = '';
	try {
		const res = await fetch(`${host}/api/chat`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				model: opts.model,
				stream: true,
				format: 'json',
				options: { temperature: 0.35 },
				messages: [
					{ role: 'system', content: messages.system },
					{ role: 'user', content: messages.user }
				]
			}),
			signal: AbortSignal.timeout(timeoutMs)
		});

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`Ollama chat failed (${res.status}): ${body.slice(0, 400)}`);
		}

		content = await readOllamaChatStream(res, logLabel, started);
		console.log(`${logLabel}: done in ${Math.round((Date.now() - started) / 1000)}s (${content.length} chars)`);
		console.log(`${logLabel}: raw JSON\n${content}`);
	} catch (e) {
		if (isAbortLike(e)) {
			throw new Error(ollamaTimeoutMessage({ host, model: opts.model, timeoutMs }));
		}
		throw e;
	}
	try {
		const refined = parseBriefJson(content);
		// Never let the model drop fonts/googleHref from a rich seed
		let brief: DesignBrief = {
			...opts.seed,
			...refined,
			tokens: { ...opts.seed.tokens, ...refined.tokens },
			fonts: refined.fonts || opts.seed.fonts,
			paletteMode: refined.paletteMode || (intent === 'steer' ? undefined : opts.seed.paletteMode),
			hero: refined.hero || opts.seed.hero,
			atmosphere: refined.atmosphere || opts.seed.atmosphere,
			navStyle: refined.navStyle || opts.seed.navStyle,
			elevatedCards: refined.elevatedCards ?? opts.seed.elevatedCards
		};
		brief = applyPaletteHint(brief, hint);
		console.log(
			`${logLabel}: applied paletteMode=${brief.paletteMode ?? '(unset)'} bg=${brief.tokens.bg ?? '(unset)'} ink=${brief.tokens.ink ?? '(unset)'} accent=${brief.tokens.accent}`
		);
		if (opts.dumpPath) {
			mkdirSync(dirname(opts.dumpPath), { recursive: true });
			writeFileSync(
				opts.dumpPath,
				`${JSON.stringify(
					{
						intent,
						steer: opts.steer ?? null,
						hint,
						model: opts.model,
						host,
						raw: content,
						applied: {
							paletteMode: brief.paletteMode,
							tokens: brief.tokens,
							mood: brief.mood
						}
					},
					null,
					2
				)}\n`
			);
			console.log(`${logLabel}: dumped ${opts.dumpPath}`);
		}
		return brief;
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		if (opts.dumpPath && content) {
			mkdirSync(dirname(opts.dumpPath), { recursive: true });
			writeFileSync(
				opts.dumpPath,
				`${JSON.stringify({ intent, steer: opts.steer ?? null, parseError: detail, raw: content }, null, 2)}\n`
			);
			console.log(`${logLabel}: dumped unparsed response to ${opts.dumpPath}`);
		}
		if (opts.strictParse) {
			throw new Error(
				`Ollama returned a brief we could not parse (${detail}). First 200 chars: ${content.slice(0, 200)}`
			);
		}
		console.warn(`import: brief parse failed (${detail}); using seed brief`);
		return opts.seed;
	}
}

/** Short text summary of an inspiration homepage for the brief prompt. */
export function summarizeHtmlForBrief(html: string, max = 1200): string {
	const text = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text.slice(0, max);
}

export { DEFAULT_BRIEF };
