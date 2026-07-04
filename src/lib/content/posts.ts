import { readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import type { PostMeta, PostSource, RenderedPost } from './types';
import { assertUniqueSlugs, ContentError, normalizeTag, parsePost } from './parse';
import { renderMarkdown } from './markdown';

export { ContentError, slugify } from './parse';

/**
 * Absolute path to the content directory. Defaults to the in-repo `posts/`
 * (D6: content lives outside src/), but any site can point DOWNPRESS_CONTENT_DIR
 * at its own folder — absolute, or relative to the project root. This is what
 * lets one engine checkout build different sites, and is the seam the core/site
 * split (M4) will formalize.
 *
 * This module reads the filesystem, so it is server-only: content routes use
 * `+page.server.ts` loads (baked in at prerender). `$env/dynamic/private` also
 * guarantees it can never be bundled into client code.
 */
function contentDir(): string {
	const configured = env.DOWNPRESS_CONTENT_DIR?.trim() || 'posts';
	return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

// In a production build there is a single prerender pass, so cache the parsed
// posts. In dev, re-read each time so edits show on refresh.
let cache: PostSource[] | null = null;

/**
 * Parse, validate, and de-duplicate every post. Throws ContentError (naming the
 * file, and both files on slug collisions) so one malformed post fails the whole
 * build loudly instead of silently.
 */
export function loadPostSources(): PostSource[] {
	if (cache && import.meta.env.PROD) return cache;

	const dir = contentDir();
	let filenames: string[];
	try {
		filenames = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
	} catch (e: unknown) {
		const detail = e instanceof Error ? e.message : String(e);
		throw new ContentError(`Could not read content directory "${dir}": ${detail}`);
	}

	const posts = filenames
		.sort((a, b) => a.localeCompare(b))
		.map((name) => {
			const full = join(dir, name);
			const raw = readFileSync(full, 'utf8');
			// Use a stable, portable path in error messages and slug derivation.
			return parsePost(`/${name}`, raw);
		});

	assertUniqueSlugs(posts);

	cache = posts;
	return posts;
}

/** Today's date (YYYY-MM-DD) in UTC, used for the future-dated check at build time. */
function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/** True if the post should be publicly listed: not a draft and not future-dated (D8). */
function isPublished(post: PostSource, now: string): boolean {
	return !post.draft && post.date <= now;
}

function toMeta(post: PostSource): PostMeta {
	const { body: _body, ...meta } = post;
	return meta;
}

/** Published posts (non-draft, not future-dated), newest first. For index/tags/feed/sitemap. */
export function getPublishedPosts(): PostMeta[] {
	const now = today();
	return loadPostSources()
		.filter((p) => isPublished(p, now))
		.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)))
		.map(toMeta);
}

/**
 * Slugs whose page should be built. Published posts plus drafts (drafts get an
 * unlinked page for private preview, D7). Future-dated non-drafts are excluded
 * until their date arrives.
 */
export function getBuildableSlugs(): string[] {
	const now = today();
	return loadPostSources()
		.filter((p) => p.draft || p.date <= now)
		.map((p) => p.slug);
}

/** Find one buildable post source by slug (or null). */
function findBuildable(slug: string): PostSource | null {
	const now = today();
	return loadPostSources().find((p) => p.slug === slug && (p.draft || p.date <= now)) ?? null;
}

/** Render a single post (metadata + compiled HTML) by slug, or null if not buildable. */
export async function getRenderedPost(slug: string): Promise<RenderedPost | null> {
	const post = findBuildable(slug);
	if (!post) return null;
	const html = await renderMarkdown(post.body);
	return { ...toMeta(post), html };
}

/** All published tags with their post counts, sorted alphabetically. */
export function getAllTags(): { tag: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const post of getPublishedPosts()) {
		for (const tag of post.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Published posts carrying a given tag, newest first. */
export function getPostsByTag(tag: string): PostMeta[] {
	const normalized = normalizeTag(tag);
	return getPublishedPosts().filter((p) => p.tags.includes(normalized));
}
