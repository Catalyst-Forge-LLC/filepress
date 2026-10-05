<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.label.title} — {data.label.family}</title>
</svelte:head>

<article class="static-page">
	<a href="/">← Home</a>
	<header class="page-header"><h1>{data.label.title} — {data.label.family}</h1></header>
	<div class="prose">{@html data.html}</div>
	<details>
		<summary>Label data</summary>
		<pre>{data.frontmatter}</pre>
	</details>
</article>

<style>
	pre { overflow-x: auto; padding: 1rem; font-size: 0.85rem; }
	details { margin-top: 2rem; }
	summary { cursor: pointer; }
	.prose { overflow-x: auto; }
</style>
