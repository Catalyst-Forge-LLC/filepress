<script lang="ts">
	import '@downpress/core/theme';
	// Optional site override (theme.css or theme.scss at the site root).
	import '$site-theme';
	import { SiteHeader, SiteFooter } from '@downpress/core';
	import config from '$site-config';
	import GenieHost from '$lib/genie/GenieHost.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<link rel="alternate" type="application/rss+xml" title={config.title} href="/rss.xml" />
</svelte:head>

<SiteHeader site={config} />

<main class="wrap">
	{@render children()}
</main>

<SiteFooter site={config} />

<!-- Dev-only Genie Mode (tree-shaken when import.meta.env.DEV is false). -->
<GenieHost />
