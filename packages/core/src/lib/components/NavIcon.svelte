<script lang="ts">
	import type { NavIconName } from '../config';

	let { name }: { name: NavIconName } = $props();
</script>

{#if name === 'github'}
	<svg class="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
		<path
			fill="currentColor"
			d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
			0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
			1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
			0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04
			2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
			0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
		/>
	</svg>
{:else if name === 'hn'}
	<svg class="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
		<rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.2" />
		<path
			fill="currentColor"
			d="M4.35 4h1.85l1.8 3.55L9.8 4h1.85L9.15 8.35V12H7.85V8.35L4.35 4z"
		/>
	</svg>
{:else if name === 'thingiverse'}
	<svg class="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
		<path
			fill="currentColor"
			d="M8 1.4 14.2 4.7v6.6L8 14.6 1.8 11.3V4.7L8 1.4zm0 1.7L3.9 5.2 8 7.4l4.1-2.2L8 3.1zM3.1 6.3 7.3 8.6v4.3L3.1 10.6V6.3zm9.8 0v4.3L8.7 12.9V8.6l4.2-2.3z"
		/>
	</svg>
{/if}
