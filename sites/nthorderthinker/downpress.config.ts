import { defineDownpressConfig } from '../../packages/core/src/lib/index.ts';

export default defineDownpressConfig({
	title: 'The Nth Order Thinker',
	description:
		'Essays on thinking past the first order — rhetoric, culture, and the systems underneath the arguments.',
	url: 'https://example-site.example',
	author: 'The Nth Order Thinker',
	topics: [
		{ label: 'Rhetoric', tag: 'rhetoric' },
		{ label: 'Culture', tag: 'culture' },
		{ label: 'Discourse', tag: 'discourse' }
	]
});
