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

	// When theme tokens are CSS-var indirection (Tailwind @theme), fall back to
	// frequent warm/dark hexes in the stylesheet.
	const hexFallback = inferHexPalette(css);
	const accentResolved = accent || hexFallback.accent;
	const accentStrongResolved = accentStrong || hexFallback.accentStrong || accentResolved;
	const bgResolved = bg || hexFallback.bg;
	const inkResolved = ink || hexFallback.ink;

	const paletteMode: 'dark' | 'light' =
		bgResolved && luminance(bgResolved) < 0.35
			? 'dark'
			: inkResolved && luminance(inkResolved) > 0.6
				? 'dark'
				: 'light';

	const hasNoise = /feTurbulence|noiseFilter|fractalNoise|opacity=['"]0\.0[2-5]/.test(css);

	if (accentResolved) notes.push(`Inspiration accent ${accentResolved}`);
	if (fontSerif || fontSans) notes.push(`Fonts: ${[fontSerif, fontSans, fontMono].filter(Boolean).join(' / ')}`);
	notes.push(`Palette mode: ${paletteMode}`);

	return {
		url: finalUrl,
		googleFontHrefs,
		fontSerif,
		fontSans,
		fontMono,
		tokens: {
			accent: accentResolved || undefined,
			accentStrong: accentStrongResolved || undefined,
			bg: bgResolved || undefined,
			ink: inkResolved || undefined,
			inkSoft: inkSoft || undefined,
			surface: surface || hexFallback.surface || undefined,
			rule: rule || undefined,
			ruleStrong: ruleStrong || undefined,
			accentWash: undefined
		},
		paletteMode,
		hasNoise,
		notes
	};
}

