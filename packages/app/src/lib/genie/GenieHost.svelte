<script lang="ts">
	/**
	 * Mount Genie only in Vite DEV. Dynamic import keeps the panel out of
	 * production client graphs when this host is tree-shaken / dead-coded.
	 */
	const enabled =
		import.meta.env.DEV ||
		import.meta.env.DOWNPRESS_GENIE === '1' ||
		import.meta.env.DOWNPRESS_GENIE === 'true';
</script>

{#if enabled}
	{#await import('./GeniePanel.svelte') then { default: GeniePanel }}
		<GeniePanel />
	{/await}
{/if}
