<script lang="ts">
	import type { PageData } from './$types';
	import { PostCard, tagDisplayLabel } from '@filepress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();
	const heading = $derived(tagDisplayLabel(config.topics, data.tag));
</script>

<svelte:head>
	<title>{heading} — {config.title}</title>
	<meta name="description" content="Posts tagged {heading} on {config.title}." />
</svelte:head>

<header class="post-header">
	<h1>{heading}</h1>
</header>

<ul class="post-list">
	{#each data.posts as post (post.slug)}
		<li><PostCard {post} showTags={false} /></li>
	{/each}
</ul>
