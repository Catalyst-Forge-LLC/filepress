<script lang="ts">
	import type { PageData } from './$types';
	import { PostCard } from '@downpress/core';
	import config from '$lib/downpress.config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.tag} — {config.title}</title>
	<meta name="description" content="Posts tagged {data.tag} on {config.title}." />
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
