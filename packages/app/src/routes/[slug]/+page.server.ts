import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { pages } from '$lib/pages.server';

export const prerender = true;

export const entries: EntryGenerator = () => {
	return pages.getBuildableSlugs().map((slug) => ({ slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const page = await pages.getRenderedPage(params.slug);
	if (!page) error(404, `Page not found: ${params.slug}`);

	const isDraft = page.draft;
	return {
		page,
		isDraft
	};
};
