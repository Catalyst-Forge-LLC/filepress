import type { PageServerLoad } from './$types';
import { getIndexPage } from '$lib/content/posts';
import { site } from '$lib/config';

export const load: PageServerLoad = () => {
	return getIndexPage(1, site.postsPerPage);
};
