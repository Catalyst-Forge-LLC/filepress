<script lang="ts">
	import type { PageData } from './$types';
	import { site } from '$lib/config';
	import { formatDate } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{site.title}</title>
	<meta name="description" content={site.description} />
</svelte:head>

{#if data.posts.length === 0}
	<p class="empty-state">No posts yet. Add a Markdown file to <code>/posts/</code> and push.</p>
{:else}
	<ul class="post-list">
		{#each data.posts as post (post.slug)}
			<li>
				<h2><a href="/posts/{post.slug}">{post.title}</a></h2>
				<p class="meta">
					<time datetime={post.date}>{formatDate(post.date)}</time>
				</p>
				{#if post.description}
					<p>{post.description}</p>
				{/if}
				{#if post.tags.length}
					<ul class="tag-list" style="margin-top:0.6rem">
						{#each post.tags as tag (tag)}
							<li><a href="/tags/{tag}">{tag}</a></li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
