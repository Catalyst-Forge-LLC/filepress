import { defineDownpressConfig } from '@downpress/core';

export default defineDownpressConfig({
	title: 'What Over How',
	description:
		'Ends before means. Essays on judgment, perspective, and what is worth building.',
	url: 'https://example-site.example',
	author: 'Sam Douglas',
	topics: [
		{ label: 'Wonder', tag: 'wonder' },
		{ label: 'Perspective', tag: 'perspective' },
		{ label: 'Mental Models', tag: 'models' },
		{ label: 'Reality Math', tag: 'reality' },
		{ label: 'Stewardship', tag: 'stewardship' },
		{ label: 'Connection', tag: 'connection' },
		{ label: 'Discourse', tag: 'discourse' }
	]
});
