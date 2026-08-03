import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	writeFileSync,
	rmSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { DesignBrief, ImportOptions, SiteIR } from './ir.ts';
import { fetchBuffer } from './fetch.ts';
import { fetchChosenImages } from './images.ts';
import { themeCssFromBrief } from './theme.ts';

const DEFAULT_FAVICON = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../core/src/lib/assets/favicon.svg'
);

function ensureScaffold(out: string, opts: ImportOptions, title: string, url: string) {
	const configPath = join(out, 'downpress.config.ts');
	const needsScaffold = !existsSync(configPath) || !existsSync(join(out, 'package.json'));
	if (!needsScaffold) {
		mkdirSync(join(out, 'posts'), { recursive: true });
		mkdirSync(join(out, 'pages'), { recursive: true });
		mkdirSync(join(out, 'static'), { recursive: true });
		return;
	}

	const createScript = join(opts.engineRoot, 'scripts', 'create-site.mjs');
	const result = spawnSync(
		process.execPath,
		[
			createScript,
			opts.siteName,
			'--external',
			out,
			'--title',
			title,
			'--url',
			url,
			...(opts.force ? ['--force'] : [])
		],
		{ encoding: 'utf8' }
	);
	if (result.status !== 0) {
		throw new Error(`create-site failed:\n${result.stdout}\n${result.stderr}`);
	}
}

function yamlQuote(s: string): string {
	return JSON.stringify(s);
}

function postFilename(date: string, slug: string): string {
	return `${date}-${slug}.md`;
}

function rewriteImageUrls(markdown: string, mapping: Map<string, string>): string {
	let out = markdown;
	for (const [from, to] of mapping) {
		out = out.split(from).join(to);
		// also without origin if relative forms appeared
	}
	return out;
}

async function downloadImages(
	urls: string[],
	staticDir: string
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	const imgDir = join(staticDir, 'images');
	mkdirSync(imgDir, { recursive: true });
	let i = 0;
	for (const url of urls) {
		try {
			const buf = await fetchBuffer(url);
			const ext = guessExt(url, buf);
			const base = url.split('/').pop()?.split('?')[0] || `img-${++i}`;
			const safe = base.replace(/[^\w.-]+/g, '-').slice(0, 80) || `img-${++i}`;
			const name = safe.includes('.') ? safe : `${safe}${ext}`;
			const dest = join(imgDir, name);
			writeFileSync(dest, buf);
			map.set(url, `/images/${name}`);
		} catch (e) {
			console.warn(`import: image skip ${url}: ${e instanceof Error ? e.message : e}`);
		}
	}
	return map;
}

/** Copy favicons / touch icons to static/ root (preserve basename). */
async function downloadRootAssets(urls: string[], staticDir: string): Promise<void> {
	mkdirSync(staticDir, { recursive: true });
	for (const url of urls) {
		try {
			const buf = await fetchBuffer(url);
			const name = new URL(url).pathname.split('/').filter(Boolean).pop();
			if (!name || name.includes('..')) continue;
			writeFileSync(join(staticDir, name), buf);
		} catch {
			/* optional asset */
		}
	}
}

function guessExt(url: string, buf: Uint8Array): string {
	const path = new URL(url).pathname.toLowerCase();
	if (path.endsWith('.png')) return '.png';
	if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return '.jpg';
	if (path.endsWith('.webp')) return '.webp';
	if (path.endsWith('.gif')) return '.gif';
	if (path.endsWith('.svg')) return '.svg';
	if (buf[0] === 0x89 && buf[1] === 0x50) return '.png';
	if (buf[0] === 0xff && buf[1] === 0xd8) return '.jpg';
	return '.bin';
}

function buildReport(ir: SiteIR, opts: ImportOptions, brief: DesignBrief | null): string {
	const imgs = brief?.images;
	const imageSection = imgs
		? `## Chrome images

${imgs.hero ? `- Hero: \`${imgs.hero}\`` : '- Hero: (none)'}
${imgs.header ? `- Header: \`${imgs.header}\`` : '- Header: (none)'}
${imgs.background ? `- Background: \`${imgs.background}\`` : '- Background: (none)'}
${imgs.logo ? `- Logo (config): \`${imgs.logo}\`` : '- Logo: (none)'}

