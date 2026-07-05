<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';
	import PostCard from '$lib/components/PostCard.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.tag} — {site.title}</title>
	<meta name="description" content="Posts tagged {data.tag} on {site.title}." />
</svelte:head>

<header class="post-header">
	<p class="eyebrow">Tag</p>
	<h1>{data.tag}</h1>
</header>

<ul class="post-list">
	{#each data.posts as post (post.slug)}
		<li><PostCard {post} showTags={false} /></li>
	{/each}
</ul>
