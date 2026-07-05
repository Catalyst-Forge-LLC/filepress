<script lang="ts">
	import type { PageData } from './$types';
	import { Newsletter, absoluteUrl, formatDate } from '@downpress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();

	const post = $derived(data.post);
	const pageTitle = $derived(`${post.title} — ${config.title}`);
	const canonical = $derived(absoluteUrl(config, `/posts/${post.slug}`));
	const showUpdated = $derived(post.updated && post.updated !== post.date);
	const adjacent = $derived(data.adjacent);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if post.description}
		<meta name="description" content={post.description} />
	{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={post.title} />
	{#if post.description}
		<meta property="og:description" content={post.description} />
	{/if}
	<meta property="og:url" content={canonical} />
	{#if data.isDraft}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<article>
	<header class="post-header">
		{#if data.isDraft}
			<p class="draft-banner">Draft preview — not listed or indexed.</p>
		{/if}
		<h1>{post.title}</h1>
		<p class="meta">
			<time datetime={post.date}>{formatDate(post.date)}</time>
			{#if post.author}
				&middot; <span class="byline">{post.author}</span>
			{/if}
			{#if showUpdated}
				&middot; updated <time datetime={post.updated}>{formatDate(post.updated!)}</time>
			{/if}
		</p>
		{#if post.tags.length}
			<ul class="tag-list" style="margin-top:0.75rem">
				{#each post.tags as tag (tag)}
					<li><a href="/tags/{tag}">{tag}</a></li>
				{/each}
			</ul>
		{/if}
	</header>

	<!-- Body HTML is compiled at build time from the owner's own Markdown (trusted). -->
	<div class="prose">{@html post.html}</div>

	{#if adjacent.older || adjacent.newer}
		<nav class="post-nav" aria-label="More posts">
			{#if adjacent.older}
				<a class="older" href="/posts/{adjacent.older.slug}">
					<span class="post-nav-label">&larr; Older</span>
					<span class="post-nav-title">{adjacent.older.title}</span>
				</a>
			{:else}
				<span></span>
			{/if}
			{#if adjacent.newer}
				<a class="newer" href="/posts/{adjacent.newer.slug}">
					<span class="post-nav-label">Newer &rarr;</span>
					<span class="post-nav-title">{adjacent.newer.title}</span>
				</a>
			{:else}
				<span></span>
			{/if}
		</nav>
	{/if}
</article>

<Newsletter newsletter={config.newsletter} />
