#!/usr/bin/env node
/**
 * downpress import — crawl a site, extract content, scaffold a sibling Downpress site.
 *
 * Usage:
 *   pnpm --filter @downpress/import import -- --source https://example.com
 *   downpress import --source https://example.com --inspire https://www.catalystforge.com
 */
import { createInterface } from 'node:readline/promises';
import { isAbsolute, resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { discoverSite } from './discover.ts';
import { extractSite } from './extract.ts';
import { fetchText } from './fetch.ts';
import type { DesignBrief, ImportOptions } from './ir.ts';
import {
	briefFromInspiration,
	extractInspirationSignals,
	type InspirationSignals
} from './inspire.ts';
import { generateDesignBrief, ollamaAvailable, summarizeHtmlForBrief } from './ollama.ts';
import { harvestImagesFromPage, planImages, type ImagePlan } from './images.ts';
import { formatAttributionMarkdown, planStockCovers } from './stock.ts';
import { DEFAULT_BRIEF, themeCssFromBrief, tokensFromSourceCss } from './theme.ts';
import {
	defaultEngineRoot,
	defaultOutPath,
	siteNameFromUrl,
	writeSite
} from './write-site.ts';

/** pnpm sets INIT_CWD to the directory where the user invoked the command. */
function resolveUserPath(p: string): string {
	if (isAbsolute(p)) return p;
	const base = process.env.INIT_CWD?.trim() || process.cwd();
	return resolve(base, p);
}

function fail(msg: string): never {
	console.error(`downpress import: ${msg}`);
	process.exit(1);
}

function parseArgs(argv: string[]) {
	const out: {
		_: string[];
		source?: string;
		inspire: string[];
		out?: string;
		name?: string;
		title?: string;
		author?: string;
		url?: string;
		ollama: string;
		model: string;
		noLlm: boolean;
		dryRun: boolean;
		force: boolean;
		yes: boolean;
		fetchImages: boolean;
	} = {
		_: [],
		inspire: [],
		ollama: process.env.OLLAMA_HOST?.trim() || 'http://127.0.0.1:11434',
		model: process.env.DOWNPRESS_OLLAMA_MODEL?.trim() || 'gemma4:12b',
		noLlm: false,
		dryRun: false,
		force: false,
		yes: false,
		fetchImages: false
	};

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => {
			const v = argv[++i];
			if (!v) fail(`${a} requires a value`);
			return v;
		};
		if (a === '--source') out.source = next();
		else if (a === '--inspire') out.inspire.push(next());
		else if (a === '--out') out.out = next();
		else if (a === '--name') out.name = next();
		else if (a === '--title') out.title = next();
		else if (a === '--author') out.author = next();
		else if (a === '--url') out.url = next();
		else if (a === '--ollama') out.ollama = next();
		else if (a === '--model') out.model = next();
		else if (a === '--no-llm') out.noLlm = true;
		else if (a === '--dry-run') out.dryRun = true;
		else if (a === '--force') out.force = true;
		else if (a === '--yes' || a === '-y') out.yes = true;
		else if (a === '--fetch-images') out.fetchImages = true;
		else if (a === '--help' || a === '-h') out._.push('help');
		else out._.push(a);
	}
	return out;
}

