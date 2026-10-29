import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/Catalyst-Forge-LLC/filepress';

export default defineFilepressConfig({
	title: 'FilePress',
	description: "Turn a folder of pages and posts into a static website with navigation, tags, and feeds. FilePress keeps your content in files you can edit and version. Start with a blog or a product landing page, then deploy the generated files to your chosen host.",
	url: 'https://getfilepress.com',
	author: 'FilePress',
	tagline: 'Easy websites, no CMS to run.',
	lede: "Static site builder for Markdown",
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
		{ label: 'See the rest of the Catalyst Forge shelf.', href: 'https://catalystforge.com/tools/' },
		{ label: 'RSS', href: '/rss.xml' },
		{ label: 'Docs', href: '/docs' },
		{ label: 'Topics', href: '/topics' },
		{ label: 'GitHub', href: github, icon: 'github' }
	],
	paths: [{ url: '/docs', dir: 'docs/dist' }],
	redirects: [{ from: '/getting-started', to: '/docs/getting-started', status: 301 }],
	topics: [
		{ label: 'Getting started', tag: 'getting-started' },
		{ label: 'Workflow', tag: 'workflow' },
		{ label: 'Deploy', tag: 'deploy' }
	]
});
