import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { PageMeta, PageSource, RenderedPage } from './types';
import { ContentError, assertUniqueSlugs, parsePage } from './parse';
import { renderMarkdown } from './markdown';
import { resolveListDrafts } from './content';

export interface PagesApi {
	loadPageSources(): PageSource[];
	/** Non-draft pages (sitemap, public nav helpers). */
	getPublishedPages(): PageMeta[];
	/** Listed pages: published, plus drafts under `pnpm dev`. */
	getListedPages(): PageMeta[];
	listsDrafts(): boolean;
	getBuildableSlugs(): string[];
	getRenderedPage(slug: string): Promise<RenderedPage | null>;
}

export interface CreatePagesOptions {
	/** Absolute or cwd-relative path to `pages/`. Missing dir → empty site (ok). */
	pagesDir: string;
	listDrafts?: boolean;
	/**
	 * Extra slugs reserved against `pages/*.md` (e.g. first segments of `paths` mounts).
	 * Merged with {@link RESERVED_PAGE_SLUGS}.
	 */
	extraReservedSlugs?: string[];
}

/**
 * Content API for static Markdown pages (`pages/*.md` → `/<slug>`).
 * Absent `pages/` directory is fine — returns empty lists.
 */
export function createPages(opts: CreatePagesOptions): PagesApi {
	const dir = isAbsolute(opts.pagesDir)
		? opts.pagesDir
		: resolve(process.cwd(), opts.pagesDir);
	const listDrafts = resolveListDrafts(opts.listDrafts);
	const extraReserved = (opts.extraReservedSlugs ?? [])
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	let cache: PageSource[] | null = null;

	function loadPageSources(): PageSource[] {
		if (cache && import.meta.env.PROD) return cache;

		if (!existsSync(dir)) {
			cache = [];
			return cache;
		}

		let filenames: string[];
		try {
			filenames = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
		} catch (e: unknown) {
			const detail = e instanceof Error ? e.message : String(e);
			throw new ContentError(`Could not read pages directory "${dir}": ${detail}`);
		}

		const pages = filenames
			.sort((a, b) => a.localeCompare(b))
			.map((name) =>
				parsePage(`/pages/${name}`, readFileSync(join(dir, name), 'utf8'), extraReserved)
			);

		assertUniqueSlugs(pages);
		cache = pages;
		return pages;
	}

	const toMeta = (page: PageSource): PageMeta => {
		const { body: _body, ...meta } = page;
		return meta;
	};

	const byOrder = (a: PageMeta, b: PageMeta) =>
		a.order !== b.order ? a.order - b.order : a.slug.localeCompare(b.slug);

	function getPublishedPages(): PageMeta[] {
		return loadPageSources()
			.filter((p) => !p.draft)
			.sort(byOrder)
			.map(toMeta);
	}

	function getListedPages(): PageMeta[] {
		return loadPageSources()
			.filter((p) => !p.draft || listDrafts)
			.sort(byOrder)
			.map(toMeta);
	}

	function getBuildableSlugs(): string[] {
		return loadPageSources().map((p) => p.slug);
	}

	async function getRenderedPage(slug: string): Promise<RenderedPage | null> {
		const page = loadPageSources().find((p) => p.slug === slug);
		if (!page) return null;
		const html = await renderMarkdown(page.body);
		return { ...toMeta(page), html };
	}

	return {
		loadPageSources,
		getPublishedPages,
		getListedPages,
		listsDrafts: () => listDrafts,
		getBuildableSlugs,
		getRenderedPage
	};
}
