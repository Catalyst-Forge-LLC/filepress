<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Tags — {site.title}</title>
	<meta name="description" content="All tags on {site.title}." />
</svelte:head>

<h1 class="post-header">Tags</h1>

{#if data.tags.length === 0}
	<p class="empty-state">No tags yet.</p>
{:else}
	<ul class="tag-list">
		{#each data.tags as { tag, count } (tag)}
			<li><a href="/tags/{tag}">{tag} ({count})</a></li>
		{/each}
	</ul>
{/if}
