<script lang="ts">
	import type { PageData } from './$types';
	import { PostIndex } from '@downpress/core';
	import config from '$lib/downpress.config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{config.title}</title>
	<meta name="description" content={config.description} />
</svelte:head>

<PostIndex
	site={config}
	hero
	featured={data.featured}
	posts={data.posts}
	page={data.page}
	totalPages={data.totalPages}
/>
