<script lang="ts">
	import type { PageData } from './$types';
	import { PostIndex, XFactsRail, absoluteUrl, ogImageUrl, postsIndexPath } from '@filepress/core';
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

{#snippet homeArticle()}
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
			<h1>{page?.title}</h1>
		</header>

		<div class="prose">{@html page?.html}</div>
	</article>
{/snippet}

{#snippet postIndex()}
	<PostIndex
		site={config}
		hero
		featured={data.featured}
		posts={data.posts}
		page={data.page}
		totalPages={data.totalPages}
		indexHref={postsIndexPath(config)}
	/>
{/snippet}

{#if data.mode === 'page' && page}
	{#if data.xfactsLabels.length}
		<div class="home-with-rail">
			{@render homeArticle()}
			<XFactsRail labels={data.xfactsLabels} />
		</div>
	{:else}
		{@render homeArticle()}
	{/if}
{:else if data.mode === 'posts'}
	{#if data.xfactsLabels.length}
		<div class="home-with-rail">
			<div class="home-index">
				{@render postIndex()}
			</div>
			<XFactsRail labels={data.xfactsLabels} />
		</div>
	{:else}
		{@render postIndex()}
	{/if}
{/if}

<style>
	.home-with-rail {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 16.75rem;
		gap: clamp(1.25rem, 3vw, 2.25rem);
		align-items: start;
		width: 100%;
	}

	:global(main.wrap:has(.home-with-rail)) {
		container-type: inline-size;
	}

	@container (max-width: 58rem) {
		.home-with-rail {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
