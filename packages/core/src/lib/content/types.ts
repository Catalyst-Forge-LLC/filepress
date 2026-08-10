/** Frontmatter as authored in a post's YAML block (before validation). */
export interface RawFrontmatter {
	title?: unknown;
	date?: unknown;
	slug?: unknown;
	description?: unknown;
	excerpt?: unknown;
	tags?: unknown;
	draft?: unknown;
	updated?: unknown;
	author?: unknown;
}

/** Validated, normalized metadata for a single post. */
export interface PostMeta {
	/** URL path segment, e.g. "my-first-post". */
	slug: string;
	title: string;
	/** Publish date, strict YYYY-MM-DD. */
	date: string;
	/** Optional last-updated date, strict YYYY-MM-DD. */
	updated: string | null;
	/** Short summary for listings and SEO; null if not provided. */
	description: string | null;
	/** Normalized (lowercased, trimmed, de-duplicated) tags. */
	tags: string[];
	/** Optional per-post author byline; null falls back to the site author in views. */
	author: string | null;
	draft: boolean;
	/** Source file path relative to the repo root, e.g. "/posts/foo.md". */
	sourcePath: string;
}

/** A post's metadata plus its raw (uncompiled) Markdown body. */
export interface PostSource extends PostMeta {
	body: string;
}

/** A fully rendered post: metadata plus compiled HTML body. */
export interface RenderedPost extends PostMeta {
	html: string;
}

/** Frontmatter as authored in a static page's YAML block (before validation). */
export interface RawPageFrontmatter {
	title?: unknown;
	slug?: unknown;
	description?: unknown;
	excerpt?: unknown;
	draft?: unknown;
	/** Optional nav/sort weight; lower first. */
	order?: unknown;
}

/** Validated metadata for a static Markdown page (`pages/*.md` → `/<slug>`). */
export interface PageMeta {
	slug: string;
	title: string;
	description: string | null;
	draft: boolean;
	/** Sort weight for listings/nav helpers; default 0. */
	order: number;
	/** Source file path, e.g. "/pages/about.md". */
	sourcePath: string;
}

export interface PageSource extends PageMeta {
	body: string;
}

export interface RenderedPage extends PageMeta {
	html: string;
}

/**
 * Path segments reserved by the engine. A `pages/<slug>.md` file must not use
 * these (or collide with another page slug).
 */
export const RESERVED_PAGE_SLUGS = [
	'posts',
	'writing',
	'tags',
	'topics',
	'page',
	'rss.xml',
	'sitemap.xml',
	'robots.txt'
] as const;
