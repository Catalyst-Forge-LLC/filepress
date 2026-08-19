/**
 * Dynamic routes that may have zero `entries()` and still be a valid site:
 * no extra index pages, no tags, no Markdown pages, or no posts (pages-only).
 */
export const prerenderEmptyOk = [
	'/page/[n]',
	'/tags/[tag]',
	'/[slug]',
	'/posts/[slug]'
] as const;

export function unexpectedUnseenPrerenderRoutes(routes: string[]): string[] {
	const ok = new Set<string>(prerenderEmptyOk);
	return routes.filter((route) => !ok.has(route));
}
