import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { content } from '$lib/content.server';
import config from '$site-config';

export const load: PageServerLoad = () => {
	if (!config.homePage) {
		redirect(302, '/');
	}
	return content.getIndexPage(1, config.postsPerPage);
};
