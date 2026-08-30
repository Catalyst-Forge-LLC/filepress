<script lang="ts">
	import '$lib/theme-entry';
	import criticalTheme from '$critical-theme';
	import { SiteHeader, SiteFooter, isPathMountHref } from '@filepress/core';
	import config from '$site-config';

	let { children } = $props();

	function markPathMountLink(event: PointerEvent) {
		const a = (event.target as HTMLElement | null)?.closest('a[href]');
		if (!a) return;
		const href = a.getAttribute('href');
		if (!href || !isPathMountHref(href, config.paths)) return;
		a.setAttribute('data-sveltekit-reload', '');
	}
</script>

<svelte:window onpointerdown={markPathMountLink} />

<svelte:head>
	{#if criticalTheme}
		{@html `<style data-filepress-critical>${criticalTheme}</style>`}
	{/if}
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="alternate" type="application/rss+xml" title={config.title} href="/rss.xml" />
</svelte:head>

<SiteHeader site={config} />

<main class="wrap">
	{@render children()}
</main>

<SiteFooter site={config} />

{#if import.meta.env.DEV}
	{#await import('$lib/genie/GenieHost.svelte') then { default: GenieHost }}
		<GenieHost />
	{/await}
{/if}
