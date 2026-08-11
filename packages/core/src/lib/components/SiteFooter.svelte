<script lang="ts">
	import type { SiteConfig } from '../config';
	import NavIcon from './NavIcon.svelte';

	let { site, year = new Date().getFullYear() }: { site: SiteConfig; year?: number } = $props();
</script>

<footer class="site-footer">
	<div class="wrap">
		<span>&copy; {year} {site.author}</span>
		<span class="footer-links">
			{#each site.footerLinks as item (item.href)}
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
		</span>
	</div>
</footer>
