import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { discoverXFactsLabels } from '@filepress/core/server';
import { content } from '$lib/content.server';
import { pages } from '$lib/pages.server';
import { getSiteRoot } from '$lib/site.server';
import config from '$site-config';

export const load: PageServerLoad = async () => {
	const xfactsLabels = discoverXFactsLabels(getSiteRoot());
	if (config.homePage) {
		const page = await pages.getRenderedPage(config.homePage);
		if (!page) {
			error(
				500,
				`homePage "${config.homePage}" not found — add pages/${config.homePage}.md`
			);
		}
		return {
			mode: 'page' as const,
			page,
			isDraft: page.draft,
			xfactsLabels
		};
	}

	const index = content.getIndexPage(1, config.postsPerPage);
	return {
		mode: 'posts' as const,
		...index,
		xfactsLabels
	};
};
