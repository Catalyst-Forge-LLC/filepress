import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { fetchBuffer, fetchText, resolveUrl } from './fetch.ts';
import type { DesignBrief, ImageCandidate, SiteIR } from './ir.ts';

function isFaviconish(url: string, alt = ''): boolean {
	return /favicon|apple-touch|android-chrome|icon-\d|\/icon\./i.test(`${url} ${alt}`);
}

function isPortraitish(url: string, context = ''): boolean {
	const s = `${url} ${context}`.toLowerCase();
	return /portrait|headshot|avatar|profile|photo-of|author|face|example-portrait|head-shot/.test(
		s
	);
}

function isAtmosphereish(url: string, context = ''): boolean {
	const s = `${url} ${context}`.toLowerCase();
	return /board-?room|office|conference|texture|atmosphere|background|bg-|landscape|hero-bg|banner-bg|pipeline|dossier|contender/.test(
		s
	);
}

function isWordmarkish(url: string, context = ''): boolean {
	const s = `${url} ${context}`.toLowerCase();
	if (isFaviconish(url, context)) return false;
	return /logo|wordmark|brand/.test(s) && !/favicon|icon/.test(s);
}

function classifyImage(url: string, context: string): ImageCandidate['role'] {
	const u = url.toLowerCase();
	const ctx = context.toLowerCase();
	if (isPortraitish(u, ctx)) return 'portrait';
	if (isWordmarkish(u, ctx)) return 'logo';
	if (isFaviconish(u, ctx)) return 'logo'; // filtered later unless nothing else
	if (isAtmosphereish(u, ctx) || /bg|background|texture|noise|pattern/.test(u + ctx)) {
		return 'background';
	}
	if (/hero|banner|masthead|header/.test(u) || /hero|banner|masthead/.test(ctx)) {
		return /header|nav|masthead/.test(ctx) ? 'header' : 'hero';
	}
	// og:image is often a portrait or card — never assume it's a CSS hero strip
	if (/og:image|twitter:image|opengraph/.test(ctx)) {
		return isPortraitish(u, ctx) ? 'portrait' : 'other';
	}
	return 'other';
}

function pushUnique(list: ImageCandidate[], item: ImageCandidate) {
	if (!item.url || item.url.startsWith('data:')) return;
	if (list.some((x) => x.url === item.url)) return;
	list.push(item);
}

