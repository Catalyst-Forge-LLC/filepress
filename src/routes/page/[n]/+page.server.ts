import type { EntryGenerator, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getIndexPage, getIndexPageCount } from '$lib/content/posts';
import { site } from '$lib/config';

// Page 1 lives at "/"; this route covers pages 2..N only.
export const entries: EntryGenerator = () => {
	const count = getIndexPageCount(site.postsPerPage);
	const pages: { n: string }[] = [];
	for (let n = 2; n <= count; n++) pages.push({ n: String(n) });
	return pages;
};

export const load: PageServerLoad = ({ params }) => {
	const n = Number(params.n);
	const totalPages = getIndexPageCount(site.postsPerPage);
	if (!Number.isInteger(n) || n < 2 || n > totalPages) {
		error(404, `No such page "${params.n}".`);
	}
	return getIndexPage(n, site.postsPerPage);
};
