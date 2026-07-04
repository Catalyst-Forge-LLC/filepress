import type { PageServerLoad } from './$types';
import { getPublishedPosts } from '$lib/content/posts';

export const load: PageServerLoad = () => {
	return { posts: getPublishedPosts() };
};
