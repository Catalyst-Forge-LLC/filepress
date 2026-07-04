import type { EntryGenerator, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getBuildableSlugs, getRenderedPost, loadPostSources } from '$lib/content/posts';

// Build a page for every published post plus every draft (drafts are unlinked
// but reachable by direct URL for preview, D7). Future-dated posts are excluded.
export const entries: EntryGenerator = () => {
	return getBuildableSlugs().map((slug) => ({ slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const post = await getRenderedPost(params.slug);
	if (!post) {
		error(404, `No post found for "${params.slug}".`);
	}
	const isDraft = loadPostSources().some((p) => p.slug === params.slug && p.draft);
	return { post, isDraft };
};