Replace files under \`static/images/\` anytime; theme.css references those paths.
`
		: `## Chrome images

Not fetched. Re-run with \`--fetch-images\` to download suggested hero/header/background/logo into \`static/images/\`, or drop your own files there and set paths in \`theme.css\` / \`logo\` in config.
`;

	return `# Downpress import report

Source: ${ir.source.url}
Generator guess: ${ir.source.generator ?? 'unknown'}
Output: ${opts.out}
Generated: ${new Date().toISOString()}

## Identity

- Title: ${ir.identity.title}
- Author: ${ir.identity.author}
- Canonical URL (config): ${opts.canonicalUrl || ir.identity.canonicalUrl}

## Imported

- Posts: ${ir.posts.length}
- Pages: ${ir.pages.length}
- Topics: ${ir.topics.map((t) => t.tag).join(', ') || '(none)'}

## URL remaps

Posts move to \`/posts/<slug>\` (Downpress default). If you need old paths (e.g. \`/writing/…\`), add Cloudflare Pages redirects.

${ir.posts.map((p) => `- \`${p.sourceUrl}\` → \`/posts/${p.slug}\``).join('\n')}

${ir.pages.map((p) => `- \`${p.sourceUrl}\` → \`/${p.slug}\``).join('\n')}

## Notes

${ir.notes.map((n) => `- ${n}`).join('\n')}

## Design

${brief ? `Mood: ${brief.mood}\nDensity: ${brief.density}\nDo: ${brief.do.join('; ')}\nDon't: ${brief.dont.join('; ')}` : 'No LLM brief (token theme from defaults / source CSS).'}

${imageSection}
## Next

\`\`\`bash
cd ${opts.out}
pnpm install
pnpm downpress dev
\`\`\`
`;
}