async function prompt(rl: ReturnType<typeof createInterface>, q: string, def?: string) {
	const hint = def ? ` [${def}]` : '';
	const ans = (await rl.question(`${q}${hint}: `)).trim();
	return ans || def || '';
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args._.includes('help')) {
		console.log(`Usage: downpress import --source <url> [options]

Options:
  --source <url>       Site to import (required)
  --inspire <url>      Inspiration site (repeatable, up to 3; blended into one theme)
  --out <path>         Sibling output directory
  --name <slug>        Site package name (lowercase)
  --title / --author / --url
  --ollama <host>      Default http://127.0.0.1:11434
  --model <name>       Default gemma4:12b
  --no-llm             Skip Ollama; token theme from source CSS / defaults
  --dry-run            Crawl + report only (no write)
  --force              Overwrite generated content in --out
  --fetch-images       Download Openverse CC covers + source portrait/logo into static/images/
  --yes                Skip confirmation prompt
`);
		return;
	}

	const interactive = Boolean(process.stdin.isTTY) && !args.yes;
	const rl = interactive ? createInterface({ input, output }) : null;

	try {
		let source = args.source || '';
		if (!source && rl) source = await prompt(rl, 'Source site URL');
		if (!source) fail('`--source` is required');

		let inspire = [...args.inspire];
		if (!inspire.length && rl) {
			for (let n = 1; n <= 3; n++) {
				const q =
					n === 1
						? 'Inspiration URL 1/3 (optional, blank to skip)'
						: `Inspiration URL ${n}/3 (optional, blank to stop)`;
				const one = await prompt(rl, q);
				if (!one) break;
				inspire.push(one);
			}
		}
		if (inspire.length > 3) {
			console.warn('import: using first 3 --inspire URLs (max 3)');
			inspire = inspire.slice(0, 3);
		}

		const engineRoot = defaultEngineRoot();
		const siteName = (args.name || siteNameFromUrl(source)).replace(/[^a-z0-9-]/g, '');
		if (!siteName) fail('could not derive a site name; pass --name');

		let out = args.out
			? resolveUserPath(args.out)
			: defaultOutPath(engineRoot, siteName);
		if (rl && !args.out) {
			const picked = await prompt(rl, 'Output directory', out);
			if (picked) out = resolveUserPath(picked);
		}

		const opts: ImportOptions = {
			source,
			inspire,
			out,
			siteName,
			title: args.title,
			author: args.author,
			canonicalUrl: args.url,
			ollamaHost: args.ollama,
			ollamaModel: args.model,
			noLlm: args.noLlm,
			dryRun: args.dryRun,
			force: args.force,
			fetchImages: args.fetchImages,
			engineRoot
		};

		console.log(`\nimport: discovering ${source} …`);
		const discovered = await discoverSite(source);
		console.log(
			`import: found ${discovered.urls.length} URLs, ${discovered.rss.length} RSS items`
		);

		console.log('import: extracting content …');
		const ir = await extractSite(discovered);
		if (opts.title) ir.identity.title = opts.title;
		if (opts.author) ir.identity.author = opts.author;
		if (opts.canonicalUrl) ir.identity.canonicalUrl = opts.canonicalUrl.replace(/\/+$/, '');

		console.log(
			`import: ${ir.posts.length} posts, ${ir.pages.length} pages, title="${ir.identity.title}"`
		);

		let brief: DesignBrief | null = null;
		const homeHtml = await fetchText(discovered.origin)
			.then((r) => r.text)
			.catch(() => '');

		// Inspiration drives the look. Source site only fills gaps when no --inspire.
		const inspireSignals: InspirationSignals[] = [];
		const inspireSummaries: string[] = [];
		for (const u of inspire) {
			try {
				console.log(`import: sampling inspiration ${u} …`);
				const signals = await extractInspirationSignals(u);
				inspireSignals.push(signals);
				const { text } = await fetchText(u);
				inspireSummaries.push(`${u}: ${summarizeHtmlForBrief(text)}`);
				console.log(`  → ${signals.paletteMode} · ${signals.notes.join(' · ')}`);
			} catch (e) {
				console.warn(
					`import: inspiration fetch failed ${u}: ${e instanceof Error ? e.message : e}`
				);
			}
		}

		const seed =
			inspireSignals.length > 0
				? briefFromInspiration(inspireSignals)
				: {
						...DEFAULT_BRIEF,
						tokens: { ...DEFAULT_BRIEF.tokens, ...tokensFromSourceCss(homeHtml) }
					};

		if (!opts.noLlm) {
			const up = await ollamaAvailable(opts.ollamaHost);
			if (!up) {
				console.warn(
					`import: Ollama not reachable at ${opts.ollamaHost}; using extracted inspiration brief`
				);
				brief = seed;
			} else {
				console.log(`import: refining design brief with ${opts.ollamaModel} …`);
				brief = await generateDesignBrief({
					host: opts.ollamaHost,
					model: opts.ollamaModel,
					ir,
					inspireSummaries,
					inspireSignals,
					seed
				});
			}
		} else {
			brief = seed;
		}

		console.log('import: harvesting image candidates …');
		const harvested = [];
		for (const u of [source, ...inspire]) {
			try {
				harvested.push(...(await harvestImagesFromPage(u, u)));
			} catch (e) {
				console.warn(
					`import: image harvest failed ${u}: ${e instanceof Error ? e.message : e}`
				);
			}
		}
		let imagePlan: ImagePlan = planImages(ir, harvested, brief);
		ir.notes.push(...imagePlan.notes);
		console.log(
			`import: ${harvested.length} image candidates · hero=${imagePlan.chosen.hero ? 'yes' : 'no'}`
		);

		if (opts.dryRun) {
			console.log('\n--- dry-run SiteIR summary ---');
			console.log(
				JSON.stringify(
					{
						identity: ir.identity,
						posts: ir.posts.map((p) => ({
							slug: p.slug,
							date: p.date,
							title: p.title,
							tags: p.tags
						})),
						pages: ir.pages.map((p) => ({ slug: p.slug, title: p.title })),
						nav: ir.nav,
						topics: ir.topics,
						lede: ir.lede,
						notes: ir.notes,
						images: imagePlan.chosen,
						unsplashQueries: imagePlan.unsplashQueries
					},
					null,
					2
				)
			);
			if (brief) {
				console.log('\n--- design brief ---');
				console.log(JSON.stringify(brief, null, 2));
				console.log('\n--- theme.css preview (first 60 lines) ---');
				console.log(themeCssFromBrief(brief).split('\n').slice(0, 60).join('\n'));
			}
			console.log(`\nimport: dry-run complete (would write to ${out})`);
			return;
		}

		if (rl && !args.yes) {
			const ok = await prompt(rl, `Write site to ${out}?`, 'y');
			if (!/^y(es)?$/i.test(ok)) {
				console.log('import: aborted');
				return;
			}
		}

		if (opts.fetchImages) {
			console.log('import: searching Openverse for free stock covers …');
			const stock = await planStockCovers(brief, {
				author: ir.identity.author,
				includeHeader: true,
				includeHero: false
			});
			ir.notes.push(...stock.notes);
			const attr = formatAttributionMarkdown(stock.hits);
			if (attr) ir.notes.push('Stock attribution:', attr);
			// Covers from stock; portrait/logo from source harvest only.
			brief = {
				...brief,
				images: {
					...imagePlan.chosen,
					...stock.images,
					portrait: imagePlan.chosen.portrait,
					logo: imagePlan.chosen.logo
				}
			};
		}

		console.log(`import: writing ${out} …`);
		const { reportPath } = await writeSite(ir, opts, brief);
		console.log(`import: done.\n  report: ${reportPath}\n  next: cd ${out} && pnpm install && pnpm downpress dev`);
	} finally {
		rl?.close();
	}
}

main().catch((e) => {
	fail(e instanceof Error ? e.message : String(e));
});
