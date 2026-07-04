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
