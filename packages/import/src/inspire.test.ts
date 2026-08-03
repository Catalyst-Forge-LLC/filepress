import { describe, expect, it } from 'vitest';
import { briefFromInspiration, type InspirationSignals } from './inspire.ts';
import { themeCssFromBrief } from './theme.ts';

function forgeLike(): InspirationSignals {
	return {
		url: 'https://www.catalystforge.com/',
		googleFontHrefs: [
			'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500&display=swap'
		],
		fontSerif: 'Instrument Serif',
		fontSans: 'DM Sans',
		fontMono: 'JetBrains Mono',
		tokens: {
			accent: '#f0c040',
			accentStrong: '#b8922e',
			bg: '#0a0a0c',
			ink: '#e8e6e3',
			inkSoft: '#9a9898',
			surface: '#16161a',
			rule: '#2a2a33',
			ruleStrong: '#3d3d4a'
		},
		paletteMode: 'dark',
		hasNoise: true,
		notes: ['Inspiration accent #f0c040', 'Palette mode: dark']
	};
}

describe('briefFromInspiration', () => {
	it('builds a dark punchy brief from forge-like signals', () => {
		const brief = briefFromInspiration([forgeLike()]);
		expect(brief.paletteMode).toBe('dark');
		expect(brief.tokens.bg).toBe('#0a0a0c');
		expect(brief.tokens.accent).toBe('#f0c040');
		expect(brief.fonts?.serif).toBe('Instrument Serif');
		expect(brief.hero).toBe('bold');
		expect(brief.atmosphere).toBe('noise');
		expect(brief.elevatedCards).toBe(true);
	});

	it('blends a second site accent into the first site structure', () => {
		const ef: InspirationSignals = {
			url: 'https://app.execfoundry.com/start',
			googleFontHrefs: [
				'https://fonts.googleapis.com/css2?family=Syne:wght@400;700&family=Source+Serif+4:wght@400;600&display=swap'
			],
			fontSerif: 'Source Serif 4',
			fontSans: 'Syne',
			fontMono: null,
			tokens: {
				accent: '#f99c00',
				accentStrong: '#dd7400',
				bg: '#faf8f5',
				ink: '#1c1710'
			},
			paletteMode: 'light',
			hasNoise: false,
			notes: ['EF amber']
		};
		const brief = briefFromInspiration([forgeLike(), ef]);
		expect(brief.paletteMode).toBe('dark'); // dark wins when mixed
		expect(brief.tokens.accent).toBe('#f99c00'); // secondary accent
		expect(brief.tokens.bg).toBe('#0a0a0c'); // dark structure from CF
		expect(brief.cssNotes.some((n) => n.includes('Blended from'))).toBe(true);
	});
});

describe('themeCssFromBrief (punchy)', () => {
	it('emits google fonts, noise, and dark tokens', () => {
		const css = themeCssFromBrief(briefFromInspiration([forgeLike()]));
		expect(css).toContain('@import url("https://fonts.googleapis.com');
		expect(css).toContain('--bg: #0a0a0c');
		expect(css).toContain('--font-serif: "Instrument Serif"');
		expect(css).toContain('body::before');
		expect(css).toContain('.site-nav a::after');
		expect(css).toContain('.post-card');
		expect(css).toContain('radial-gradient');
	});
});
