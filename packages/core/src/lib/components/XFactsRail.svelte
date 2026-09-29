<script lang="ts">
	import type { XFactsLabelCard } from '../xfacts-labels';

	let { labels }: { labels: XFactsLabelCard[] } = $props();
</script>

{#if labels.length}
	<aside class="xfacts-rail" aria-label="xFacts labels">
		{#each labels as label (label.id)}
			<a class="xfacts-label" href={label.href} style:--xfacts-ember={label.accent}>
				<h2>{label.title}</h2>
				<div class="serving">{label.serving}</div>
				{#if label.meta.length}
					<div class="meta">
						{#each label.meta as item (item.label)}
							<span><strong>{item.label}</strong> {item.value}</span>
						{/each}
					</div>
				{/if}
				{#each label.rows as row, i (row.label)}
					<div class="row" class:thick={i === label.rows.length - 1}>
						<strong>{row.label}</strong>
						<span>{row.value}</span>
					</div>
				{/each}
				{#if label.purpose}
					<div class="section">
						<b>Purpose</b>
						<p>{label.purpose}</p>
					</div>
				{/if}
				<div class="open">{label.viewer ? 'Open label' : `What is ${label.family}?`}</div>
			</a>
		{/each}
	</aside>
{/if}

<style>
	.xfacts-rail {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 20rem;
		max-width: 100%;
		margin-top: clamp(1.5rem, 5vw, 3rem);
		position: sticky;
		top: 1rem;
	}

	.xfacts-label {
		display: block;
		box-sizing: border-box;
		text-decoration: none;
		background: #f8fafc;
		color: #101418;
		border: 4px solid #101418;
		border-radius: 0;
		padding: 0.85rem 0.9rem 0.95rem;
		box-shadow: 0 12px 28px rgba(16, 20, 24, 0.12);
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
	}

	.xfacts-label:hover {
		color: #101418;
		text-decoration: none;
	}

	h2 {
		margin: 0;
		font-family: Sora, 'IBM Plex Mono', ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: 1.35rem;
		letter-spacing: -0.03em;
		line-height: 1.1;
		text-transform: uppercase;
		color: #101418;
	}

	.serving {
		font-size: 0.68rem;
		line-height: 1.35;
		color: #5c6b7a;
		border-bottom: 8px solid #101418;
		padding: 0.35rem 0 0.45rem;
		margin-bottom: 0.3rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.7rem;
		border-bottom: 5px solid #101418;
		padding: 0.4rem 0 0.5rem;
		margin-bottom: 0.15rem;
		font-size: 0.72rem;
		color: #101418;
	}

	.meta strong,
	.row strong {
		font-weight: 600;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid #101418;
		padding: 0.28rem 0;
		font-size: 0.72rem;
		color: #101418;
	}

	.row.thick {
		border-bottom-width: 5px;
	}

	.row span {
		text-align: right;
	}

	.section {
		margin-top: 0.65rem;
		font-size: 0.68rem;
		color: #5c6b7a;
	}

	.section b {
		display: block;
		color: #101418;
		font-size: 0.75rem;
		margin-bottom: 0.2rem;
	}

	.section p {
		margin: 0;
		color: #101418;
		font-size: 0.72rem;
		line-height: 1.4;
	}

	.open {
		margin-top: 0.75rem;
		padding-top: 0.55rem;
		border-top: 1px solid #c5ced8;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--xfacts-ember, #d96b2b);
	}
</style>
