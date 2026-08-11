import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({
	title: 'FilePress',
	description:
		'Example content for FilePress: Markdown posts, drafts, tags, and phone-friendly editing.',
	url: 'https://getfilepress.com',
	author: 'FilePress',
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
