<script lang="ts">
	import type { PageData } from './$types';
	import { absoluteUrl } from '@downpress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();

	const page = $derived(data.page);
	const pageTitle = $derived(`${page.title} — ${config.title}`);
	const canonical = $derived(absoluteUrl(config, `/${page.slug}`));
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if page.description}
		<meta name="description" content={page.description} />
	{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={page.title} />
	{#if page.description}
		<meta property="og:description" content={page.description} />
	{/if}
	<meta property="og:url" content={canonical} />
	{#if data.isDraft}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<article class="static-page">
	<header class="page-header">
		{#if data.isDraft}
			<p class="draft-banner">
				Draft — shown in local listings; excluded from production sitemap.
			</p>
		{/if}
		<h1>{page.title}</h1>
	</header>

	<div class="prose">{@html page.html}</div>
</article>