/** Harvest image candidates from a page (meta + CSS urls + large imgs). */
export async function harvestImagesFromPage(
	pageUrl: string,
	label: string
): Promise<ImageCandidate[]> {
	const { text: html, url: finalUrl } = await fetchText(pageUrl);
	const { document } = parseHTML(html);
	const out: ImageCandidate[] = [];

	for (const sel of [
		'meta[property="og:image"]',
		'meta[name="twitter:image"]',
		'meta[property="og:image:url"]'
	]) {
		const content = document.querySelector(sel)?.getAttribute('content');
		if (!content) continue;
		const abs = resolveUrl(finalUrl, content);
		if (!abs) continue;
		const role = classifyImage(abs, 'og:image');
		pushUnique(out, { url: abs, role, source: label, alt: 'og:image' });
	}

	for (const link of document.querySelectorAll('link[rel="apple-touch-icon"], link[rel="icon"]')) {
		const href = link.getAttribute('href');
		if (!href) continue;
		const abs = resolveUrl(finalUrl, href);
		if (abs && /\.(png|jpe?g|webp|svg)(\?|$)/i.test(abs)) {
			pushUnique(out, { url: abs, role: 'logo', source: label, alt: 'icon' });
		}
	}

	for (const img of document.querySelectorAll('img[src]')) {
		const src = img.getAttribute('src');
		if (!src) continue;
		const abs = resolveUrl(finalUrl, src);
		if (!abs) continue;
		const alt = img.getAttribute('alt') || '';
		const w = Number(img.getAttribute('width') || 0);
		const cls = img.getAttribute('class') || '';
		const role = classifyImage(abs, `${alt} ${cls}`);
		if (role === 'other' && w > 0 && w < 200) continue;
		// Don't promote unknown small imgs to hero covers
		pushUnique(out, { url: abs, role, source: label, alt });
	}

	for (const m of html.matchAll(/background-image:\s*url\((['"]?)([^'")]+)\1\)/gi)) {
		const abs = resolveUrl(finalUrl, m[2]);
		if (!abs || abs.startsWith('data:')) continue;
		pushUnique(out, {
			url: abs,
			role: classifyImage(abs, 'background'),
			source: label,
			alt: 'css-background'
		});
	}

	return out;
}

export type ImagePlan = {
	candidates: ImageCandidate[];
	chosen: NonNullable<DesignBrief['images']>;
	unsplashQueries: string[];
	notes: string[];
};

/**
 * Pick site-owned assets from the crawl.
 * CSS covers (hero/header/background) come from Openverse stock via planStockCovers —
 * never from --inspire marketing photos.
 */
export function planImages(
	ir: SiteIR,
	harvested: ImageCandidate[],
	brief: DesignBrief
): ImagePlan {
	const sourceHost = (() => {
		try {
			return new URL(ir.source.url).hostname.replace(/^www\./, '');
		} catch {
			return '';
		}
	})();

	const fromSource = (c: ImageCandidate) => {
		try {
			return new URL(c.url).hostname.replace(/^www\./, '') === sourceHost;
		} catch {
			return c.source.includes(sourceHost);
		}
	};

	const byRole = (role: ImageCandidate['role']) => harvested.filter((c) => c.role === role);

	const pick = (
		roles: ImageCandidate['role'][],
		opts?: { skipFavicon?: boolean; sourceOnly?: boolean }
	) => {
		for (const r of roles) {
			for (const hit of byRole(r)) {
				if (opts?.skipFavicon && isFaviconish(hit.url, hit.alt)) continue;
				if (opts?.sourceOnly && !fromSource(hit)) continue;
				return hit.url;
			}
		}
		return null;
	};

	const portrait = pick(['portrait'], { skipFavicon: true });
	const logo = pick(['logo'], { sourceOnly: true, skipFavicon: true });

	// Covers filled later by Openverse when --fetch-images is set
	const chosen = {
		hero: null,
		header: null,
		background: null,
		logo,
		portrait
	};

	const mood = brief.mood || 'editorial';
	const mode = brief.paletteMode || 'dark';
	const unsplashQueries = [
		`${mode} abstract ${mood.split(/[—,:]/)[0]?.trim() || 'editorial'} texture`,
		`minimal geometric background ${mode === 'dark' ? 'dark gold' : 'warm paper'}`,
		`soft atmospheric gradient ${mode}`,
		`${ir.identity.author || ir.identity.title} portrait professional (photo slot, not CSS cover)`
	];

	const notes = [
		`Source/inspire image candidates (logos & portraits only used from source): ${harvested.length}`,
		...harvested.slice(0, 10).map((c) => `- [${c.role}] ${c.url} (${c.source})`),
		harvested.length > 10 ? `- …and ${harvested.length - 10} more` : '',
		'',
		'CSS covers use Openverse Creative Commons stock (not inspiration-site photos).',
		chosen.portrait
			? `Portrait candidate (not a cover): ${chosen.portrait}`
			: 'No portrait candidate found.',
		!chosen.logo
			? 'No source wordmark logo — keeping text site title.'
			: `Logo: ${chosen.logo}`,
		'',
		'Manual stock search ideas:',
		...unsplashQueries.map((q) => `- ${q}`),
		'',
		'Re-run with --fetch-images to download Openverse covers + source portrait/logo.'
	].filter(Boolean);

	return { candidates: harvested, chosen, unsplashQueries, notes };
}

function extOf(url: string, buf: Uint8Array): string {
	const path = new URL(url).pathname.toLowerCase();
	if (path.endsWith('.png')) return '.png';
	if (path.endsWith('.webp')) return '.webp';
	if (path.endsWith('.svg')) return '.svg';
	if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return '.jpg';
	if (buf[0] === 0x89 && buf[1] === 0x50) return '.png';
	if (buf[0] === 0xff && buf[1] === 0xd8) return '.jpg';
	return '.jpg';
}

/**
 * Download chosen remote images into static/images/{role}.*
 * Returns local public paths for the brief.
 */
export async function fetchChosenImages(
	chosen: NonNullable<DesignBrief['images']>,
	staticDir: string
): Promise<NonNullable<DesignBrief['images']>> {
	const imgDir = join(staticDir, 'images');
	mkdirSync(imgDir, { recursive: true });
	const local: NonNullable<DesignBrief['images']> = {};

	for (const role of ['hero', 'header', 'background', 'logo', 'portrait'] as const) {
		const url = chosen[role];
		if (!url) continue;
		try {
			const buf = await fetchBuffer(url);
			const ext = extOf(url, buf);
			const name = `${role}${ext}`;
			writeFileSync(join(imgDir, name), buf);
			local[role] = `/images/${name}`;
			console.log(`import: saved ${role} → static/images/${name}`);
		} catch (e) {
			console.warn(
				`import: could not fetch ${role} image ${url}: ${e instanceof Error ? e.message : e}`
			);
		}
	}
	return local;
}
