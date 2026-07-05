<script lang="ts">
	import type { SiteConfig } from '../config';

	let { site }: { site: SiteConfig } = $props();
</script>

<header class="site-header">
	<div class="wrap">
		<a class="site-title" href="/">{site.title}</a>
		<nav class="site-nav" aria-label="Primary">
			{#each site.nav as item (item.href)}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</div>
</header>
