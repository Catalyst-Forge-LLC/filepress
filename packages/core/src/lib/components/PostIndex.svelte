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
		totalPages = 1
	}: {
		site: SiteConfig;
		hero?: boolean;
		featured?: PostMeta | null;
		posts: PostMeta[];
		page?: number;
		totalPages?: number;
	} = $props();

	const hasContent = $derived(featured !== null || posts.length > 0);
	const prevHref = $derived(page <= 2 ? '/' : `/page/${page - 1}`);
	const nextHref = $derived(`/page/${page + 1}`);
</script>

{#if hero}
	<!-- The masthead carries the site identity (title/logo plus tagline), so the
	     index needs only a hidden h1 for semantics/SEO. -->
	<h1 class="visually-hidden">{site.title}</h1>
{:else}
	<header class="post-header">
		<p class="eyebrow">Posts</p>
		<h1>Page {page}</h1>
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
