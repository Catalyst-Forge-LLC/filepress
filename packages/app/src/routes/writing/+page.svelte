<script lang="ts">
	import type { PageData } from './$types';
	import { PostIndex, absoluteUrl, ogImageUrl } from '@filepress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();

	const pageTitle = $derived(`Writing — ${config.title}`);
	const canonical = $derived(absoluteUrl(config, '/writing'));
	const ogImage = $derived(ogImageUrl(config));
	const description = $derived(`Writing from ${config.title}. ${config.description}`.trim());
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Writing — {config.title}" />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:image" content={ogImage} />
	{/if}
</svelte:head>

<PostIndex
	site={config}
	featured={data.featured}
	posts={data.posts}
	page={data.page}
	totalPages={data.totalPages}
	indexHref="/writing"
	heading="Writing"
/>
