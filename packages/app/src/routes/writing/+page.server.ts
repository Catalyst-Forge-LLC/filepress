import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { postsIndexPath } from '@filepress/core';
import config from '$site-config';

export const load: PageServerLoad = () => {
	redirect(308, postsIndexPath(config));
};
