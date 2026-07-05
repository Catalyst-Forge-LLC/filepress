import type { PageServerLoad } from './$types';
import { getAllTags, getPostsByTag } from '$lib/content/posts';
import { site } from '$lib/config';

const PREVIEW = 6;

export const load: PageServerLoad = () => {
	// Curated topics if the site defines them (Stratechery-style Explore);
	// otherwise fall back to every tag, alphabetically.
	const source = site.topics.length
		? site.topics.map((t) => ({ label: t.label, tag: t.tag }))
		: getAllTags().map((t) => ({ label: t.tag, tag: t.tag }));

	const groups = source
		.map(({ label, tag }) => {
			const posts = getPostsByTag(tag);
			return { label, tag, count: posts.length, posts: posts.slice(0, PREVIEW) };
		})
		.filter((g) => g.count > 0);

	return { groups, curated: site.topics.length > 0 };
};
