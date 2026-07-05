<script lang="ts">
	// Self-hosted fonts (bundled at build time — no third-party requests).
	import '@fontsource-variable/newsreader/index.css';
	import '@fontsource-variable/newsreader/standard-italic.css';
	import '@fontsource-variable/inter/index.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { site } from '$lib/config';

	let { children } = $props();
	const year = new Date().getFullYear();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/rss+xml" title={site.title} href="/rss.xml" />
</svelte:head>

<header class="site-header">
	<div class="wrap">
		<a class="site-title" href="/">{site.title}</a>
		<nav class="site-nav" aria-label="Primary">
			{#each site.nav as item (item.href)}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</div>
</header>

<main class="wrap">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="wrap">
		<span>&copy; {year} {site.author}</span>
		<span class="footer-links">
			<a href="/rss.xml">RSS</a>
			<a href="/topics">Topics</a>
		</span>
	</div>
</footer>
