<script lang="ts">
	import type { PageData } from './$types';
	import { PostIndex, absoluteUrl, ogImageUrl, postsIndexPath } from '@downpress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();

	const isHomePage = $derived(data.mode === 'page');
	const page = $derived(data.mode === 'page' ? data.page : null);
	const canonical = $derived(absoluteUrl(config, '/'));
	const ogImage = $derived(ogImageUrl(config));
	const description = $derived(
		(page?.description || config.description || '').trim() || null
	);
</script>

<svelte:head>
	<title>{config.title}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	{#if isHomePage}
		<link rel="canonical" href={canonical} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={config.title} />
		{#if description}
			<meta property="og:description" content={description} />
		{/if}
		<meta property="og:url" content={canonical} />
		{#if ogImage}
			<meta property="og:image" content={ogImage} />
			<meta name="twitter:card" content="summary" />
			<meta name="twitter:image" content={ogImage} />
		{/if}
		{#if data.mode === 'page' && data.isDraft}
			<meta name="robots" content="noindex" />
		{/if}
	{/if}
</svelte:head>

{#if data.mode === 'page' && page}
	<article class="static-page home-page">
		<header class="page-header">
			{#if data.isDraft}
				<p class="draft-banner">
					Draft — shown in local listings; excluded from production sitemap.
				</p>
			{/if}
			{#if config.lede}
				<p class="hero-lede">{config.lede}</p>
			{/if}
			<h1>{page.title}</h1>
		</header>

		<div class="prose">{@html page.html}</div>
	</article>
{:else if data.mode === 'posts'}
	<PostIndex
		site={config}
		hero
		featured={data.featured}
		posts={data.posts}
		page={data.page}
		totalPages={data.totalPages}
		indexHref={postsIndexPath(config)}
	/>
{/if}
