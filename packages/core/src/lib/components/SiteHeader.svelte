<script lang="ts">
	import type { SiteConfig } from '../config';

	let { site }: { site: SiteConfig } = $props();
</script>

<header class="site-header">
	<div class="wrap">
		<div class="site-id">
			<a class="site-title" href="/">
				{#if site.logo}
					<img class="site-logo" src={site.logo} alt="" />
				{/if}
				<span class="site-brand-copy">
					<span class="site-wordmark">{site.title}</span>
					{#if site.tagline}
						<span class="site-tagline">{site.tagline}</span>
					{/if}
				</span>
			</a>
		</div>
		<nav class="site-nav" aria-label="Primary">
			{#each site.nav as item (item.href)}
				<a href={item.href}>{item.label}</a>
			{/each}
		</nav>
	</div>
</header>
