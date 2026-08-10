import { describe, it, expect } from 'vitest';
import { defineDownpressConfig, absoluteUrl } from './config';

describe('defineDownpressConfig', () => {
	it('applies defaults for optional fields', () => {
		const cfg = defineDownpressConfig({ title: 'My Site', url: 'https://my.site' });
		expect(cfg.author).toBe('My Site'); // falls back to title
		expect(cfg.tagline).toBe('My Site'); // falls back to description -> title
		expect(cfg.postsPerPage).toBe(10);
		expect(cfg.homePage).toBeNull();
		expect(cfg.nav).toEqual([
			{ label: 'Posts', href: '/' },
			{ label: 'Topics', href: '/topics' }
		]);
		expect(cfg.topics).toEqual([]);
		expect(cfg.newsletter).toBeNull();
		expect(cfg.logo).toBeNull();
		expect(cfg.lede).toBeNull();
	});

	it('defaults nav to Home + /writing when homePage is set', () => {
		const cfg = defineDownpressConfig({
			title: 'My Site',
			url: 'https://my.site',
			homePage: 'about'
		});
		expect(cfg.homePage).toBe('about');
		expect(cfg.nav).toEqual([
			{ label: 'Home', href: '/' },
			{ label: 'Posts', href: '/writing' },
			{ label: 'Topics', href: '/topics' }
		]);
	});

	it('keeps a trimmed lede and nulls a blank one', () => {
		const withLede = defineDownpressConfig({
			title: 'X',
			url: 'https://x.example.com',
			lede: ' Essays on things. '
		});
		expect(withLede.lede).toBe('Essays on things.');
		const blank = defineDownpressConfig({ title: 'X', url: 'https://x.example.com', lede: '  ' });
		expect(blank.lede).toBeNull();
	});

	it('keeps a trimmed logo path and nulls a blank one', () => {
		const withLogo = defineDownpressConfig({
			title: 'X',
			url: 'https://x.example.com',
			logo: ' /logo.png '
		});
		expect(withLogo.logo).toBe('/logo.png');
		const blank = defineDownpressConfig({ title: 'X', url: 'https://x.example.com', logo: '  ' });
		expect(blank.logo).toBeNull();
	});

	it('strips a trailing slash from url and prefers description for tagline', () => {
		const cfg = defineDownpressConfig({
			title: 'X',
			url: 'https://x.example.com/',
			description: 'Desc here'
		});
		expect(cfg.url).toBe('https://x.example.com');
		expect(cfg.tagline).toBe('Desc here');
	});

	it('fails loudly when a required field is missing (edge case 19)', () => {
		expect(() => defineDownpressConfig({ url: 'https://x.example.com' } as never)).toThrow(
			/`title` is required/
		);
		expect(() => defineDownpressConfig({ title: 'X' } as never)).toThrow(/`url` is required/);
	});

	it('rejects a url without an http(s) scheme', () => {
		expect(() => defineDownpressConfig({ title: 'X', url: 'x.example.com' })).toThrow(
			/must start with http/
		);
	});
});

describe('absoluteUrl', () => {
	it('joins origin and path without double slashes', () => {
		const site = { url: 'https://x.example.com' };
		expect(absoluteUrl(site, '/rss.xml')).toBe('https://x.example.com/rss.xml');
		expect(absoluteUrl(site, 'rss.xml')).toBe('https://x.example.com/rss.xml');
	});
});
