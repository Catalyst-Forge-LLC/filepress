import { describe, expect, it } from 'vitest';
import { summarizeVersionDid, versionPrompt } from './version-summary.ts';
import type { DesignBrief } from './types.ts';

const icy: DesignBrief = {
	mood: 'Crisp, academic, and icy',
	do: ['Keep reading measure comfortable'],
	dont: ['Use dark backgrounds or near-black colors'],
	tokens: {
		accent: '#2c7bb6',
		accentStrong: '#1f5a8c',
		bg: '#f0f8ff',
		ink: '#1a2333'
	},
	density: 'sparse',
	paletteMode: 'light',
	hero: 'editorial',
	atmosphere: 'none',
	fonts: {
		serif: 'Merriweather',
		sans: 'Inter',
		mono: 'Fira Code',
		googleHref: null
	},
	cssNotes: []
};

describe('versionPrompt', () => {
	it('prefers the saved prompt', () => {
		expect(
			versionPrompt({
				prompt: '  Icy blue, Antarctica  ',
				steers: [{ type: 'refine', prompt: 'other' }]
			})
		).toBe('Icy blue, Antarctica');
	});

	it('falls back to a steer prompt when meta.prompt is empty', () => {
		expect(
			versionPrompt({
				prompt: '',
				steers: [{ type: 'refine', prompt: 'Think Antarctica' }]
			})
		).toBe('Think Antarctica');
	});

	it('returns empty when nothing stored a prompt', () => {
		expect(versionPrompt({ prompt: '', steers: [{ type: 'stock' }] })).toBe('');
	});
});

describe('summarizeVersionDid', () => {
	it('names the applied look from the brief', () => {
		expect(summarizeVersionDid(icy)).toBe(
			'Crisp, academic, and icy · light · #f0f8ff · #2c7bb6 · editorial · sparse · Merriweather / Inter'
		);
	});

	it('omits atmosphere none and empty briefs', () => {
		expect(summarizeVersionDid(null)).toBe('');
		expect(
			summarizeVersionDid({
				...icy,
				mood: '',
				paletteMode: undefined,
				hero: undefined,
				density: 'sparse',
				atmosphere: 'none',
				fonts: undefined,
				tokens: { accent: '#111', accentStrong: '#000' }
			})
		).toBe('#111 · sparse');
	});
});
