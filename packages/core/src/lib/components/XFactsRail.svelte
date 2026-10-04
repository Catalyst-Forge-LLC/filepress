<script lang="ts">
	import '../styles/xfacts-fonts.css';
	import type { XFactsLabelCard } from '../xfacts-labels';

	let { labels }: { labels: XFactsLabelCard[] } = $props();
</script>

{#if labels.length}
	<aside class="xfacts-rail" aria-label="xFacts labels">
		{#each labels as label (label.id)}
			{@const marked = label.family.endsWith('Facts') && label.family.length > 5}
			<a class="xfacts-label" href={label.href} style:--xfacts-ember={label.accent}>
				<p class="mark">
					<span class="mark-lead">{marked ? label.family.slice(0, -5) : label.family}</span>{#if marked}<span class="mark-rest">Facts</span>{/if}
				</p>
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
					<div class="row" class:stack={row.value.length > 32} class:thick={i === label.rows.length - 1}>
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
				<div class="open" class:ruled={Boolean(label.purpose)}>
					<span>{label.viewer ? 'Open Full Label' : `What is ${label.family}?`}</span>
					<svg class="open-icon" viewBox="0 0 16 16" aria-hidden="true">
						<path
							fill="currentColor"
							d="M4.2 3.4h8.4V11h-1.35V5.7L5.15 11.8 4.2 10.85 10.3 4.75H4.2V3.4z"
						/>
					</svg>
				</div>
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
		padding: 1rem 1.05rem 1.15rem;
		box-shadow: 0 12px 28px rgba(16, 20, 24, 0.12);
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-weight: 400;
	}

	.xfacts-label:hover {
		color: #101418;
		text-decoration: none;
	}

	.mark {
		margin: 0 0 0.4rem;
		font-family: Sora, sans-serif;
		font-weight: 800;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		line-height: 1;
		text-transform: uppercase;
	}

	.mark-lead {
		color: var(--xfacts-ember, #d96b2b);
	}

	.mark-rest {
		color: #101418;
	}

	h2 {
		margin: 0;
		font-family: Sora, sans-serif;
		font-weight: 800;
		font-size: clamp(1.55rem, 5vw, 1.9rem);
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: #101418;
	}

	.serving {
		font-size: 0.72rem;
		line-height: 1.35;
		color: #5c6b7a;
		border-bottom: 10px solid #101418;
		padding: 0.4rem 0 0.5rem;
		margin-bottom: 0.35rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		border-bottom: 5px solid #101418;
		padding: 0.45rem 0 0.55rem;
		margin-bottom: 0.35rem;
		font-size: 0.78rem;
		color: #101418;
	}

	.meta strong,
	.row strong {
		font-weight: 700;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid #101418;
		padding: 0.32rem 0;
		font-size: 0.8rem;
		color: #101418;
	}

	.row.thick {
		border-bottom-width: 5px;
	}

	.row span {
		text-align: right;
	}

	.row.stack {
		flex-direction: column;
		align-items: stretch;
		gap: 0.15rem;
	}

	.row.stack span {
		text-align: left;
	}

	.section {
		margin-top: 0.7rem;
		font-size: 0.72rem;
		color: #5c6b7a;
	}

	.section b {
		display: block;
		color: #101418;
		font-size: 0.8rem;
		margin-bottom: 0.25rem;
	}

	.section p {
		margin: 0.15rem 0 0;
		color: #101418;
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.open {
		margin-top: 0.75rem;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--xfacts-ember, #d96b2b);
	}

	.open.ruled {
		padding-top: 0.65rem;
		border-top: 1px solid #c5ced8;
	}

	.open-icon {
		width: 0.85rem;
		height: 0.85rem;
		flex: none;
	}
</style>
