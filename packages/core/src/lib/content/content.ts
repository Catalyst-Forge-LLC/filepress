import { readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { PostMeta, PostSource, RenderedPost } from './types';
import { assertUniqueSlugs, ContentError, normalizeTag, parsePost } from './parse';
import { renderMarkdown } from './markdown';

export interface ContentApi {
	loadPostSources(): PostSource[];
	/** Production truth: non-draft, date ≤ today. Feeds and sitemap use this. */
	getPublishedPosts(): PostMeta[];
	/**
	 * What the index / tags / topics show. Same as published in production;
	 * includes drafts under `pnpm dev` (or `FILEPRESS_SHOW_DRAFTS=1`).
	 */
	getListedPosts(): PostMeta[];
	listsDrafts(): boolean;
	getIndexPage(
		page: number,
		perPage: number
	): { featured: PostMeta | null; posts: PostMeta[]; page: number; totalPages: number };
	getIndexPageCount(perPage: number): number;
	getBuildableSlugs(): string[];
	getRenderedPost(slug: string): Promise<RenderedPost | null>;
	getAllTags(): { tag: string; count: number }[];
	getPostsByTag(tag: string): PostMeta[];
	getAdjacentPosts(slug: string): { older: PostMeta | null; newer: PostMeta | null };
}

export interface CreateContentOptions {
	contentDir: string;
	/** Override draft listing. Default: on in Vite DEV, or when FILEPRESS_SHOW_DRAFTS is 1/true. */
	listDrafts?: boolean;
}

/**
 * Whether listings should include `draft: true` posts. Production builds stay
 * closed unless FILEPRESS_SHOW_DRAFTS forces them open (rare; mainly for checks).
 */
export function resolveListDrafts(override?: boolean): boolean {
	if (override !== undefined) return override;
	const env = process.env.FILEPRESS_SHOW_DRAFTS?.trim();
	if (env === '1' || env === 'true') return true;
	if (env === '0' || env === 'false') return false;
	return Boolean(import.meta.env.DEV);
}

/**
 * Build a content API bound to one content directory. This is the seam a site
 * wires up in a server-only module: `createContent({ contentDir: 'posts' })`.
 *
 * Reads the filesystem, so it must only be imported from server code
 * (`+page.server.ts`, `+server.ts`, or a `*.server.ts` lib module). The pure
 * parsing/validation logic lives in `parse.ts` and is safe to import anywhere.
 */
export function createContent(opts: CreateContentOptions): ContentApi {
	const dir = isAbsolute(opts.contentDir)
		? opts.contentDir
		: resolve(process.cwd(), opts.contentDir);
	const listDrafts = resolveListDrafts(opts.listDrafts);

	// One prerender pass per build, so cache parsed posts in production; re-read
	// each time in dev so edits show on refresh.
	let cache: PostSource[] | null = null;

	function loadPostSources(): PostSource[] {
		if (cache && import.meta.env.PROD) return cache;

		let filenames: string[];
		try {
			filenames = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
		} catch (e: unknown) {
			const detail = e instanceof Error ? e.message : String(e);
			throw new ContentError(`Could not read content directory "${dir}": ${detail}`);
		}

		const posts = filenames
			.sort((a, b) => a.localeCompare(b))
			.map((name) => parsePost(`/${name}`, readFileSync(join(dir, name), 'utf8')));

		assertUniqueSlugs(posts);
		cache = posts;
		return posts;
	}

	const today = () => new Date().toISOString().slice(0, 10);
	const isPublished = (post: PostSource, now: string) => !post.draft && post.date <= now;
	const byDateDesc = (a: PostMeta, b: PostMeta) =>
		a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug);
	const toMeta = (post: PostSource): PostMeta => {
		const { body: _body, ...meta } = post;
		return meta;
	};

	function getPublishedPosts(): PostMeta[] {
		const now = today();
		return loadPostSources()
			.filter((p) => isPublished(p, now))
			.sort(byDateDesc)
			.map(toMeta);
	}

	function getListedPosts(): PostMeta[] {
		const now = today();
		return loadPostSources()
			.filter((p) => {
				if (isPublished(p, now)) return true;
				// Drafts show in local listings regardless of date so future-dated
				// work-in-progress is previewable. Future *published* posts stay hidden.
				return listDrafts && p.draft;
			})
			.sort(byDateDesc)
			.map(toMeta);
	}

	function getIndexPage(page: number, perPage: number) {
		const listed = getListedPosts();
		const featured = listed[0] ?? null;
		const rest = listed.slice(1);
		const size = Math.max(1, Math.floor(perPage));
		const totalPages = Math.max(1, Math.ceil(rest.length / size));
		const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
		const start = (current - 1) * size;
		return {
			featured: current === 1 ? featured : null,
			posts: rest.slice(start, start + size),
			page: current,
			totalPages
		};
	}

	function getIndexPageCount(perPage: number): number {
		const rest = Math.max(0, getListedPosts().length - 1);
		return Math.max(1, Math.ceil(rest / Math.max(1, Math.floor(perPage))));
	}

	function getBuildableSlugs(): string[] {
		const now = today();
		return loadPostSources()
			.filter((p) => p.draft || p.date <= now)
			.map((p) => p.slug);
	}

	function findBuildable(slug: string): PostSource | null {
		const now = today();
		return loadPostSources().find((p) => p.slug === slug && (p.draft || p.date <= now)) ?? null;
	}

	async function getRenderedPost(slug: string): Promise<RenderedPost | null> {
		const post = findBuildable(slug);
		if (!post) return null;
		const html = await renderMarkdown(post.body);
		return { ...toMeta(post), html };
	}

	function getAllTags(): { tag: string; count: number }[] {
		const counts = new Map<string, number>();
		for (const post of getListedPosts()) {
			for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
		return [...counts.entries()]
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => a.tag.localeCompare(b.tag));
	}

	function getPostsByTag(tag: string): PostMeta[] {
		const normalized = normalizeTag(tag);
		return getListedPosts().filter((p) => p.tags.includes(normalized));
	}

	function getAdjacentPosts(slug: string): { older: PostMeta | null; newer: PostMeta | null } {
		const listed = getListedPosts();
		const i = listed.findIndex((p) => p.slug === slug);
		if (i === -1) return { older: null, newer: null };
		return {
			newer: i > 0 ? listed[i - 1] : null,
			older: i < listed.length - 1 ? listed[i + 1] : null
		};
	}

	return {
		loadPostSources,
		getPublishedPosts,
		getListedPosts,
		listsDrafts: () => listDrafts,
		getIndexPage,
		getIndexPageCount,
		getBuildableSlugs,
		getRenderedPost,
		getAllTags,
		getPostsByTag,
		getAdjacentPosts
	};
}
