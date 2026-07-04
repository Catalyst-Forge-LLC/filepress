<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';
	import { formatDate } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>#{data.tag} — {site.title}</title>
	<meta name="description" content="Posts tagged {data.tag} on {site.title}." />
</svelte:head>

<header class="post-header">
	<p class="meta">Tag</p>
	<h1>{data.tag}</h1>
</header>

<ul class="post-list">
	{#each data.posts as post (post.slug)}
		<li>
			<h2><a href="/posts/{post.slug}">{post.title}</a></h2>
			<p class="meta"><time datetime={post.date}>{formatDate(post.date)}</time></p>
			{#if post.description}
				<p>{post.description}</p>
			{/if}
		</li>
	{/each}
</ul>
