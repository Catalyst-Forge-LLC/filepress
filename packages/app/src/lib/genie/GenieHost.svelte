<script lang="ts">
	import { browser } from '$app/environment';
	import { shouldMountGenie } from './enabled';

	/**
	 * Browser + Vite DEV only. Never prerender the FAB into static HTML.
	 * FILEPRESS_GENIE must not force this on in a production build.
	 */
	const enabled = shouldMountGenie({ browser, viteDev: import.meta.env.DEV });
</script>

{#if enabled}
	{#await import('./GeniePanel.svelte') then { default: GeniePanel }}
		<GeniePanel />
	{/await}
{/if}
