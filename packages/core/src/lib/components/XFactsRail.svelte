<script lang="ts">
	import type { XFactsLabelCard } from '../xfacts-labels';

	let { labels }: { labels: XFactsLabelCard[] } = $props();
</script>

{#if labels.length}
	<aside class="xfacts-rail" aria-label="xFacts labels">
		{#each labels as label (label.id)}
			<a class="xfacts-card" href={label.href}>
				<p class="xfacts-card-family">{label.family}</p>
				<p class="xfacts-card-title">{label.title}</p>
				{#if label.detail}
					<p class="xfacts-card-detail">{label.detail}</p>
				{/if}
				{#if label.stack}
					<p class="xfacts-card-stack">{label.stack}</p>
				{/if}
				{#if label.meta}
					<p class="xfacts-card-meta">{label.meta}</p>
				{/if}
				<span class="xfacts-card-open">{label.viewer ? 'Open label' : `Open ${label.family}`}</span>
			</a>
		{/each}
	</aside>
{/if}

<style>
	.xfacts-rail {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		max-width: 16.75rem;
		margin-top: clamp(1.5rem, 5vw, 3rem);
		position: sticky;
		top: 1rem;
	}

	.xfacts-card {
		display: block;
		text-decoration: none;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius, 6px);
		padding: 0.85rem 0.95rem 0.9rem;
		box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 4%, transparent);
	}

	.xfacts-card:hover {
		border-color: var(--rule-strong);
		color: var(--ink);
		text-decoration: none;
	}

	.xfacts-card-family {
		margin: 0 0 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent-strong);
	}

	.xfacts-card-title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
		color: var(--ink);
	}

	.xfacts-card-detail,
	.xfacts-card-stack,
	.xfacts-card-meta {
		margin: 0.35rem 0 0;
		font-family: var(--font-sans);
		font-size: 0.82rem;
		line-height: 1.4;
		color: var(--ink-soft);
	}

	.xfacts-card-open {
		display: inline-block;
		margin-top: 0.55rem;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--accent-strong);
	}
</style>
