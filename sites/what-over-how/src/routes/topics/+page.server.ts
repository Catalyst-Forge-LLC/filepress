import type { PageServerLoad } from './$types';
import { content } from '$lib/content.server';
import config from '$site-config';

const PREVIEW = 6;

export const load: PageServerLoad = () => {
	// Curated topics if the site defines them (Stratechery-style Explore);
	// otherwise fall back to every tag, alphabetically.
	const source = config.topics.length
		? config.topics.map((t) => ({ label: t.label, tag: t.tag }))
		: content.getAllTags().map((t) => ({ label: t.tag, tag: t.tag }));

	const groups = source
		.map(({ label, tag }) => {
			const posts = content.getPostsByTag(tag);
			return { label, tag, count: posts.length, posts: posts.slice(0, PREVIEW) };
		})
		.filter((g) => g.count > 0);

	return { groups, curated: config.topics.length > 0 };
};
