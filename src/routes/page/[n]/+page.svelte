<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';
	import PostIndex from '$lib/components/PostIndex.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Posts — page {data.page} — {site.title}</title>
	<meta name="description" content="More posts from {site.title}." />
	<link rel="canonical" href="{site.url}/page/{data.page}" />
</svelte:head>

<PostIndex featured={data.featured} posts={data.posts} page={data.page} totalPages={data.totalPages} />
