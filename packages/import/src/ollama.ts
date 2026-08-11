import type { DesignBrief, SiteIR } from './ir.ts';
import type { InspirationSignals } from './inspire.ts';
import { DEFAULT_BRIEF, parseBriefJson } from './theme.ts';

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
		`Then set FILEPRESS_OLLAMA_MODEL to that name (and OLLAMA_HOST if remote).`
	].join(' ');
}

export async function generateDesignBrief(opts: {
	host: string;
	model: string;
	ir: SiteIR;
	inspireSummaries: string[];
	inspireSignals: InspirationSignals[];
	seed: DesignBrief;
}): Promise<DesignBrief> {
	const host = opts.host.replace(/\/+$/, '');
	const prompt = `You are a design director restyling a personal Markdown blog (filepress Essay chrome).
The seed brief below was extracted from inspiration site CSS/fonts. Refine it — keep the punch.
Return ONLY JSON (no fences) with this shape:
{
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
}

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
${opts.inspireSignals.flatMap((s) => s.notes).join('; ') || '(none)'}

Inspiration text snippets:
${opts.inspireSummaries.map((s, i) => `(${i + 1}) ${s}`).join('\n') || '(none)'}
`;

	const res = await fetch(`${host}/api/chat`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			model: opts.model,
			stream: false,
			format: 'json',
			options: { temperature: 0.35 },
			messages: [
				{
					role: 'system',
					content:
						'You output only valid JSON. Preserve dark inspiration palettes; do not flatten them into cream editorial.'
				},
				{ role: 'user', content: prompt }
			]
		}),
		signal: AbortSignal.timeout(180_000)
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Ollama chat failed (${res.status}): ${body.slice(0, 400)}`);
	}

	const data = (await res.json()) as { message?: { content?: string } };
	const content = data.message?.content ?? '';
	try {
		const refined = parseBriefJson(content);
		// Never let the model drop fonts/googleHref from a rich seed
		return {
			...opts.seed,
			...refined,
			tokens: { ...opts.seed.tokens, ...refined.tokens },
			fonts: refined.fonts || opts.seed.fonts,
			paletteMode: refined.paletteMode || opts.seed.paletteMode,
			hero: refined.hero || opts.seed.hero,
			atmosphere: refined.atmosphere || opts.seed.atmosphere,
			navStyle: refined.navStyle || opts.seed.navStyle,
			elevatedCards: refined.elevatedCards ?? opts.seed.elevatedCards
		};
	} catch (e) {
		console.warn(`import: brief parse failed (${e}); using seed brief`);
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
