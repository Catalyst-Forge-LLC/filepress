import { describe, expect, it } from 'vitest';
import {
	boostRoot,
	extractCriticalTheme,
	hoistImportsAndLayer
} from './vite-plugin-critical-theme.ts';

describe('boostRoot', () => {
	it('upgrades :root without doubling :root:root', () => {
		expect(boostRoot(':root { --bg: #111; }')).toBe(':root:root { --bg: #111; }');
		expect(boostRoot(':root:root { --bg: #111; }')).toBe(':root:root { --bg: #111; }');
	});
});

describe('hoistImportsAndLayer', () => {
	it('keeps a Google Fonts @import (semicolon in the URL) outside the layer', () => {
		const out = hoistImportsAndLayer(
			'@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");\n:root { --bg: #111; }\n',
			'site'
		);
		expect(out).toContain('family=Inter:wght@400;700');
		expect(out.startsWith('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");')).toBe(true);
		expect(out).toContain('@layer site {');
		expect(out).toContain(':root { --bg: #111; }');
		expect(out).not.toMatch(/@layer site \{[^}]*@import/);
	});
});

describe('extractCriticalTheme', () => {
	it('returns empty when the theme is only comments', () => {
		expect(extractCriticalTheme('/* filepress site theme — edit freely */\n')).toBe('');
	});

	it('inlines the site sheet in layer site and beats Essay :root', () => {
		const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");
:root { --bg: #121212; }
.site-nav { letter-spacing: 0.08em; }
`;
		const out = extractCriticalTheme(css);
		expect(out).toContain('@layer filepress, site;');
		expect(out).toContain('@layer site {');
		expect(out).toContain(':root:root { --bg: #121212; }');
		expect(out).toContain('.site-nav { letter-spacing: 0.08em; }');
		expect(out).not.toContain('@import');
	});
});
