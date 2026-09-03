<script lang="ts">
	import type { NavItem, SiteConfig } from '../config';
	import { isPathMountHref } from '../paths-shared';
	import NavIcon from './NavIcon.svelte';

	let { site, year = new Date().getFullYear() }: { site: SiteConfig; year?: number } = $props();

	const collections = $derived(site.footerLinks.filter((item) => item.icon));
	const utilities = $derived(site.footerLinks.filter((item) => !item.icon));

	function linkAttrs(item: NavItem) {
		if (item.icon || /^https?:\/\//i.test(item.href)) {
			return { target: '_blank' as const, rel: 'noopener noreferrer' };
		}
		if (isPathMountHref(item.href, site.paths)) {
			return { 'data-sveltekit-reload': true };
		}
		return {};
	}
</script>

{#snippet footerLink(item: NavItem)}
	<a
		href={item.href}
		class:has-icon={Boolean(item.icon)}
		class:nav-github={item.icon === 'github'}
		{...linkAttrs(item)}
	>
		{#if item.icon}
			<NavIcon name={item.icon} />
		{/if}
		<span class="nav-label">{item.label}</span>
	</a>
{/snippet}

<footer class="site-footer">
	<div class="wrap">
		<span class="footer-meta">
			<span>&copy; {year} {site.author}</span>
			{#if site.footerCredit}
				<span class="footer-credit">
					{site.footerCredit.preface}
					<a
						href={site.footerCredit.href}
						target="_blank"
						rel="noopener noreferrer"
					>{site.footerCredit.label}</a>
				</span>
			{/if}
		</span>
		<span class="footer-end">
			{#if collections.length}
				<span class="footer-collections">
					{#each collections as item (item.href)}
						{@render footerLink(item)}
					{/each}
				</span>
			{/if}
			{#if utilities.length}
				<span class="footer-links">
					{#each utilities as item (item.href)}
						{@render footerLink(item)}
					{/each}
				</span>
			{/if}
		</span>
	</div>
</footer>
