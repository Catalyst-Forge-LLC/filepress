import { describe, it, expect } from 'vitest';
import { defineFilepressConfig, absoluteUrl, ogImageUrl } from './config';

describe('defineFilepressConfig', () => {
	it('applies defaults for optional fields', () => {
		const cfg = defineFilepressConfig({ title: 'My Site', url: 'https://my.site' });
		expect(cfg.author).toBe('My Site'); // falls back to title
		expect(cfg.tagline).toBe('My Site'); // falls back to description -> title
		expect(cfg.postsPerPage).toBe(10);
		expect(cfg.homePage).toBeNull();
		expect(cfg.nav).toEqual([
			{ label: 'Posts', href: '/' },
			{ label: 'Topics', href: '/topics' }
		]);
		expect(cfg.footerLinks).toEqual([
			{ label: 'RSS', href: '/rss.xml' },
			{ label: 'Topics', href: '/topics' }
		]);
		expect(cfg.topics).toEqual([]);
		expect(cfg.newsletter).toBeNull();
		expect(cfg.logo).toBeNull();
		expect(cfg.ogImage).toBeNull();
		expect(cfg.lede).toBeNull();
	});

	it('keeps custom footerLinks and nav icons', () => {
		const cfg = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com',
			nav: [{ label: 'GitHub', href: 'https://github.com/acme/x', icon: 'github' }],
			footerLinks: [
				{ label: 'RSS', href: '/rss.xml' },
				{ label: 'Source', href: 'https://github.com/acme/x', icon: 'github' }
			]
		});
		expect(cfg.nav).toEqual([
			{ label: 'GitHub', href: 'https://github.com/acme/x', icon: 'github' }
		]);
		expect(cfg.footerLinks).toEqual([
			{ label: 'RSS', href: '/rss.xml' },
			{ label: 'Source', href: 'https://github.com/acme/x', icon: 'github' }
		]);
	});

	it('rejects empty nav entries and unknown icons', () => {
		expect(() =>
			defineFilepressConfig({
				title: 'X',
				url: 'https://x.example.com',
				nav: [{ label: '', href: '/x' }]
			})
		).toThrow(/non-empty label and href/);
		expect(() =>
			defineFilepressConfig({
				title: 'X',
				url: 'https://x.example.com',
				nav: [{ label: 'X', href: '/', icon: 'gitlab' as 'github' }]
			})
		).toThrow(/unsupported icon/);
	});

	it('defaults nav to Home + /posts when homePage is set', () => {
		const cfg = defineFilepressConfig({
			title: 'My Site',
			url: 'https://my.site',
			homePage: 'about'
		});
		expect(cfg.homePage).toBe('about');
		expect(cfg.nav).toEqual([
			{ label: 'Home', href: '/' },
			{ label: 'Posts', href: '/posts' },
			{ label: 'Topics', href: '/topics' }
		]);
	});

	it('keeps a trimmed lede and nulls a blank one', () => {
		const withLede = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com',
			lede: ' Essays on things. '
		});
		expect(withLede.lede).toBe('Essays on things.');
		const blank = defineFilepressConfig({ title: 'X', url: 'https://x.example.com', lede: '  ' });
		expect(blank.lede).toBeNull();
	});

	it('keeps a trimmed logo path and nulls a blank one', () => {
		const withLogo = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com',
			logo: ' /logo.png '
		});
		expect(withLogo.logo).toBe('/logo.png');
		expect(withLogo.ogImage).toBe('/logo.png');
		const blank = defineFilepressConfig({ title: 'X', url: 'https://x.example.com', logo: '  ' });
		expect(blank.logo).toBeNull();
		expect(blank.ogImage).toBeNull();
	});

	it('lets ogImage override logo for social cards', () => {
		const cfg = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com',
			logo: '/logo.png',
			ogImage: '/og.png'
		});
		expect(cfg.ogImage).toBe('/og.png');
		expect(ogImageUrl(cfg)).toBe('https://x.example.com/og.png');
	});

	it('strips a trailing slash from url and prefers description for tagline', () => {
		const cfg = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com/',
			description: 'Desc here'
		});
		expect(cfg.url).toBe('https://x.example.com');
		expect(cfg.tagline).toBe('Desc here');
	});

	it('fails loudly when a required field is missing (edge case 19)', () => {
		expect(() => defineFilepressConfig({ url: 'https://x.example.com' } as never)).toThrow(
			/`title` is required/
		);
		expect(() => defineFilepressConfig({ title: 'X' } as never)).toThrow(/`url` is required/);
	});

	it('rejects a url without an http(s) scheme', () => {
		expect(() => defineFilepressConfig({ title: 'X', url: 'x.example.com' })).toThrow(
			/must start with http/
		);
	});

	it('defaults paths to an empty array', () => {
		const cfg = defineFilepressConfig({ title: 'X', url: 'https://x.example.com' });
		expect(cfg.paths).toEqual([]);
	});

	it('normalizes path mounts and rejects engine collisions', () => {
		const cfg = defineFilepressConfig({
			title: 'X',
			url: 'https://x.example.com',
			paths: [{ url: '/docs/', dir: 'docs/dist/' }]
		});
		expect(cfg.paths).toEqual([{ url: '/docs', dir: 'docs/dist' }]);
		expect(() =>
			defineFilepressConfig({
				title: 'X',
				url: 'https://x.example.com',
				paths: [{ url: '/posts', dir: 'x' }]
			})
		).toThrow(/collides with an engine route/);
		expect(() =>
			defineFilepressConfig({
				title: 'X',
				url: 'https://x.example.com',
				paths: [{ url: '/', dir: 'x' }]
			})
		).toThrow(/cannot be/);
	});
});

describe('absoluteUrl', () => {
	it('joins origin and path without double slashes', () => {
		const site = { url: 'https://x.example.com' };
		expect(absoluteUrl(site, '/rss.xml')).toBe('https://x.example.com/rss.xml');
		expect(absoluteUrl(site, 'rss.xml')).toBe('https://x.example.com/rss.xml');
	});
});
