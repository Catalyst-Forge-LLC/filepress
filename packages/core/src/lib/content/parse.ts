import matter from 'gray-matter';
import type { PageSource, PostSource, RawFrontmatter, RawPageFrontmatter } from './types';
import { RESERVED_PAGE_SLUGS } from './types';

/**
 * A content error that names the offending file. The build must fail loudly and
 * attributably (per PHASE_1_BRIEF §3 and GENESIS edge cases 1–3), never crash
 * with a generic stack trace or silently drop a post.
 *
 * This module is deliberately free of `import.meta.glob` / Vite specifics so the
 * parsing + validation logic can be unit-tested in isolation.
 */
export class ContentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContentError';
	}
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a strict YYYY-MM-DD date string and confirm it's a real calendar date. */
export function assertValidDate(value: string, field: string, file: string): string {
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
export function normalizeTag(tag: unknown): string {
	return String(tag).trim().toLowerCase();
}

/** Filename (no extension, no directory) from a "/posts/foo.md" style path. */
export function filenameOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
}

function normalizeDateInput(value: unknown): string {
	// YAML auto-parses unquoted dates into Date objects; a phone may also type a
	// string. Normalize both to the YYYY-MM-DD text before strict validation.
	return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
}

/** Parse and validate one raw Markdown file into a PostSource. Throws ContentError. */
export function parsePost(path: string, raw: string): PostSource {
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
	const date = assertValidDate(normalizeDateInput(fm.date), 'date', path);

	let updated: string | null = null;
	if (fm.updated !== undefined && fm.updated !== null && String(fm.updated).trim() !== '') {
		updated = assertValidDate(normalizeDateInput(fm.updated), 'updated', path);
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

	const author =
		fm.author !== undefined && fm.author !== null && String(fm.author).trim() !== ''
			? String(fm.author).trim()
			: null;

	const draft = fm.draft === true;

	return {
		slug,
		title,
		date,
		updated,
		description,
		tags,
		author,
		draft,
		sourcePath: path,
		body: parsed.content
	};
}

/** Throw if any two sources resolve to the same slug, naming both files (edge case 3). */
export function assertUniqueSlugs(sources: { slug: string; sourcePath: string }[]): void {
	const bySlug = new Map<string, string>();
	for (const item of sources) {
		const existing = bySlug.get(item.slug);
		if (existing) {
			throw new ContentError(
				`Duplicate slug "${item.slug}" produced by two files: ${existing} and ${item.sourcePath}. ` +
					`Set a distinct \`slug\` in one file's frontmatter or rename it.`
			);
		}
		bySlug.set(item.slug, item.sourcePath);
	}
}

const RESERVED = new Set<string>(RESERVED_PAGE_SLUGS);

/** Parse and validate one static page Markdown file. Throws ContentError. */
export function parsePage(
	path: string,
	raw: string,
	extraReservedSlugs: string[] = []
): PageSource {
	let parsed: matter.GrayMatterFile<string>;
	try {
		parsed = matter(raw);
	} catch (e: unknown) {
		const detail = e instanceof Error ? e.message : String(e);
		throw new ContentError(`${path}: could not parse YAML frontmatter — ${detail}`);
	}

	const fm = parsed.data as RawPageFrontmatter;

	if (fm.title === undefined || fm.title === null || String(fm.title).trim() === '') {
		throw new ContentError(`${path}: missing required frontmatter field \`title\`.`);
	}

	const title = String(fm.title).trim();
	const explicitSlug = fm.slug !== undefined && fm.slug !== null && String(fm.slug).trim() !== '';
	const slug = slugify(explicitSlug ? String(fm.slug) : filenameOf(path));
	if (slug === '') {
		throw new ContentError(
			`${path}: could not derive a non-empty slug from ${explicitSlug ? 'the `slug` field' : 'the filename'}.`
		);
	}
	const reserved = new Set([...RESERVED, ...extraReservedSlugs.map((s) => s.trim().toLowerCase())]);
	if (reserved.has(slug)) {
		const extras =
			extraReservedSlugs.length > 0
				? `, plus path mounts: ${extraReservedSlugs.join(', ')}`
				: '';
		throw new ContentError(
			`${path}: slug "${slug}" is reserved by the engine (${RESERVED_PAGE_SLUGS.join(', ')}${extras}). ` +
				`Rename the file or set a different \`slug\` in frontmatter.`
		);
	}

	const descriptionRaw = fm.description ?? fm.excerpt;
	const description =
		descriptionRaw !== undefined && descriptionRaw !== null && String(descriptionRaw).trim() !== ''
			? String(descriptionRaw).trim()
			: null;

	let order = 0;
	if (fm.order !== undefined && fm.order !== null && String(fm.order).trim() !== '') {
		const n = Number(fm.order);
		if (!Number.isFinite(n)) {
			throw new ContentError(`${path}: \`order\` must be a number (got ${JSON.stringify(fm.order)}).`);
		}
		order = n;
	}

	return {
		slug,
		title,
		description,
		draft: fm.draft === true,
		order,
		sourcePath: path,
		body: parsed.content
	};
}
