import type { PageServerLoad } from './$types';
import { getAllTags } from '$lib/content/posts';

export const load: PageServerLoad = () => {
	return { tags: getAllTags() };
};
