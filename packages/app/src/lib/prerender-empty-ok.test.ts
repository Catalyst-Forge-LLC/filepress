import { describe, it, expect } from 'vitest';
import { unexpectedUnseenPrerenderRoutes } from './prerender-empty-ok';

describe('unexpectedUnseenPrerenderRoutes', () => {
	it('allows a pages-only site with no posts, tags, or extra index pages', () => {
		expect(
			unexpectedUnseenPrerenderRoutes(['/page/[n]', '/tags/[tag]', '/[slug]', '/posts/[slug]'])
		).toEqual([]);
	});

	it('still fails closed on any other unseen route', () => {
		expect(unexpectedUnseenPrerenderRoutes(['/posts/[slug]', '/mystery/[id]'])).toEqual([
			'/mystery/[id]'
		]);
	});
});
