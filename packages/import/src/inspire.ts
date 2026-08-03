import { fetchText, resolveUrl } from './fetch.ts';
import type { DesignBrief } from './ir.ts';

export type InspirationSignals = {
	url: string;
	/** Raw Google Fonts stylesheet hrefs. */
	googleFontHrefs: string[];
	fontSerif: string | null;
	fontSans: string | null;
	fontMono: string | null;
	tokens: Partial<DesignBrief['tokens']> & {
		surface?: string;
		rule?: string;
		ruleStrong?: string;
		accentWash?: string;
	};
	paletteMode: 'dark' | 'light';
	hasNoise: boolean;
	notes: string[];
};

function luminance(hex: string): number {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	if (full.length !== 6) return 0.5;
	const n = parseInt(full, 16);
	const r = ((n >> 16) & 255) / 255;
	const g = ((n >> 8) & 255) / 255;
	const b = (n & 255) / 255;
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function collectCssVars(css: string): Map<string, string> {
	const vars = new Map<string, string>();
	for (const block of css.matchAll(/:root\s*\{([^}]+)\}/g)) {
		for (const hit of block[1].matchAll(/--([a-zA-Z0-9-_]+)\s*:\s*([^;}]+)/g)) {
			vars.set(hit[1], hit[2].trim());
		}
	}
	return vars;
}

function resolveVar(vars: Map<string, string>, name: string, depth = 0): string | undefined {
	if (depth > 6) return undefined;
	const raw = vars.get(name);
	if (!raw) return undefined;
	const ref = raw.match(/^var\(\s*--([a-zA-Z0-9-_]+)\s*\)$/);
	if (ref) return resolveVar(vars, ref[1], depth + 1);
	return raw;
}

function firstHex(vars: Map<string, string>, ...names: string[]): string | undefined {
	for (const n of names) {
		const v = resolveVar(vars, n);
		if (!v) continue;
		const hex = v.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
		if (hex) return hex[0];
	}
	return undefined;
}

function parseGoogleFonts(href: string): { serif?: string; sans?: string; mono?: string } {
	try {
		const u = new URL(href);
		const family = u.searchParams.get('family') || '';
		const names = family.split('|').map((p) => decodeURIComponent(p.split(':')[0].replace(/\+/g, ' ')));
		const out: { serif?: string; sans?: string; mono?: string } = {};
		for (const name of names) {
			const lower = name.toLowerCase();
			if (!out.serif && /serif|fraunces|newsreader|instrument|display|playfair|libre/.test(lower)) {
				out.serif = name;
			} else if (!out.mono && /mono|jetbrains|fira code|source code/.test(lower)) {
				out.mono = name;
			} else if (!out.sans && /sans|inter|dm sans|sen|geist|helvetica|work sans/.test(lower)) {
				out.sans = name;
			} else if (!out.sans) {
				out.sans = name;
			} else if (!out.serif) {
				out.serif = name;
			}
		}
		return out;
	} catch {
		return {};
	}
}

async function fetchLinkedStylesheets(html: string, pageUrl: string, limit = 4): Promise<string> {
	const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
		.map((m) => {
			const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
			return href ? resolveUrl(pageUrl, href) : null;
		})
		.filter((u): u is string => Boolean(u))
		.slice(0, limit);

	const chunks: string[] = [];
	for (const href of hrefs) {
		try {
			const { status, text } = await fetchText(href);
			if (status < 400 && text.length < 800_000) chunks.push(text);
		} catch {
			/* skip */
		}
	}
	return chunks.join('\n');
}

