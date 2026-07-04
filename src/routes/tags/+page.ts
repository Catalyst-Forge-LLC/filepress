import type { PageLoad } from './$types';
import { getAllTags } from '$lib/content/posts';

export const load: PageLoad = () => {
	return { tags: getAllTags() };
};
