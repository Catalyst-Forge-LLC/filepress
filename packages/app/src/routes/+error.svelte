<script lang="ts">
	import { page } from '$app/stores';
	import { postsIndexPath } from '@filepress/core';
	import config from '$site-config';

	const homeHref = $derived(postsIndexPath(config));
	const missing = $derived($page.status === 404);
	const detail = $derived.by(() => {
		const raw = $page.error?.message?.trim() ?? '';
		if (!raw || /^not found$/i.test(raw)) return '';
		return raw;
	});
</script>

<svelte:head>
	<title>{missing ? 'Not found' : 'Error'} — {config.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="empty-state error-page">
	<p class="error-code">{$page.status}</p>
	<h1>{missing ? 'This page is not here.' : 'Something went wrong.'}</h1>
	<p>
		{detail ||
			(missing
				? 'The address may have changed, or the file was never published.'
				: 'The build or request failed. Try the index, or check the terminal if you are in dev.')}
	</p>
	<p class="error-actions">
		{#if config.homePage}
			<a href="/">Home</a>
			<span aria-hidden="true"> · </span>
			<a href={homeHref}>Posts</a>
		{:else}
			<a href={homeHref}>Back to the index</a>
		{/if}
	</p>
</section>
