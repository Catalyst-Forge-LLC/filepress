import { defineFilepressConfig } from 'filepress';

export default defineFilepressConfig({
	title: 'filepress',
	description:
		'Example content for the filepress engine: Markdown posts, drafts, tags, and phone-friendly editing.',
	url: 'https://filepress.example.com',
	author: 'filepress',
	nav: [
		{ label: 'Posts', href: '/' },
		{ label: 'About', href: '/about' },
		{ label: 'Topics', href: '/topics' }
	],
	topics: [
		{ label: 'Getting started', tag: 'filepress' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Notes', tag: 'notes' }
	]
});
