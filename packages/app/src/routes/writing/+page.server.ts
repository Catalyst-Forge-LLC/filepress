import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { content } from '$lib/content.server';
import config from '$site-config';

export const load: PageServerLoad = () => {
	// Without homePage, the post index stays at `/` — keep /writing as an alias.
	if (!config.homePage) {
		redirect(302, '/');
	}
	return content.getIndexPage(1, config.postsPerPage);
};
