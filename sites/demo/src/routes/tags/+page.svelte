<script lang="ts">
	import type { PageData } from './$types';
	import config from '$lib/downpress.config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Tags — {config.title}</title>
	<meta name="description" content="All tags on {config.title}." />
</svelte:head>

<header class="post-header">
	<p class="eyebrow">Index</p>
	<h1>Tags</h1>
</header>

{#if data.tags.length === 0}
	<p class="empty-state">No tags yet.</p>
{:else}
	<ul class="tag-list">
		{#each data.tags as { tag, count } (tag)}
			<li><a href="/tags/{tag}">{tag} ({count})</a></li>
		{/each}
	</ul>
{/if}
