<script lang="ts">
	import type { PostMeta } from '../content/types';
	import { formatDate, formatReadingTime } from '../format';

	let {
		post,
		featured = false,
		showTags = true
	}: { post: PostMeta; featured?: boolean; showTags?: boolean } = $props();
</script>

<article class="post-card" class:featured>
	<p class="meta">
		{#if post.draft}
			<span class="draft-label">Draft</span>
		{/if}
		<time datetime={post.date}>{formatDate(post.date)}</time>
		{#if post.author}
			&middot; <span class="byline">{post.author}</span>
		{/if}
		&middot; <span class="reading-time">{formatReadingTime(post.readingMinutes)}</span>
	</p>
	<h2 class="post-title"><a href="/posts/{post.slug}">{post.title}</a></h2>
	{#if post.description}
		<p class="excerpt">{post.description}</p>
	{/if}
	<a class="read-more" href="/posts/{post.slug}">Read more &rarr;</a>
	{#if showTags && post.tags.length}
		<ul class="tag-list card-tags">
			{#each post.tags as tag (tag)}
				<li><a href="/tags/{tag}">{tag}</a></li>
			{/each}
		</ul>
	{/if}
</article>
