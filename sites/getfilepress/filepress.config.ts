import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/Catalyst-Forge-LLC/filepress';

export default defineFilepressConfig({
	title: 'FilePress',
	description: 'Markdown blogs from git. Import a public site or start from files. Ship static HTML.',
	url: 'https://getfilepress.com',
	author: 'FilePress',
	tagline: 'Markdown blogs from git',
	lede: 'Posts are files. The build is static HTML. No CMS, no database, no runtime server.',
	homePage: 'home',
	logo: '/logo.svg',
	ogImage: '/logo.svg',
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
