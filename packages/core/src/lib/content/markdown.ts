import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { rehypeFigure } from './rehype-figure';

/**
 * Markdown → HTML pipeline (build-time only).
 *
 * Decisions baked in here:
 * - GFM enabled (tables, strikethrough, task lists, autolinks).
 * - Raw HTML in post bodies is passed through (`allowDangerousHtml` + `rehype-raw`).
 *   The content trust boundary is "whoever can push to the repo", so this is the
 *   owner's own HTML.
 * - Headings get stable slug ids (`rehype-slug`) plus a self-anchor link
 *   (`rehype-autolink-headings`) so deep links work.
 * - Code blocks are syntax-highlighted at build time with a small language
 *   allowlist (not the full highlight.js registry).
 * - Image-only paragraphs become `<figure>` with a `<figcaption>` from the
 *   image title/alt (`rehype-figure`), for captioned editorial images.
 */
const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'wrap',
		properties: { className: ['heading-anchor'] }
	})
	.use(rehypeFigure)
	.use(rehypeHighlight, {
		detect: false,
		ignoreMissing: true,
		languages: {
			bash,
			css,
			go,
			javascript,
			js: javascript,
			json,
			markdown,
			md: markdown,
			python,
			rust,
			sql,
			typescript,
			ts: typescript,
			xml,
			html: xml,
			yaml,
			yml: yaml
		}
	})
	.use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(markdown: string): Promise<string> {
	const file = await processor.process(markdown);
	return String(file);
}
