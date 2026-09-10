import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/Catalyst-Forge-LLC/filepress';

export default defineFilepressConfig({
	title: 'FilePress',
	description: 'Publish Markdown from git as a static site. Import a public site or start from files.',
	url: 'https://getfilepress.com',
	author: 'FilePress',
	tagline: 'Markdown blogs from git',
	lede: 'A folder of Markdown, a static build/, no CMS.',
	homePage: 'home',
	logo: '/logo.png',
	ogImage: '/logo.png',
	nav: [
		{ label: 'Home', href: '/' },
		{ label: 'Docs', href: '/docs' },
		{ label: 'Writing', href: '/writing' },
		{ label: 'About', href: '/about' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	footerLinks: [
		{ label: 'RSS', href: '/rss.xml' },
		{ label: 'Docs', href: '/docs' },
		{ label: 'Topics', href: '/topics' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	paths: [{ url: '/docs', dir: 'docs/dist' }],
	topics: [
		{ label: 'Getting started', tag: 'getting-started' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Deploy', tag: 'deploy' }
	]
});
