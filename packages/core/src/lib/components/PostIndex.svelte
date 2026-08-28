<script lang="ts">
	import type { PostMeta } from '../content/types';
	import type { SiteConfig } from '../config';
	import PostCard from './PostCard.svelte';
	import Newsletter from './Newsletter.svelte';

	let {
		site,
		hero = false,
		featured = null,
		posts,
		page = 1,
		totalPages = 1,
		/** Page-1 URL for the post index (`/` or `/posts`). */
		indexHref = '/',
		heading = 'Posts'
	}: {
		site: SiteConfig;
		hero?: boolean;
		featured?: PostMeta | null;
		posts: PostMeta[];
		page?: number;
		totalPages?: number;
		indexHref?: string;
		heading?: string;
	} = $props();

	const hasContent = $derived(featured !== null || posts.length > 0);
	const prevHref = $derived(page <= 2 ? indexHref : `/page/${page - 1}`);
	const nextHref = $derived(`/page/${page + 1}`);
</script>

{#if hero}
	<!-- The masthead carries the site identity (title/logo plus tagline). The
	     index adds an optional one-line lede; a hidden h1 keeps semantics/SEO. -->
	<header class="hero" class:visually-hidden={!site.lede}>
		<h1 class="visually-hidden">{site.title}</h1>
		{#if site.lede}
			<p class="hero-lede">{site.lede}</p>
		{/if}
	</header>
{:else}
	<header class="post-header">
		{#if page <= 1}
			<h1>{heading}</h1>
		{:else}
			<p class="eyebrow">{heading}</p>
			<h1>Page {page}</h1>
		{/if}
	</header>
{/if}

{#if !hasContent}
	<p class="empty-state">No posts yet. Add a Markdown file to <code>/posts/</code> and push.</p>
{:else}
	{#if featured}
		<div class="featured">
			<p class="eyebrow">Latest</p>
			<PostCard post={featured} featured />
		</div>
	{/if}

	{#if posts.length}
		<ul class="post-list">
			{#each posts as post (post.slug)}
				<li><PostCard {post} /></li>
			{/each}
		</ul>
	{/if}

	{#if totalPages > 1}
		<nav class="pager" aria-label="Pagination">
			{#if page > 1}
				<a href={prevHref} rel="prev">&larr; Newer</a>
			{:else}
				<span></span>
			{/if}
			<span class="page-count">Page {page} of {totalPages}</span>
			{#if page < totalPages}
				<a href={nextHref} rel="next">Older &rarr;</a>
			{:else}
				<span></span>
			{/if}
		</nav>
	{/if}
{/if}

<Newsletter newsletter={site.newsletter} />
