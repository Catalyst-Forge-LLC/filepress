import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { fetchBuffer, fetchText, resolveUrl } from './fetch.ts';
import type { DesignBrief, ImageCandidate, SiteIR } from './ir.ts';

function classifyImage(url: string, context: string): ImageCandidate['role'] {
	const u = url.toLowerCase();
	const ctx = context.toLowerCase();
	if (/logo|wordmark|brand/.test(u) || /logo|brand/.test(ctx)) return 'logo';
	if (/hero|banner|masthead|header/.test(u) || /hero|banner|masthead/.test(ctx)) {
		return /header|nav|masthead/.test(ctx) ? 'header' : 'hero';
	}
	if (/bg|background|texture|noise|pattern|atmosphere/.test(u) || /background/.test(ctx)) {
		return 'background';
	}
	if (/og:image|twitter:image|opengraph/.test(ctx)) return 'hero';
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
		if (abs) pushUnique(out, { url: abs, role: 'hero', source: label, alt: 'og:image' });
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
		// Prefer substantial images
		if (role === 'other' && w > 0 && w < 200) continue;
		pushUnique(out, { url: abs, role: role === 'other' ? 'hero' : role, source: label, alt });
	}

	// CSS background-image: url(...)
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

/** Pick hero/header/bg/logo from harvested candidates + search hints. */
export function planImages(
	ir: SiteIR,
	harvested: ImageCandidate[],
	brief: DesignBrief
): ImagePlan {
	const byRole = (role: ImageCandidate['role']) => harvested.filter((c) => c.role === role);
	const first = (...roles: ImageCandidate['role'][]) => {
		for (const r of roles) {
			const hit = byRole(r)[0];
			if (hit) return hit.url;
		}
		return null;
	};

	const chosen = {
		hero: first('hero', 'header', 'other'),
		header: first('header', 'hero'),
		background: first('background', 'hero'),
		logo: first('logo')
	};

	const mood = brief.mood || 'editorial';
	const mode = brief.paletteMode || 'dark';
	const unsplashQueries = [
		`${ir.identity.author || ir.identity.title} portrait professional`,
		`${mode} abstract ${mood.split('—')[0]?.trim() || 'editorial'} texture`,
		`executive boardroom soft light atmosphere`,
		`minimal geometric background ${mode === 'dark' ? 'dark gold' : 'warm paper'}`
	];

	const notes = [
		`Image candidates found: ${harvested.length}`,
		...harvested.slice(0, 12).map((c) => `- [${c.role}] ${c.url} (${c.source})`),
		harvested.length > 12 ? `- …and ${harvested.length - 12} more` : '',
		'',
		'Suggested Unsplash / stock searches (manual):',
		...unsplashQueries.map((q) => `- ${q}`),
		'',
		'Drop files into static/images/ as hero.jpg, header.jpg, background.jpg, logo.png — or re-run with --fetch-images.'
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
 * Download chosen remote images into static/images/{hero,header,background,logo}.*
 * Returns local public paths for the brief.
 */
export async function fetchChosenImages(
	chosen: NonNullable<DesignBrief['images']>,
	staticDir: string
): Promise<NonNullable<DesignBrief['images']>> {
	const imgDir = join(staticDir, 'images');
	mkdirSync(imgDir, { recursive: true });
	const local: NonNullable<DesignBrief['images']> = {};

	for (const role of ['hero', 'header', 'background', 'logo'] as const) {
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
