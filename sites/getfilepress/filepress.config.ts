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
		{ label: 'Skill page', href: '/skill-page' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	topics: [
		{ label: 'Getting started', tag: 'getting-started' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Deploy', tag: 'deploy' }
	]
});