/** Pull fonts + palette + atmosphere cues from an inspiration homepage. */
export async function extractInspirationSignals(url: string): Promise<InspirationSignals> {
	const { text: html, url: finalUrl } = await fetchText(url);
	const notes: string[] = [];
	const googleFontHrefs = [...html.matchAll(/href=["'](https:\/\/fonts\.googleapis\.com\/css2\?[^"']+)["']/gi)].map(
		(m) => m[1]
	);

	let fontSerif: string | null = null;
	let fontSans: string | null = null;
	let fontMono: string | null = null;
	for (const href of googleFontHrefs) {
		const parsed = parseGoogleFonts(href);
		fontSerif ||= parsed.serif ?? null;
		fontSans ||= parsed.sans ?? null;
		fontMono ||= parsed.mono ?? null;
	}

	const css = `${html}\n${await fetchLinkedStylesheets(html, finalUrl)}`;
	const vars = collectCssVars(css);

	const bg = firstHex(vars, 'bg', 'background', 'bg-color', 'color-bg');
	const ink = firstHex(vars, 'text', 'ink', 'text-color', 'color-text', 'foreground');
	const accent = firstHex(vars, 'accent', 'accent-color', 'color-accent', 'primary');
	const accentStrong = firstHex(vars, 'accent-dim', 'accent-strong', 'hot', 'color-hot') || accent;
	const surface = firstHex(vars, 'surface', 'bg-card', 'bg-elevated', 'color-surface');
	const rule = firstHex(vars, 'border', 'rule', 'color-border');
	const ruleStrong = firstHex(vars, 'border-glow', 'rule-strong');
	const inkSoft = firstHex(vars, 'text-muted', 'ink-soft', 'color-muted');

	// CSS var font families when Google parse missed
	const serifVar = resolveVar(vars, 'serif') || resolveVar(vars, 'font-serif');
	const sansVar = resolveVar(vars, 'sans') || resolveVar(vars, 'font-sans');
	const monoVar = resolveVar(vars, 'mono') || resolveVar(vars, 'font-mono');
	const named = (v?: string) => v?.match(/"([^"]+)"/)?.[1] || null;
	fontSerif ||= named(serifVar);
	fontSans ||= named(sansVar);
	fontMono ||= named(monoVar);

	const paletteMode: 'dark' | 'light' =
		bg && luminance(bg) < 0.35 ? 'dark' : ink && luminance(ink) > 0.6 ? 'dark' : 'light';

	const hasNoise = /feTurbulence|noiseFilter|fractalNoise|opacity=['"]0\.0[2-5]/.test(css);

	if (accent) notes.push(`Inspiration accent ${accent}`);
	if (fontSerif || fontSans) notes.push(`Fonts: ${[fontSerif, fontSans, fontMono].filter(Boolean).join(' / ')}`);
	notes.push(`Palette mode: ${paletteMode}`);

	return {
		url: finalUrl,
		googleFontHrefs,
		fontSerif,
		fontSans,
		fontMono,
		tokens: {
			accent: accent || undefined,
			accentStrong: accentStrong || undefined,
			bg: bg || undefined,
			ink: ink || undefined,
			inkSoft: inkSoft || undefined,
			surface: surface || undefined,
			rule: rule || undefined,
			ruleStrong: ruleStrong || undefined,
			accentWash: undefined
		},
		paletteMode,
		hasNoise,
		notes
	};
}

/** Merge inspiration into a punchy DesignBrief (code-owned; LLM can refine later). */
export function briefFromInspiration(signals: InspirationSignals[]): DesignBrief {
	const primary = signals[0];
	if (!primary) {
		return {
			mood: 'Modern editorial personal site',
			do: ['Strong display type', 'Clear accent', 'Atmospheric background'],
			dont: ['Flat purple gradients', 'Marketing stat strips'],
			tokens: {
				accent: '#f0c040',
				accentStrong: '#b8922e',
				bg: '#0a0a0c',
				ink: '#e8e6e3',
				inkSoft: '#9a9898',
				surface: '#16161a',
				rule: '#2a2a33'
			},
			density: 'balanced',
			paletteMode: 'dark',
			fonts: {
				serif: 'Instrument Serif',
				sans: 'DM Sans',
				mono: 'JetBrains Mono',
				googleHref:
					'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500&display=swap'
			},
			hero: 'bold',
			atmosphere: 'noise',
			navStyle: 'uppercase-tracked',
			elevatedCards: true,
			cssNotes: ['Fallback forge-inspired dark theme']
		};
	}

	const t = primary.tokens;
	const accent = t.accent || (primary.paletteMode === 'dark' ? '#f0c040' : '#1e4d6b');
	const bg = t.bg || (primary.paletteMode === 'dark' ? '#0a0a0c' : '#f7f5f1');
	const ink = t.ink || (primary.paletteMode === 'dark' ? '#e8e6e3' : '#1a1917');

	return {
		mood:
			primary.paletteMode === 'dark'
				? 'Dark modern forge — sharp type, gold accent, atmospheric depth'
				: 'Bright modern editorial with confident display type',
		do: [
			'Borrow inspiration fonts and palette',
			'Punchy display titles with tight tracking',
			'Uppercase tracked nav',
			primary.hasNoise || primary.paletteMode === 'dark' ? 'Subtle noise atmosphere' : 'Clean surfaces'
		],
		dont: [
			'Do not clone multi-section marketing grids onto the essay index',
			'Do not keep the quiet parchment Essay look when inspiration is dark/modern'
		],
		tokens: {
			accent,
			accentStrong: t.accentStrong || accent,
			bg,
			ink,
			inkSoft: t.inkSoft || (primary.paletteMode === 'dark' ? '#9a9898' : '#4d4a44'),
			surface: t.surface || (primary.paletteMode === 'dark' ? '#16161a' : '#ffffff'),
			rule: t.rule || (primary.paletteMode === 'dark' ? '#2a2a33' : '#e7e2d8'),
			ruleStrong: t.ruleStrong || (primary.paletteMode === 'dark' ? '#3d3d4a' : '#d6cfc1'),
			accentWash:
				primary.paletteMode === 'dark' ? 'rgba(240, 192, 64, 0.12)' : undefined
		},
		density: 'balanced',
		paletteMode: primary.paletteMode,
		fonts: {
			serif: primary.fontSerif || 'Instrument Serif',
			sans: primary.fontSans || 'DM Sans',
			mono: primary.fontMono || 'JetBrains Mono',
			googleHref: primary.googleFontHrefs[0] || null
		},
		hero: 'bold',
		atmosphere: primary.hasNoise || primary.paletteMode === 'dark' ? 'noise' : 'none',
		navStyle: 'uppercase-tracked',
		elevatedCards: primary.paletteMode === 'dark',
		cssNotes: primary.notes
	};
}
