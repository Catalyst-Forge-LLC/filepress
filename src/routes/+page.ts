import type { PageLoad } from './$types';
import { getPublishedPosts } from '$lib/content/posts';

export const load: PageLoad = () => {
	return { posts: getPublishedPosts() };
};
