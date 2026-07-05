<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';
	import PostIndex from '$lib/components/PostIndex.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{site.title}</title>
	<meta name="description" content={site.description} />
</svelte:head>

<PostIndex hero featured={data.featured} posts={data.posts} page={data.page} totalPages={data.totalPages} />
