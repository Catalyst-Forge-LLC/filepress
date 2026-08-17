import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/Catalyst-Forge-LLC/filepress';

export default defineFilepressConfig({
	title: 'FilePress',
	description:
		'Start with files, or bring the site you already have. Design locally. Ship static. Keep everything.',
	url: 'https://getfilepress.com',
	author: 'FilePress',
	tagline: 'Markdown blogs from git',
	lede: 'Edit posts as files. Push. Ship a static site. No CMS, no database, no runtime server.',
	homePage: 'home',
	logo: '/logo.svg',
	ogImage: '/logo.svg',
	nav: [
		{ label: 'Home', href: '/' },
		{ label: 'Writing', href: '/writing' },
		{ label: 'Docs', href: '/getting-started' },
		{ label: 'Deploy', href: '/deploy' },
		{ label: 'Import', href: '/import' },
		{ label: 'Genie', href: '/genie' },
		{ label: 'About', href: '/about' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	footerLinks: [
		{ label: 'RSS', href: '/rss.xml' },
		{ label: 'Topics', href: '/topics' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	topics: [
		{ label: 'Getting started', tag: 'getting-started' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Deploy', tag: 'deploy' }
	]
});
