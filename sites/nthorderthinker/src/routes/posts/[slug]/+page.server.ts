import type { EntryGenerator, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { content } from '$lib/content.server';

// Build a page for every published post plus every draft (drafts are unlinked
// but reachable by direct URL for preview, D7). Future-dated posts are excluded.
export const entries: EntryGenerator = () => {
	return content.getBuildableSlugs().map((slug) => ({ slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const post = await content.getRenderedPost(params.slug);
	if (!post) {
		error(404, `No post found for "${params.slug}".`);
	}
	const isDraft = content.loadPostSources().some((p) => p.slug === params.slug && p.draft);
	const adjacent = content.getAdjacentPosts(params.slug);
	return { post, isDraft, adjacent };
};
