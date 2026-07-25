<script lang="ts">
	import type { PageData } from './$types';
	import { formatDate } from '@downpress/core';
	import config from '$site-config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Topics — {config.title}</title>
	<meta name="description" content="Browse {config.title} by topic." />
</svelte:head>

<header class="post-header">
	<p class="eyebrow">Explore</p>
	<h1>Topics</h1>
</header>

{#if data.groups.length === 0}
	<p class="empty-state">No topics yet.</p>
{:else}
	{#each data.groups as group (group.tag)}
		<section class="topic-group">
			<h2>
				<a href="/tags/{group.tag}">{group.label}</a>
				<span class="count">{group.count} post{group.count === 1 ? '' : 's'}</span>
			</h2>
			<ul class="topic-posts">
				{#each group.posts as post (post.slug)}
					<li>
						<span class="date">{formatDate(post.date)}</span>
						<a href="/posts/{post.slug}">{post.title}</a>
					</li>
				{/each}
			</ul>
			{#if group.count > group.posts.length}
				<p class="meta" style="margin-top:0.6rem">
					<a href="/tags/{group.tag}">All {group.count} &rarr;</a>
				</p>
			{/if}
		</section>
	{/each}

	<p class="meta" style="margin-top:2rem">
		<a href="/tags">See every tag &rarr;</a>
	</p>
{/if}
