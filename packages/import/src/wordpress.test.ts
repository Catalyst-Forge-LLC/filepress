import { describe, expect, it } from 'vitest';
import {
	decodeWpText,
	navFromWordpress,
	termsToTags,
	topicsFromWordpress,
	type WpCatalog
} from './wordpress.ts';

const catalog: WpCatalog = {
	posts: [],
	pages: [
		{ slug: 'welcome-to-our-lab', title: 'Welcome', link: 'https://acmegeek.com/', excerpt: null, isHome: true },
		{ slug: 'contact-us', title: 'Contact Us', link: 'https://acmegeek.com/contact-us/', excerpt: null, isHome: false },
		{ slug: 'privacy', title: 'privacy', link: 'https://acmegeek.com/privacy/', excerpt: null, isHome: false }
	],
	categories: [
		{ id: 59, name: 'Recommendations', slug: 'recommendations', count: 1 },
		{ id: 56, name: 'Products', slug: 'products', count: 3 },
		{ id: 1, name: 'Uncategorized', slug: 'uncategorized', count: 0 }
	],
	tags: []
};

describe('decodeWpText', () => {
	it('strips tags and entities', () => {
		expect(decodeWpText('Tips &amp; Tricks')).toBe('Tips & Tricks');
		expect(decodeWpText('<p>Hello &#8211; world</p>')).toBe('Hello – world');
	});
});

describe('termsToTags', () => {
	it('maps category ids and drops uncategorized', () => {
		expect(
			termsToTags(catalog.categories, catalog.tags, [59, 1], [])
		).toEqual(['recommendations']);
	});
});

describe('navFromWordpress', () => {
	it('links category headings to /tags/<slug>', () => {
		const nav = navFromWordpress(catalog, { homePage: true });
		expect(nav).toEqual([
			{ label: 'Home', href: '/' },
			{ label: 'Posts', href: '/posts' },
			{ label: 'Recommendations', href: '/tags/recommendations' },
			{ label: 'Products', href: '/tags/products' },
			{ label: 'Contact', href: '/contact-us' },
			{ label: 'privacy', href: '/privacy' }
		]);
	});
});

describe('topicsFromWordpress', () => {
	it('skips empty and uncategorized', () => {
		expect(topicsFromWordpress(catalog)).toEqual([
			{ label: 'Recommendations', tag: 'recommendations' },
			{ label: 'Products', tag: 'products' }
		]);
	});
});
