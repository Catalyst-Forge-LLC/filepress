import { describe, expect, it } from 'vitest';
import { planImages } from './images.ts';
import type { DesignBrief, ImageCandidate, SiteIR } from './ir.ts';

const brief: DesignBrief = {
	mood: 'dark',
	do: [],
	dont: [],
	tokens: { accent: '#f0c040', accentStrong: '#b8922e' },
	density: 'balanced',
	paletteMode: 'dark',
	cssNotes: []
};

const ir = {
	source: { url: 'https://example.com', generator: null },
	identity: {
		title: 'Example Author',
		description: 'desc',
		author: 'Example Author',
		canonicalUrl: 'https://example.com'
	},
	posts: [],
	pages: [],
	nav: [],
	topics: [],
	lede: null,
	notes: [],
	assets: []
} satisfies SiteIR;

describe('planImages', () => {
	it('never uses portraits as CSS covers and skips inspire logos', () => {
		const harvested: ImageCandidate[] = [
			{
				url: 'https://example.com/images/example-portrait.jpg',
				role: 'portrait',
				source: 'https://example.com'
			},
			{
				url: 'https://example.com/favicon-64.png',
				role: 'logo',
				source: 'https://example.com',
				alt: 'icon'
			},
			{
				url: 'https://www.catalystforge.com/media/catalyst-forge-logo-dark-v3.png',
				role: 'logo',
				source: 'https://www.catalystforge.com'
			},
			{
				url: 'https://app.execfoundry.com/board-room-contender-v2.png',
				role: 'background',
				source: 'https://app.execfoundry.com/start'
			},
			{
				url: 'https://app.execfoundry.com/marketing/landing-pipeline-v1.png',
				role: 'hero',
				source: 'https://app.execfoundry.com/start'
			}
		];

		const { chosen } = planImages(ir, harvested, brief);
		expect(chosen.portrait).toContain('example-portrait');
		expect(chosen.background).toContain('board-room');
		expect(chosen.header).toContain('landing-pipeline');
		// Second atmosphere image may fill hero, or stay null — never the portrait.
		expect(chosen.hero == null || !chosen.hero.includes('portrait')).toBe(true);
		expect(chosen.logo).toBeNull();
	});
});
