import type { DesignBrief } from './ir.ts';

const DEFAULT_BRIEF: DesignBrief = {
	mood: 'Quiet editorial personal site with a modern accent.',
	do: ['Keep reading measure comfortable', 'Use a single clear accent', 'Prefer whitespace over cards'],
	dont: ['Do not add marketing section grids', 'Do not introduce pill-stat strips'],
	tokens: {
		accent: '#1e4d6b',
		accentStrong: '#163a52',
		bg: '#f7f5f1',
		ink: '#1a1917'
	},
	density: 'sparse',
	paletteMode: 'light',
	hero: 'editorial',
	atmosphere: 'none',
	navStyle: 'soft',
	elevatedCards: false,
	cssNotes: []
};

function lighten(hex: string): string {
	if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#8eb6d4';
	const n = parseInt(hex.slice(1), 16);
	const r = Math.min(255, ((n >> 16) & 255) + 60);
	const g = Math.min(255, ((n >> 8) & 255) + 60);
	const b = Math.min(255, (n & 255) + 60);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darken(hex: string): string {
	if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#0a0a0c';
	const n = parseInt(hex.slice(1), 16);
	const r = Math.max(0, ((n >> 16) & 255) - 40);
	const g = Math.max(0, ((n >> 8) & 255) - 40);
	const b = Math.max(0, (n & 255) - 40);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function fontStack(name: string, fallback: string): string {
	const safe = name.replace(/"/g, '');
	return `"${safe}", ${fallback}`;
}

/**
 * Code-owned theme template. The brief fills slots; we never paste freeform LLM CSS.
 * When inspiration signals are present, this intentionally diverges hard from stock Essay.
 */
export function themeCssFromBrief(brief: DesignBrief = DEFAULT_BRIEF): string {
	const t = { ...DEFAULT_BRIEF.tokens, ...brief.tokens };
	const mode = brief.paletteMode || (t.bg && /^#0/.test(t.bg) ? 'dark' : 'light');
	const fonts = brief.fonts;
	const hero = brief.hero || 'editorial';
	const atmosphere = brief.atmosphere || 'none';
	const navStyle = brief.navStyle || 'soft';
	const cards = Boolean(brief.elevatedCards);
	const imgs = brief.images || {};
	const punchy = mode === 'dark' || hero === 'bold' || cards;
	const wash =
		t.accentWash ||
		(mode === 'dark'
			? 'color-mix(in srgb, var(--accent) 12%, transparent)'
			: 'color-mix(in srgb, var(--accent) 7%, transparent)');
	const safeImg = (path: string | null | undefined) =>
		path && /^\/[\w./%-]+$/.test(path) ? path : null;

	const importBlock =
		fonts?.googleHref && /^https:\/\/fonts\.googleapis\.com\//.test(fonts.googleHref)
			? `@import url("${fonts.googleHref.replace(/"/g, '')}");\n\n`
			: '';

	const fontSerif = fonts?.serif
		? fontStack(fonts.serif, 'Georgia, "Times New Roman", serif')
		: undefined;
	const fontSans = fonts?.sans
		? fontStack(fonts.sans, '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
		: undefined;
	const fontMono = fonts?.mono ? fontStack(fonts.mono, 'Menlo, Consolas, monospace') : undefined;

	const density =
		brief.density === 'dense'
			? `body { font-size: 1.05rem; line-height: 1.65; }`
			: brief.density === 'balanced'
				? `body { font-size: 1.0625rem; line-height: 1.7; }`
				: `body { font-size: 1.15rem; line-height: 1.75; }`;

	const noise =
		atmosphere === 'noise'
			? `
body::before {
	content: "";
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 9999;
	opacity: ${mode === 'dark' ? '0.035' : '0.03'};
	background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
`
			: '';

	const heroImg = safeImg(imgs.hero ?? null);
	const headerImg = safeImg(imgs.header ?? null);
	const bgImg = safeImg(imgs.background ?? null);

	const heroBlock =
		hero === 'bold'
			? `
.hero {
	margin-bottom: clamp(2rem, 5vw, 3rem);
	padding: clamp(1.75rem, 4vw, 2.75rem) 0 clamp(1.5rem, 3vw, 2.25rem);
	border-bottom: 1px solid var(--rule);
	background:
		radial-gradient(ellipse 80% 60% at 10% 0%, var(--accent-wash), transparent 55%)${
			heroImg
				? `,
		linear-gradient(180deg, color-mix(in srgb, var(--bg) 35%, transparent), color-mix(in srgb, var(--bg) 75%, transparent)),
		url("${heroImg}") center / cover no-repeat`
				: ''
		};
}

.hero-lede {
	font-family: var(--font-serif);
	font-style: italic;
	font-size: clamp(1.35rem, 3.2vw, 1.85rem);
	line-height: 1.35;
	letter-spacing: -0.02em;
	color: var(--ink);
	max-width: none;
}
`
			: `
.hero-lede {
	font-size: 1.28rem;
}
`;

	/* Emitted after darkChrome so shorthand `background:` rules cannot wipe these. */
	const imageChrome = `
${
	bgImg
		? `body {
	background-color: var(--bg);
	background-image:
		linear-gradient(180deg, color-mix(in srgb, var(--bg) 72%, transparent), color-mix(in srgb, var(--bg) 88%, transparent)),
		url("${bgImg}");
	background-size: cover;
	background-attachment: fixed;
	background-position: center;
}
`
		: ''
}
${
	headerImg
		? `.site-header {
	background-color: transparent;
	background-image:
		linear-gradient(180deg, color-mix(in srgb, var(--bg) 55%, transparent), color-mix(in srgb, var(--bg) 82%, transparent)),
		url("${headerImg}");
	background-size: cover;
	background-position: center;
}
`
		: ''
}`;

	const navBlock =
		navStyle === 'uppercase-tracked'
			? `
.site-nav {
	gap: 1.35rem;
	font-size: 0.78rem;
	font-weight: 600;
	letter-spacing: 0.08em;
}

.site-nav a {
	position: relative;
	color: var(--ink-soft);
	text-decoration: none;
	padding: 0.35rem 0;
}

.site-nav a::after {
	content: "";
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 1px;
	background: var(--accent);
	transform: scaleX(0);
	transition: transform 0.2s ease;
}

.site-nav a:hover {
	color: var(--ink);
}

.site-nav a:hover::after {
	transform: scaleX(1);
}

.site-title {
	font-size: clamp(1.45rem, 2.5vw, 1.75rem);
	letter-spacing: -0.02em;
	color: var(--accent);
	font-weight: 500;
}
`
			: `
.site-title {
	letter-spacing: -0.02em;
}
`;

	const cardBlock = cards
		? `
.featured,
.post-card {
	background: var(--surface);
	border: 1px solid var(--rule);
	border-radius: calc(var(--radius) + 2px);
	padding: 1.35rem 1.5rem;
	box-shadow: 0 8px 28px color-mix(in srgb, #000 35%, transparent);
}

.featured {
	border-bottom: 1px solid var(--rule);
}

.post-list {
	gap: 1rem;
}

.post-card + .post-card {
	margin-top: 0;
}
`
		: '';

	const darkChrome =
		mode === 'dark'
			? `
.site-header {
	border-bottom-color: var(--rule);
	${
		headerImg
			? `/* Header photo set in imageChrome — avoid background shorthand wipe */`
			: `background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, #000), transparent);`
	}
	backdrop-filter: blur(12px);
	margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}

.site-footer {
	border-top-color: var(--rule);
}

::selection {
	background: var(--accent);
	color: var(--bg);
}

a {
	text-decoration-color: color-mix(in srgb, var(--accent) 55%, transparent);
}

a:hover {
	color: color-mix(in srgb, var(--accent) 70%, #fff);
}

.tag-list a,
.tag-list .tag {
	border-radius: 6px;
	border-color: var(--rule-strong);
}

.button,
.newsletter .button {
	background: var(--accent);
	color: var(--bg);
	border: none;
	font-weight: 600;
}

.button:hover,
.newsletter .button:hover {
	background: color-mix(in srgb, var(--accent) 85%, #fff);
	color: var(--bg);
}

.prose blockquote {
	border-left-color: var(--accent);
	background: var(--accent-wash);
	padding: 0.75rem 1rem;
	border-radius: 0 var(--radius) var(--radius) 0;
}
`
			: `
.site-header {
	border-bottom-color: color-mix(in srgb, var(--accent) 22%, var(--rule));
}
`;

	return `/* Generated by downpress import — edit freely.
 * Mood: ${brief.mood.replace(/\*\//g, '')}
 * Mode: ${mode} · hero: ${hero} · atmosphere: ${atmosphere}
 */
${importBlock}:root {
	${fontSerif ? `--font-serif: ${fontSerif};` : ''}
	${fontSans ? `--font-sans: ${fontSans};` : ''}
	${fontMono ? `--font-mono: ${fontMono};` : ''}
	--accent: ${t.accent};
	--accent-strong: ${t.accentStrong};
	--accent-wash: ${wash};
	--bg: ${t.bg || (mode === 'dark' ? '#0a0a0c' : '#f7f5f1')};
	--surface: ${t.surface || (mode === 'dark' ? '#16161a' : '#ffffff')};
	--ink: ${t.ink || (mode === 'dark' ? '#e8e6e3' : '#1a1917')};
	--ink-soft: ${t.inkSoft || (mode === 'dark' ? '#9a9898' : '#4d4a44')};
	--ink-faint: ${mode === 'dark' ? '#6b6969' : '#837f77'};
	--rule: ${t.rule || (mode === 'dark' ? '#2a2a33' : '#e7e2d8')};
	--rule-strong: ${t.ruleStrong || (mode === 'dark' ? '#3d3d4a' : '#d6cfc1')};
	--radius: ${mode === 'dark' ? '8px' : '6px'};
	/* Essay defaults are editorial-narrow (46rem). Punchy import themes open up. */
	${punchy ? `--measure: 48rem;\n\t--measure-wide: 72rem;` : ''}
}

${
	mode === 'light'
		? `@media (prefers-color-scheme: dark) {
	:root {
		--accent: ${lighten(t.accent)};
		--accent-strong: ${lighten(t.accentStrong)};
	}
}`
		: `/* Dark inspiration palette — force dark even when OS is light */
@media (prefers-color-scheme: light) {
	:root {
		--bg: ${t.bg || '#0a0a0c'};
		--surface: ${t.surface || '#16161a'};
		--ink: ${t.ink || '#e8e6e3'};
	}
}`
}

${density}

body {
	${mode === 'dark' ? `-webkit-font-smoothing: antialiased;` : ''}
	${mode === 'dark' && !bgImg ? `background-color: var(--bg);` : ''}
}

${noise}

.post-title,
.page-header h1,
.post-header h1,
.featured .post-title {
	letter-spacing: -0.03em;
	font-weight: ${mode === 'dark' ? '500' : '600'};
	${hero === 'bold' ? `font-size: clamp(2.1rem, 5vw, 3.15rem);` : ''}
}

.featured .post-title {
	font-size: clamp(1.85rem, 4vw, 2.6rem);
}

.eyebrow {
	font-family: var(--font-mono), var(--font-sans);
	letter-spacing: 0.12em;
}

${navBlock}
${heroBlock}
${cardBlock}
${darkChrome}
${imageChrome}

.site-tagline {
	color: var(--ink-soft);
	${mode === 'dark' ? 'font-style: normal; font-family: var(--font-sans); font-size: 0.9rem;' : ''}
}

.read-more {
	font-family: var(--font-sans);
	font-weight: 600;
	letter-spacing: 0.02em;
}
`;
}

export function parseBriefJson(raw: string): DesignBrief {
	const start = raw.indexOf('{');
	const end = raw.lastIndexOf('}');
	if (start === -1 || end === -1) throw new Error('No JSON object in model response');
	const data = JSON.parse(raw.slice(start, end + 1)) as Partial<DesignBrief>;
	if (!data.tokens?.accent || !data.tokens?.accentStrong) {
		throw new Error('Design brief missing tokens.accent / tokens.accentStrong');
	}
	const fonts = data.fonts
		? {
				serif: String(data.fonts.serif || 'Instrument Serif'),
				sans: String(data.fonts.sans || 'DM Sans'),
				mono: String(data.fonts.mono || 'JetBrains Mono'),
				googleHref: data.fonts.googleHref ? String(data.fonts.googleHref) : null
			}
		: undefined;
	return {
		mood: String(data.mood ?? DEFAULT_BRIEF.mood),
		do: Array.isArray(data.do) ? data.do.map(String) : DEFAULT_BRIEF.do,
		dont: Array.isArray(data.dont) ? data.dont.map(String) : DEFAULT_BRIEF.dont,
		tokens: {
			accent: String(data.tokens.accent),
			accentStrong: String(data.tokens.accentStrong),
			bg: data.tokens.bg ? String(data.tokens.bg) : undefined,
			ink: data.tokens.ink ? String(data.tokens.ink) : undefined,
			inkSoft: data.tokens.inkSoft ? String(data.tokens.inkSoft) : undefined,
			surface: data.tokens.surface ? String(data.tokens.surface) : undefined,
			rule: data.tokens.rule ? String(data.tokens.rule) : undefined,
			ruleStrong: data.tokens.ruleStrong ? String(data.tokens.ruleStrong) : undefined,
			accentWash: data.tokens.accentWash ? String(data.tokens.accentWash) : undefined
		},
		density:
			data.density === 'dense' || data.density === 'balanced' || data.density === 'sparse'
				? data.density
				: 'sparse',
		paletteMode: data.paletteMode === 'dark' || data.paletteMode === 'light' ? data.paletteMode : undefined,
		fonts,
		hero: data.hero === 'bold' || data.hero === 'editorial' ? data.hero : undefined,
		atmosphere: data.atmosphere === 'noise' || data.atmosphere === 'none' ? data.atmosphere : undefined,
		navStyle:
			data.navStyle === 'uppercase-tracked' || data.navStyle === 'soft' ? data.navStyle : undefined,
		elevatedCards: Boolean(data.elevatedCards),
		cssNotes: Array.isArray(data.cssNotes) ? data.cssNotes.map(String) : []
	};
}

/** Extract CSS custom properties from inline :root blocks (source site). */
export function tokensFromSourceCss(html: string): Partial<DesignBrief['tokens']> {
	const m = html.match(/:root\s*\{([^}]+)\}/);
	if (!m) return {};
	const block = m[1];
	const vars = new Map<string, string>();
	for (const hit of block.matchAll(/--([a-zA-Z0-9-_]+)\s*:\s*([^;}]+)/g)) {
		vars.set(hit[1], hit[2].trim());
	}
	const resolve = (name: string, depth = 0): string | undefined => {
		if (depth > 5) return undefined;
		const raw = vars.get(name);
		if (!raw) return undefined;
		const ref = raw.match(/^var\(\s*--([a-zA-Z0-9-_]+)\s*\)$/);
		if (ref) return resolve(ref[1], depth + 1);
		return raw;
	};
	const firstHex = (...names: string[]) => {
		for (const n of names) {
			const v = resolve(n);
			if (v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
		}
		return undefined;
	};
	const accent = firstHex('accent-color', 'accent', 'color-gold', 'color-augment');
	const bg = firstHex('bg-color', 'bg', 'color-bg', 'color-cream');
	const ink = firstHex('text-color', 'ink', 'color-espresso');
	const out: Partial<DesignBrief['tokens']> = {};
	if (accent) {
		out.accent = accent;
		out.accentStrong = firstHex('accent-strong', 'color-understand') || accent;
	}
	if (bg) out.bg = bg;
	if (ink) out.ink = ink;
	return out;
}

export { DEFAULT_BRIEF, darken };
