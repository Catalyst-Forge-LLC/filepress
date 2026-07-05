<script lang="ts">
	import type { NewsletterConfig } from '../config';

	let { newsletter }: { newsletter: NewsletterConfig | null } = $props();
</script>

{#if newsletter}
	<aside class="newsletter">
		<h2>Subscribe</h2>
		<p>{newsletter.blurb}</p>
		<a class="button" href={newsletter.url} rel="noopener">{newsletter.cta}</a>
	</aside>
{/if}
