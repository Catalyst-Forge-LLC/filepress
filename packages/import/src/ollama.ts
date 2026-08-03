import type { DesignBrief, SiteIR } from './ir.ts';
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

export async function generateDesignBrief(opts: {
	host: string;
	model: string;
	ir: SiteIR;
	inspireSummaries: string[];
}): Promise<DesignBrief> {
	const host = opts.host.replace(/\/+$/, '');
	const prompt = `You are a design director helping restyle a personal Markdown blog (Downpress Essay theme).
Return ONLY a JSON object (no markdown fences) with this shape:
{
  "mood": "short phrase",
  "do": ["..."],
  "dont": ["..."],
  "tokens": {
    "accent": "#rrggbb",
    "accentStrong": "#rrggbb",
    "bg": "#rrggbb",
    "ink": "#rrggbb",
    "inkSoft": "#rrggbb"
  },
  "density": "sparse" | "balanced" | "dense",
  "cssNotes": ["..."]
}

Constraints:
- Personal essay site, NOT a multi-section marketing landing page.
- Prefer one accent; warm or cool neutrals OK; avoid purple-on-white clichés.
- dont[] must reject marketing hero cards / stat strips if inspiration was a consulting site.

Site identity:
${JSON.stringify(opts.ir.identity, null, 2)}

Nav: ${opts.ir.nav.map((n) => n.label).join(', ')}
Post count: ${opts.ir.posts.length}
Page slugs: ${opts.ir.pages.map((p) => p.slug).join(', ')}

Inspiration page summaries:
${opts.inspireSummaries.map((s, i) => `(${i + 1}) ${s}`).join('\n') || '(none)'}
`;

	const res = await fetch(`${host}/api/chat`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			model: opts.model,
			stream: false,
			format: 'json',
			options: { temperature: 0.3 },
			messages: [
				{ role: 'system', content: 'You output only valid JSON matching the requested schema.' },
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
		return parseBriefJson(content);
	} catch (e) {
		console.warn(`import: brief parse failed (${e}); using defaults`);
		return DEFAULT_BRIEF;
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
