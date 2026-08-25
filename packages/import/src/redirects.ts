import {
	redirectsFromSourceUrls,
	writingPostRedirects,
	type RedirectRule
} from '../../core/src/lib/redirects.ts';
import type { SiteIR } from './ir.ts';

/** Old source paths → FilePress URLs, plus `/writing` when home becomes a page. */
export function importRedirectRules(
	ir: Pick<SiteIR, 'posts' | 'pages' | 'homeMarkdown'>
): RedirectRule[] {
	const pairs = [
		...ir.posts.map((p) => ({ sourceUrl: p.sourceUrl, destPath: `/posts/${p.slug}` })),
		...ir.pages.map((p) => ({ sourceUrl: p.sourceUrl, destPath: `/${p.slug}` }))
	];
	return [...(ir.homeMarkdown ? writingPostRedirects() : []), ...redirectsFromSourceUrls(pairs)];
}