export async function writeSite(
	ir: SiteIR,
	opts: ImportOptions,
	brief: DesignBrief | null
): Promise<{ reportPath: string }> {
	const out = resolve(opts.out);
	if (existsSync(out)) {
		const entries = readdirSync(out).filter((e) => e !== '.git' && e !== 'artifacts');
		if (entries.length && !opts.force) {
			throw new Error(
				`Refusing non-empty directory ${out} (pass --force to overwrite generated files carefully)`
			);
		}
		if (opts.force && existsSync(join(out, 'downpress.config.ts'))) {
			// wipe content dirs we own; keep .git
			for (const d of ['posts', 'pages', 'static', '.downpress-import']) {
				rmSync(join(out, d), { recursive: true, force: true });
			}
		}
	}

	const title = opts.title || ir.identity.title;
	const url = opts.canonicalUrl || ir.identity.canonicalUrl;
	const author = opts.author || ir.identity.author;

	mkdirSync(out, { recursive: true });
	ensureScaffold(out, opts, title, url);

	// Remove scaffold sample content; we'll write imported files
	rmSync(join(out, 'posts', 'hello-world.md'), { force: true });
	rmSync(join(out, 'pages', 'about.md'), { force: true });
	// Clear prior import posts/pages when re-running with --force
	if (opts.force) {
		for (const dir of ['posts', 'pages']) {
			const abs = join(out, dir);
			if (!existsSync(abs)) continue;
			for (const f of readdirSync(abs)) {
				if (f.endsWith('.md')) rmSync(join(abs, f), { force: true });
			}
		}
	}

	const staticDir = join(out, 'static');
	mkdirSync(staticDir, { recursive: true });

	let activeBrief = brief;
	if (opts.fetchImages && brief?.images) {
		console.log('import: fetching chrome images …');
		const local = await fetchChosenImages(brief.images, staticDir);
		activeBrief = { ...brief, images: local };
	}

	const allImages = [
		...new Set([...ir.posts.flatMap((p) => p.imageUrls), ...ir.pages.flatMap((p) => p.imageUrls)])
	];
	const imageMap = await downloadImages(allImages, staticDir);
	await downloadRootAssets(ir.assets ?? [], staticDir);
	// Layout always links /favicon.svg — guarantee one exists for prerender.
	const faviconDest = join(staticDir, 'favicon.svg');
	if (!existsSync(faviconDest) && existsSync(DEFAULT_FAVICON)) {
		copyFileSync(DEFAULT_FAVICON, faviconDest);
	}

	for (const post of ir.posts) {
		const body = rewriteImageUrls(post.markdown, imageMap);
		const tags =
			post.tags.length > 0 ? `\ntags: [${post.tags.map((t) => yamlQuote(t)).join(', ')}]` : '';
		const desc = post.description ? `\ndescription: ${yamlQuote(post.description)}` : '';
		const md = `---
title: ${yamlQuote(post.title)}
date: ${post.date}
slug: ${yamlQuote(post.slug)}${desc}${tags}
---

${body}
`;
		writeFileSync(join(out, 'posts', postFilename(post.date, post.slug)), md);
	}

	for (const page of ir.pages) {
		const body = rewriteImageUrls(page.markdown, imageMap);
		const desc = page.description ? `\ndescription: ${yamlQuote(page.description)}` : '';
		const md = `---
title: ${yamlQuote(page.title)}${desc}
order: ${page.order}
---

${body}
`;
		writeFileSync(join(out, 'pages', `${page.slug}.md`), md);
	}

	const topicsLit = ir.topics
		.map((t) => `\t\t{ label: ${yamlQuote(t.label)}, tag: ${yamlQuote(t.tag)} }`)
		.join(',\n');
	const navLit = ir.nav
		.map((n) => `\t\t{ label: ${yamlQuote(n.label)}, href: ${yamlQuote(n.href)} }`)
		.join(',\n');
	const ledeLine = ir.lede ? `\n\tlede: ${yamlQuote(ir.lede)},` : '';
	const logo = activeBrief?.images?.logo;
	const logoLine = logo ? `\n\tlogo: ${yamlQuote(logo)},` : '';

	writeFileSync(
		join(out, 'downpress.config.ts'),
		`import { defineDownpressConfig } from 'downpress';

export default defineDownpressConfig({
	title: ${yamlQuote(title)},
	description: ${yamlQuote(ir.identity.description)},
	url: ${yamlQuote(url)},
	author: ${yamlQuote(author)},${ledeLine}${logoLine}
	nav: [
${navLit}
	],
	topics: [
${topicsLit}
	]
});
`
	);

	writeFileSync(join(out, 'theme.css'), themeCssFromBrief(activeBrief ?? undefined));

	const metaDir = join(out, '.downpress-import');
	mkdirSync(metaDir, { recursive: true });
	writeFileSync(join(metaDir, 'site-ir.json'), JSON.stringify(ir, null, 2));
	if (activeBrief)
		writeFileSync(join(metaDir, 'design-brief.json'), JSON.stringify(activeBrief, null, 2));
	const reportPath = join(metaDir, 'import-report.md');
	writeFileSync(reportPath, buildReport(ir, opts, activeBrief));

	// gitignore import cache
	const gi = join(out, '.gitignore');
	writeFileSync(
		gi,
		`/build
/node_modules
.DS_Store
Thumbs.db
.downpress-import/crawl-cache/
`
	);

	return { reportPath };
}

export function defaultEngineRoot(): string {
	// packages/import/src → repo root
	return resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
}

export function defaultOutPath(engineRoot: string, siteName: string): string {
	return resolve(engineRoot, '..', siteName);
}

export function siteNameFromUrl(source: string): string {
	try {
		const host = new URL(source).hostname.replace(/^www\./, '');
		return host.split('.')[0].toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'imported-site';
	} catch {
		return 'imported-site';
	}
}
