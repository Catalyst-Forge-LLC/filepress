import matter from 'gray-matter';
import type { PostMeta, PostSource, RawFrontmatter, RenderedPost } from './types';
import { renderMarkdown } from './markdown';

/**
 * Raw contents of every Markdown file in the top-level /posts/ directory,
 * inlined at build time. `/posts/` resolves from the project root (D6: content
 * lives outside src/ so it's easy to browse/edit from the GitHub mobile app).
 *
 * `eager: true` is correct for a build-time static site of blog scale — do not
 * switch to lazy loading (that pattern is for request-time SSR, which we don't do).
 */
const rawPosts = import.meta.glob('/posts/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/**
 * A content error that names the offending file. The build must fail loudly and
 * attributably (per PHASE_1_BRIEF §3 and GENESIS edge cases 1–3), never crash
 * with a generic stack trace or silently drop a post.
 */
export class ContentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContentError';
	}
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a strict YYYY-MM-DD date string and confirm it's a real calendar date. */
function assertValidDate(value: string, field: string, file: string): string {
	if (!DATE_RE.test(value)) {
		throw new ContentError(
			`${file}: invalid \`${field}\` "${value}" — dates must be strictly YYYY-MM-DD (e.g. 2026-07-04).`
		);
	}
	const [y, m, d] = value.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
		throw new ContentError(`${file}: \`${field}\` "${value}" is not a real calendar date.`);
	}
	return value;
}

/**
 * Derive a URL-safe slug from a string. Lowercases, trims, turns whitespace and
 * underscores into hyphens, and drops any character that isn't a Unicode letter,
 * number, or hyphen (emoji and punctuation are stripped; accented letters kept).
 */
export function slugify(input: string): string {
	return input
		.normalize('NFKC')
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/[^\p{L}\p{N}-]+/gu, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Normalize a tag: coerce to string, trim, lowercase (edge case 13). */
function normalizeTag(tag: unknown): string {
	return String(tag).trim().toLowerCase();
}

function filenameOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
}

/** Parse and validate one raw Markdown file into a PostSource. Throws ContentError. */
function parsePost(path: string, raw: string): PostSource {
	let parsed: matter.GrayMatterFile<string>;
	try {
		// gray-matter tolerates trailing whitespace after the closing `---` (edge case 8).
		parsed = matter(raw);
	} catch (e: unknown) {
		const detail = e instanceof Error ? e.message : String(e);
		throw new ContentError(`${path}: could not parse YAML frontmatter — ${detail}`);
	}

	const fm = parsed.data as RawFrontmatter;

	if (fm.title === undefined || fm.title === null || String(fm.title).trim() === '') {
		throw new ContentError(`${path}: missing required frontmatter field \`title\`.`);
	}
	if (fm.date === undefined || fm.date === null || String(fm.date).trim() === '') {
		throw new ContentError(`${path}: missing required frontmatter field \`date\`.`);
	}

	const title = String(fm.title).trim();
	// A phone keyboard may leave `date` as a Date object (YAML auto-parses unquoted
	// dates) or a string; normalize to the raw text and validate strictly.
	const rawDate =
		fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date).trim();
	const date = assertValidDate(rawDate, 'date', path);

	let updated: string | null = null;
	if (fm.updated !== undefined && fm.updated !== null && String(fm.updated).trim() !== '') {
		const rawUpdated =
			fm.updated instanceof Date
				? fm.updated.toISOString().slice(0, 10)
				: String(fm.updated).trim();
		updated = assertValidDate(rawUpdated, 'updated', path);
	}

	const explicitSlug = fm.slug !== undefined && fm.slug !== null && String(fm.slug).trim() !== '';
	const slug = slugify(explicitSlug ? String(fm.slug) : filenameOf(path));
	if (slug === '') {
		throw new ContentError(
			`${path}: could not derive a non-empty slug from ${explicitSlug ? 'the `slug` field' : 'the filename'}.`
		);
	}

	const descriptionRaw = fm.description ?? fm.excerpt;
	const description =
		descriptionRaw !== undefined && descriptionRaw !== null && String(descriptionRaw).trim() !== ''
			? String(descriptionRaw).trim()
			: null;

	let tags: string[] = [];
	if (fm.tags !== undefined && fm.tags !== null) {
		if (!Array.isArray(fm.tags)) {
			throw new ContentError(
				`${path}: \`tags\` must be a YAML list (e.g. tags: [notes, sveltekit]), got ${typeof fm.tags}.`
			);
		}
		tags = [...new Set(fm.tags.map(normalizeTag).filter((t) => t !== ''))];
	}

	const draft = fm.draft === true;

	return {
		slug,
		title,
		date,
		updated,
		description,
		tags,
		draft,
		sourcePath: path,
		body: parsed.content
	};
}

let cache: PostSource[] | null = null;

/**
 * Parse, validate, and de-duplicate every post. Runs once, cached for the build.
 * Throws ContentError (naming the file, and both files on slug collisions) so a
 * single malformed post fails the whole build loudly instead of silently.
 */
export function loadPostSources(): PostSource[] {
	if (cache) return cache;

	const posts = Object.entries(rawPosts)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([path, raw]) => parsePost(path, raw));

	// Duplicate-slug detection — name both offending files (edge case 3).
	const bySlug = new Map<string, string>();
	for (const post of posts) {
		const existing = bySlug.get(post.slug);
		if (existing) {
			throw new ContentError(
				`Duplicate slug "${post.slug}" produced by two files: ${existing} and ${post.sourcePath}. ` +
					`Set a distinct \`slug\` in one file's frontmatter or rename it.`
			);
		}
		bySlug.set(post.slug, post.sourcePath);
	}

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
	return (
		loadPostSources().find((p) => p.slug === slug && (p.draft || p.date <= now)) ?? null
	);
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
