import { defineDownpressConfig } from 'downpress';

export default defineDownpressConfig({
	title: 'Downpress',
	description:
		'Example content for the Downpress engine: Markdown posts, drafts, tags, and phone-friendly editing.',
	url: 'https://downpress.example.com',
	author: 'Downpress',
	topics: [
		{ label: 'Getting started', tag: 'downpress' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Notes', tag: 'notes' }
	]
});
