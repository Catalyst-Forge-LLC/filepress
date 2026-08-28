import { describe, expect, it } from 'vitest';
import { importRedirectRules } from './redirects.ts';

describe('importRedirectRules', () => {
	it('maps post and page source URLs and skips the site root', () => {
		const rules = importRedirectRules({
			homeMarkdown: null,
			posts: [
				{
					slug: 'hello',
					title: 'Hello',
					date: '2026-01-01',
					tags: [],
					description: null,
					markdown: '',
					sourceUrl: 'https://old.example/writing/hello/',
					imageUrls: []
				}
			],
			pages: [
				{
					slug: 'about',
					title: 'About',
					description: null,
					markdown: '',
					sourceUrl: 'https://old.example/about',
					order: 1,
					imageUrls: []
				}
			]
		});
		expect(rules).toEqual([{ from: '/writing/hello', to: '/posts/hello', status: 301 }]);
	});

	it('adds writing → posts when the home bio becomes a page', () => {
		const rules = importRedirectRules({
			homeMarkdown: '# Long bio',
			posts: [],
			pages: []
		});
		expect(rules).toEqual([{ from: '/writing/*', to: '/posts/:splat', status: 301 }]);
	});
});
