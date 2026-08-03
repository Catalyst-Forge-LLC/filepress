<script lang="ts">
	type VersionRow = {
		id: string;
		label: string;
		createdAt: string;
		starred?: boolean;
		parentId?: string | null;
	};

	type Health = {
		ollama: { available: boolean; hint: string; model: string; host: string };
		active: { versionId: string; activatedAt: string } | null;
		versions: VersionRow[];
		brief: {
			tokens: { accent: string; bg?: string; ink?: string };
			paletteMode?: string;
			density?: string;
			hero?: string;
			atmosphere?: string;
			elevatedCards?: boolean;
			navStyle?: string;
		};
	};

	let open = $state(false);
	let loading = $state(false);
	let error = $state('');
	let health = $state<Health | null>(null);
	let stockQuery = $state('abstract dark texture');
	let accent = $state('#1e4d6b');

	async function api(path: string, init?: RequestInit) {
		const res = await fetch(`/__downpress/genie${path}`, {
			...init,
			headers: {
				'content-type': 'application/json',
				...(init?.headers || {})
			}
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || res.statusText);
		return data;
	}

	async function refresh() {
		loading = true;
		error = '';
		try {
			health = await api('/health');
			if (health?.brief?.tokens?.accent) accent = health.brief.tokens.accent;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function openPanel() {
		open = true;
		await refresh();
	}

	async function steer(brief: Record<string, unknown>, label: string) {
		loading = true;
		error = '';
		try {
			await api('/steer', { method: 'POST', body: JSON.stringify({ brief, label }) });
			await refresh();
			// Theme alias is a real file — full reload picks up CSS reliably.
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function activate(versionId: string) {
		loading = true;
		error = '';
		try {
			await api('/activate', { method: 'POST', body: JSON.stringify({ versionId }) });
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function applyStock() {
		loading = true;
		error = '';
		try {
			await api('/stock', {
				method: 'POST',
				body: JSON.stringify({ query: stockQuery, role: 'background' })
			});
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function onUpload(ev: Event, role: 'hero' | 'background') {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		loading = true;
		error = '';
		try {
			const dataBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result || ''));
				reader.onerror = () => reject(new Error('Failed to read file'));
				reader.readAsDataURL(file);
			});
			await api('/upload', {
				method: 'POST',
				body: JSON.stringify({
					role,
					filename: file.name,
					dataBase64
				})
			});
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		} finally {
			input.value = '';
		}
	}
</script>

{#if !open}
	<button type="button" class="genie-fab" onclick={openPanel} title="Open Genie Mode">
		Genie
	</button>
{:else}
	<aside class="genie-panel" aria-label="Genie Mode">
		<header class="genie-head">
			<strong>Genie</strong>
			<button type="button" class="genie-x" onclick={() => (open = false)}>Close</button>
		</header>

		{#if error}
			<p class="genie-err">{error}</p>
		{/if}

		{#if health}
			<section class="genie-sec">
				<h3>Status</h3>
				<p class="genie-muted">
					Ollama: {health.ollama.available ? 'up' : 'down'} · {health.ollama.model}
				</p>
				<p class="genie-hint">{health.ollama.hint}</p>
			</section>

			<section class="genie-sec">
				<h3>Steers</h3>
				<label class="genie-row">
					Accent
					<input type="color" bind:value={accent} disabled={loading} />
					<button
						type="button"
						disabled={loading}
						onclick={() =>
							steer(
								{ tokens: { accent, accentStrong: accent } },
								`Accent ${accent}`
							)}
					>
						Apply
					</button>
				</label>
				<div class="genie-chips">
					<button
						type="button"
						disabled={loading}
						onclick={() =>
							steer(
								{ paletteMode: 'dark', hero: 'bold', atmosphere: 'noise', elevatedCards: true, navStyle: 'uppercase-tracked', density: 'balanced' },
								'Dark punchy'
							)}
					>
						Dark punchy
					</button>
					<button
						type="button"
						disabled={loading}
						onclick={() =>
							steer(
								{
									paletteMode: 'light',
									hero: 'editorial',
									atmosphere: 'none',
									elevatedCards: false,
									navStyle: 'soft',
									density: 'sparse'
								},
								'Light editorial'
							)}
					>
						Light editorial
					</button>
					<button
						type="button"
						disabled={loading}
						onclick={() => steer({ density: 'dense' }, 'Denser')}
					>
						Denser
					</button>
					<button
						type="button"
						disabled={loading}
						onclick={() => steer({ hero: 'bold' }, 'Bold hero')}
					>
						Bold hero
					</button>
				</div>
			</section>

			<section class="genie-sec">
				<h3>Background (Openverse)</h3>
				<label class="genie-row">
					Query
					<input type="text" bind:value={stockQuery} disabled={loading} />
					<button type="button" disabled={loading} onclick={applyStock}>Fetch</button>
				</label>
			</section>

			<section class="genie-sec">
				<h3>Upload</h3>
				<label class="genie-row">
					Hero background
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						disabled={loading}
						onchange={(e) => onUpload(e, 'hero')}
					/>
				</label>
				<label class="genie-row">
					Page background
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						disabled={loading}
						onchange={(e) => onUpload(e, 'background')}
					/>
				</label>
			</section>

			<section class="genie-sec">
				<h3>Versions</h3>
				<p class="genie-muted">
					Active: {health.active?.versionId ?? '(none)'}
				</p>
				<ul class="genie-versions">
					{#each health.versions as v (v.id)}
						<li class:active={health.active?.versionId === v.id}>
							<button
								type="button"
								disabled={loading || health.active?.versionId === v.id}
								onclick={() => activate(v.id)}
							>
								{v.label}
							</button>
							<span class="genie-muted">{v.id === 'baseline' ? 'baseline' : v.createdAt.slice(11, 19)}</span>
						</li>
					{/each}
				</ul>
				<button type="button" class="genie-linkish" disabled={loading} onclick={refresh}>
					Refresh list
				</button>
			</section>
		{:else if loading}
			<p class="genie-muted">Loading…</p>
		{/if}
	</aside>
{/if}

<style>
	.genie-fab {
		position: fixed;
		right: 1.1rem;
		bottom: 1.1rem;
		z-index: 100000;
		border: 1px solid color-mix(in srgb, var(--accent, #c9a227) 55%, #333);
		background: color-mix(in srgb, var(--bg, #111) 88%, #000);
		color: var(--accent, #f0c040);
		font: 600 0.8rem/1 var(--font-sans, system-ui, sans-serif);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.7rem 0.95rem;
		border-radius: 999px;
		cursor: pointer;
		box-shadow: 0 8px 28px color-mix(in srgb, #000 45%, transparent);
	}

	.genie-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 100000;
		width: min(22rem, 100vw);
		overflow: auto;
		background: color-mix(in srgb, var(--bg, #12121a) 94%, #000);
		color: var(--ink, #eee);
		border-left: 1px solid var(--rule, #333);
		padding: 1rem 1rem 2rem;
		font: 0.9rem/1.45 var(--font-sans, system-ui, sans-serif);
		box-shadow: -12px 0 40px color-mix(in srgb, #000 40%, transparent);
	}

	.genie-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.genie-x,
	.genie-panel button {
		cursor: pointer;
	}

	.genie-sec {
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--rule, #333);
	}

	.genie-sec h3 {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-soft, #999);
		font-weight: 600;
	}

	.genie-muted {
		color: var(--ink-soft, #999);
		font-size: 0.82rem;
		margin: 0.25rem 0;
	}

	.genie-hint {
		font-size: 0.78rem;
		color: var(--ink-soft, #aaa);
		line-height: 1.4;
		margin: 0.4rem 0 0;
		word-break: break-word;
	}

	.genie-err {
		background: color-mix(in srgb, #c44 22%, transparent);
		border: 1px solid #c44;
		padding: 0.5rem 0.65rem;
		border-radius: 6px;
		font-size: 0.82rem;
	}

	.genie-row {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
		font-size: 0.82rem;
	}

	.genie-row input[type='text'],
	.genie-row input[type='file'] {
		width: 100%;
	}

	.genie-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.genie-chips button,
	.genie-row button,
	.genie-versions button {
		border: 1px solid var(--rule, #444);
		background: var(--surface, #1c1c22);
		color: var(--ink, #eee);
		border-radius: 6px;
		padding: 0.35rem 0.55rem;
		font-size: 0.78rem;
	}

	.genie-chips button:hover,
	.genie-row button:hover,
	.genie-versions button:hover {
		border-color: var(--accent, #f0c040);
	}

	.genie-versions {
		list-style: none;
		margin: 0.5rem 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.genie-versions li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.genie-versions li.active button {
		border-color: var(--accent, #f0c040);
		color: var(--accent, #f0c040);
	}

	.genie-linkish {
		background: none;
		border: none;
		color: var(--accent, #f0c040);
		padding: 0;
		font-size: 0.8rem;
		text-decoration: underline;
	}
</style>
