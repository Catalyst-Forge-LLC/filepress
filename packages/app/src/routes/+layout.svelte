<script lang="ts">
	// Essay + site theme from one module (avoids Essay flash before site overrides).
	import '$lib/theme-entry';
	import criticalTheme from '$critical-theme';
	import { SiteHeader, SiteFooter } from '@downpress/core';
	import config from '$site-config';
	import GenieHost from '$lib/genie/GenieHost.svelte';

	let { children } = $props();
</script>

<svelte:head>
	{#if criticalTheme}
		{@html `<style data-downpress-critical>${criticalTheme}</style>`}
	{/if}
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
