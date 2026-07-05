import type { PageServerLoad } from './$types';
import { content } from '$lib/content.server';
import config from '$site-config';

export const load: PageServerLoad = () => content.getIndexPage(1, config.postsPerPage);
