import type { EntryGenerator, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { content } from '$lib/content.server';

export const entries: EntryGenerator = () => {
	return content.getAllTags().map(({ tag }) => ({ tag }));
};

export const load: PageServerLoad = ({ params }) => {
	const posts = content.getPostsByTag(params.tag);
	if (posts.length === 0) {
		error(404, `No posts tagged "${params.tag}".`);
	}
	return { tag: params.tag, posts };
};