/** Guess accent/bg/ink from hex frequency when CSS vars don't resolve. */
export function inferHexPalette(css: string): Partial<DesignBrief['tokens']> {
	const counts = new Map<string, number>();
	for (const m of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
		const hex = `#${m[1].toLowerCase()}`;
		if (/^#(000000|ffffff|fff|000)$/i.test(hex)) continue;
		counts.set(hex, (counts.get(hex) ?? 0) + 1);
	}
	const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
	const warm = ranked.find(([h]) => {
		const n = parseInt(h.slice(1), 16);
		const r = (n >> 16) & 255;
		const g = (n >> 8) & 255;
		const b = n & 255;
		return r > 160 && g > 80 && g < 220 && b < 120 && r >= g;
	})?.[0];
	const darkBg = ranked.find(([h]) => luminance(h) < 0.2)?.[0];
	const lightInk = ranked.find(([h]) => luminance(h) > 0.75)?.[0];
	const darkInk = ranked.find(([h]) => luminance(h) < 0.25 && h !== darkBg)?.[0];
	const out: Partial<DesignBrief['tokens']> = {};
	if (warm) {
		out.accent = warm;
		out.accentStrong = warm;
	}
	if (darkBg) out.bg = darkBg;
	if (darkBg && lightInk) out.ink = lightInk;
	else if (darkInk) out.ink = darkInk;
	return out;
}

function pickFont(
	signals: InspirationSignals[],
	key: 'fontSerif' | 'fontSans' | 'fontMono',
	fallback: string
): string {
	// Serif/mono: prefer earlier (structure). Sans: prefer later so a second
	// product site can retint UI type without losing the first site's display face.
	const order = key === 'fontSans' ? [...signals].reverse() : signals;
	for (const s of order) {
		const v = s[key];
		if (v) return v;
	}
	return fallback;
}

function mergeGoogleHref(signals: InspirationSignals[]): string | null {
	const families = new Set<string>();
	for (const s of signals) {
		for (const href of s.googleFontHrefs) {
			try {
				const u = new URL(href.replace(/&amp;/g, '&'));
				const family = u.searchParams.get('family') || '';
				for (const part of family.split('|')) {
					const name = part.split(':')[0];
					if (name) families.add(name);
				}
			} catch {
				/* skip */
			}
		}
	}
	// Keep the mix small — display + UI + mono/serif for essays
	const preferred = [
		'Instrument+Serif',
		'Syne',
		'Fraunces',
		'Source+Serif+4',
		'DM+Sans',
		'Outfit',
		'Manrope',
		'JetBrains+Mono'
	];
	const chosen: string[] = [];
	for (const p of preferred) {
		const hit = [...families].find((f) => f.replace(/ /g, '+') === p || f === p.replace(/\+/g, ' '));
		if (hit) chosen.push(hit.includes(':') ? hit : `${hit.replace(/ /g, '+')}:wght@400;500;600;700`);
		if (chosen.length >= 4) break;
	}
	if (!chosen.length && signals[0]?.googleFontHrefs[0]) {
		return signals[0].googleFontHrefs[0].replace(/&amp;/g, '&');
	}
	if (!chosen.length) return null;
	return `https://fonts.googleapis.com/css2?${chosen.map((f) => `family=${f}`).join('&')}&display=swap`;
}

/**
 * Merge up to 3 inspiration signals into one brief.
 * First URL = structure/mood bias; later URLs contribute accent/fonts/atmosphere.
 */
export function briefFromInspiration(signals: InspirationSignals[]): DesignBrief {
	const list = signals.slice(0, 3);
	if (!list.length) {
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

	const primary = list[0];
	const secondary = list[1];
	const tertiary = list[2];

	// Dark wins if any inspiration is dark (personal sites look sharper that way
	// when mixing a marketing dark site with a product light site).
	const darkCount = list.filter((s) => s.paletteMode === 'dark').length;
	const paletteMode: 'dark' | 'light' = darkCount > 0 ? 'dark' : 'light';

	// Accent: prefer a later site's accent when it differs (keeps the blend visible).
	const accents = list.map((s) => s.tokens.accent).filter(Boolean) as string[];
	const accent =
		(secondary?.tokens.accent && secondary.tokens.accent !== primary.tokens.accent
			? secondary.tokens.accent
			: null) ||
		accents[0] ||
		(paletteMode === 'dark' ? '#f0c040' : '#1e4d6b');
	const accentStrong =
		secondary?.tokens.accentStrong ||
		primary.tokens.accentStrong ||
		tertiary?.tokens.accentStrong ||
		accent;

	const bg =
		list.find((s) => s.paletteMode === paletteMode)?.tokens.bg ||
		primary.tokens.bg ||
		(paletteMode === 'dark' ? '#0a0a0c' : '#f7f5f1');
	const ink =
		list.find((s) => s.paletteMode === paletteMode)?.tokens.ink ||
		primary.tokens.ink ||
		(paletteMode === 'dark' ? '#e8e6e3' : '#1a1917');
	const surface =
		list.find((s) => s.tokens.surface)?.tokens.surface ||
		(paletteMode === 'dark' ? '#16161a' : '#ffffff');
	const rule =
		list.find((s) => s.tokens.rule)?.tokens.rule ||
		(paletteMode === 'dark' ? '#2a2a33' : '#e7e2d8');
	const inkSoft =
		list.find((s) => s.tokens.inkSoft)?.tokens.inkSoft ||
		(paletteMode === 'dark' ? '#9a9898' : '#4d4a44');

	const hasNoise = list.some((s) => s.hasNoise);
	const sources = list.map((s) => s.url).join(' · ');

	return {
		mood:
			list.length > 1
				? `Blend of ${list.length} inspiration sites — ${paletteMode} editorial with a product-grade accent`
				: paletteMode === 'dark'
					? 'Dark modern forge — sharp type, gold accent, atmospheric depth'
					: 'Bright modern editorial with confident display type',
		do: [
			'Blend fonts and accent across inspiration URLs',
			'Punchy display titles with tight tracking',
			'Uppercase tracked nav',
			hasNoise || paletteMode === 'dark' ? 'Subtle noise atmosphere' : 'Clean surfaces'
		],
		dont: [
			'Do not clone multi-section marketing grids onto the essay index',
			'Do not keep the quiet parchment Essay look when inspiration is dark/modern'
		],
		tokens: {
			accent,
			accentStrong,
			bg,
			ink,
			inkSoft,
			surface,
			rule,
			ruleStrong:
				list.find((s) => s.tokens.ruleStrong)?.tokens.ruleStrong ||
				(paletteMode === 'dark' ? '#3d3d4a' : '#d6cfc1'),
			accentWash:
				paletteMode === 'dark' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : undefined
		},
		density: 'balanced',
		paletteMode,
		fonts: {
			serif: pickFont(list, 'fontSerif', 'Instrument Serif'),
			sans: pickFont(list, 'fontSans', 'DM Sans'),
			mono: pickFont(list, 'fontMono', 'JetBrains Mono'),
			googleHref: mergeGoogleHref(list)
		},
		hero: 'bold',
		atmosphere: hasNoise || paletteMode === 'dark' ? 'noise' : 'none',
		navStyle: 'uppercase-tracked',
		elevatedCards: paletteMode === 'dark',
		cssNotes: [`Blended from: ${sources}`, ...list.flatMap((s) => s.notes)]
	};
}
