<script lang="ts">
	import type { SiteConfig } from '../config';
	import NavIcon from './NavIcon.svelte';

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
				<a
					href={item.href}
					class:has-icon={Boolean(item.icon)}
					class:nav-github={item.icon === 'github'}
					{...(item.icon === 'github'
						? { target: '_blank', rel: 'noopener noreferrer' }
						: {})}
				>
					{#if item.icon}
						<NavIcon name={item.icon} />
					{/if}
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>
	</div>
</header>
