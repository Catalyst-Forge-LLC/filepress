import { describe, expect, it } from 'vitest';
import { parseBriefJson, themeCssFromBrief, tokensFromSourceCss } from './theme.ts';

describe('parseBriefJson', () => {
	it('extracts JSON from surrounding noise', () => {
		const brief = parseBriefJson('Here you go:\n{"mood":"calm","do":[],"dont":[],"tokens":{"accent":"#112233","accentStrong":"#001122"},"density":"sparse","cssNotes":[]}\n');
		expect(brief.tokens.accent).toBe('#112233');
		expect(brief.density).toBe('sparse');
	});

	it('rejects missing accent', () => {
		expect(() => parseBriefJson('{"mood":"x","tokens":{}}')).toThrow(/accent/);
	});
});

describe('themeCssFromBrief', () => {
	it('emits token overrides', () => {
		const css = themeCssFromBrief({
			mood: 'test',
			do: [],
			dont: [],
			tokens: { accent: '#abcdef', accentStrong: '#123456', bg: '#fffef8' },
			density: 'sparse',
			cssNotes: []
		});
		expect(css).toContain('--accent: #abcdef');
		expect(css).toContain('--bg: #fffef8');
	});

	it('widens measure and wires local chrome images for punchy themes', () => {
		const css = themeCssFromBrief({
			mood: 'forge',
			do: [],
			dont: [],
			tokens: { accent: '#f0c040', accentStrong: '#e0b030', bg: '#1e1e2e', ink: '#e6e6e6' },
			density: 'balanced',
			paletteMode: 'dark',
			hero: 'bold',
			elevatedCards: true,
			images: {
				hero: '/images/hero.jpg',
				header: '/images/header.jpg',
				background: '/images/background.jpg'
			},
			cssNotes: []
		});
		expect(css).toContain('--measure-wide: 72rem');
		expect(css).toContain('url("/images/hero.jpg")');
		expect(css).toContain('url("/images/header.jpg")');
		expect(css).toContain('url("/images/background.jpg")');
		expect(css).toContain('max-width: none');
		// Header photo must win over darkChrome's background shorthand.
		const headerImgAt = css.lastIndexOf('url("/images/header.jpg")');
		const headerWipeAt = css.indexOf(
			'background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, #000)'
		);
		expect(headerImgAt).toBeGreaterThan(-1);
		expect(headerWipeAt).toBe(-1);
	});
});

describe('tokensFromSourceCss', () => {
	it('reads example-site-like :root vars', () => {
		const html = `<style>:root{--color-gold: #E8931A;--color-bg: #FBF8F2;--text-color: #1C0F07}</style>`;
		const t = tokensFromSourceCss(html);
		expect(t.accent).toBe('#E8931A');
		expect(t.bg).toBe('#FBF8F2');
		expect(t.ink).toBe('#1C0F07');
	});

	it('resolves var(--token) accent chains', () => {
		const html = `<style>:root{--color-gold: #E8931A;--accent-color: var(--color-gold);--bg-color: #FBF8F2}</style>`;
		const t = tokensFromSourceCss(html);
		expect(t.accent).toBe('#E8931A');
		expect(t.bg).toBe('#FBF8F2');
	});
});
