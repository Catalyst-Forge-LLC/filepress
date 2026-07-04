import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

/**
 * Markdown → HTML pipeline (build-time only).
 *
 * Decisions baked in here:
 * - GFM enabled (tables, strikethrough, task lists, autolinks).
 * - Raw HTML in post bodies is passed through (`allowDangerousHtml` + `rehype-raw`).
 *   The content trust boundary is "whoever can push to the repo", so this is the
 *   owner's own HTML. Documented in docs/PHASE_1_BRIEF.md / README.
 * - Headings get stable slug ids (`rehype-slug`) plus a self-anchor link
 *   (`rehype-autolink-headings`) so deep links work.
 * - Code blocks are syntax-highlighted at build time (`rehype-highlight`,
 *   highlight.js). A theme stylesheet is imported globally in app.css.
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
	.use(rehypeHighlight, { detect: true, ignoreMissing: true })
	.use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(markdown: string): Promise<string> {
	const file = await processor.process(markdown);
	return String(file);
}
