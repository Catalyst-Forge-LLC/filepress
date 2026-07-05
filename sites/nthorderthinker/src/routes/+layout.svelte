<script lang="ts">
	import '@downpress/core/theme';
	import { SiteHeader, SiteFooter } from '@downpress/core';
	import config from '$lib/downpress.config';

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
