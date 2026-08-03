import { describe, expect, it } from 'vitest';
import { stockQueriesForBrief } from './stock.ts';

describe('stockQueriesForBrief', () => {
	it('biases dark briefs toward dark abstract queries', () => {
		const q = stockQueriesForBrief({
			mood: 'High-contrast noir with industrial gold accents',
			do: [],
			dont: [],
			tokens: { accent: '#f0c040', accentStrong: '#b8922e' },
			density: 'balanced',
			paletteMode: 'dark',
			cssNotes: []
		});
		expect(q.background.toLowerCase()).toContain('dark');
		expect(q.header.toLowerCase()).toContain('dark');
	});
});
