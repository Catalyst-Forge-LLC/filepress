<script lang="ts">
	import type { PageData } from './$types';
	import { PostIndex } from '@downpress/core';
	import config from '$lib/downpress.config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Posts — page {data.page} — {config.title}</title>
	<meta name="description" content="More posts from {config.title}." />
	<link rel="canonical" href="{config.url}/page/{data.page}" />
</svelte:head>

<PostIndex
	site={config}
	featured={data.featured}
	posts={data.posts}
	page={data.page}
	totalPages={data.totalPages}
/>
