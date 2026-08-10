<script lang="ts">
	import type { SiteConfig } from '../config';

	let { site }: { site: SiteConfig } = $props();
</script>

<header class="site-header">
	<div class="wrap">
		<div class="site-id">
			<a class="site-title" href="/">
				{#if site.logo}
					<img class="site-logo" src={site.logo} alt={site.title} />
				{:else}
					{site.title}
				{/if}
			</a>
			<p class="site-tagline">{site.tagline}</p>
		</div>
		<nav class="site-nav" aria-label="Primary">
			{#each site.nav as item (item.href)}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</div>
</header>
