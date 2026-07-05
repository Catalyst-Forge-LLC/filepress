<script lang="ts">
	import { site } from '$lib/config';
</script>

{#if site.newsletter}
	<aside class="newsletter">
		<h2>Subscribe</h2>
		<p>{site.newsletter.blurb}</p>
		<a class="button" href={site.newsletter.url} rel="noopener">{site.newsletter.cta}</a>
	</aside>
{/if}
