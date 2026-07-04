import type { EntryGenerator, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAllTags, getPostsByTag } from '$lib/content/posts';

export const entries: EntryGenerator = () => {
	return getAllTags().map(({ tag }) => ({ tag }));
};

export const load: PageServerLoad = ({ params }) => {
	const posts = getPostsByTag(params.tag);
	if (posts.length === 0) {
		error(404, `No posts tagged "${params.tag}".`);
	}
	return { tag: params.tag, posts };
};
