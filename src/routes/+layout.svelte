<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { site } from '$lib/config';

	let { children } = $props();
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
		{site.title} &middot; built with Downpress
	</div>
</footer>
