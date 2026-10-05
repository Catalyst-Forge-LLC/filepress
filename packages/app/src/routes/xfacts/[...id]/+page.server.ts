import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import { discoverXFactsLabels, readXFactsLabel, renderMarkdown } from '@filepress/core/server';
import { getSiteRoot } from '$lib/site.server';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	discoverXFactsLabels(getSiteRoot()).filter((label) => !label.viewer).map((label) => ({ id: label.id }));

export const load: PageServerLoad = async ({ params }) => {
	const root = getSiteRoot();
	const label = discoverXFactsLabels(root).find((label) => label.id === params.id);
	const raw = label ? readXFactsLabel(root, label.id) : null;
	if (!label || !raw) error(404, 'Label not found');
	const parsed = matter(raw);
	// Repository-only links are not published site routes. Keep their text on the label.
	const body = parsed.content.replace(/\[([^\]]+)\]\((?!https?:\/\/|#|mailto:)[^)]+\)/g, '$1');
	const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	return { label, html: await renderMarkdown(body), frontmatter };
};
