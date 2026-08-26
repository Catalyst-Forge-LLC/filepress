<script lang="ts">
	type VersionRow = {
		id: string;
		label: string;
		createdAt: string;
		starred?: boolean;
		parentId?: string | null;
	};

	type Health = {
		ollama: {
			available: boolean;
			hint: string;
			model: string;
			host: string;
			models: string[];
		};
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

	type DiscoveredServer = {
		label: string;
		endpoint: string;
		source: string;
		self: boolean;
		models: string[];
	};

	type TabId = 'refine' | 'look' | 'images' | 'inspire' | 'config' | 'history';

	const TABS: Array<{ id: TabId; label: string; hint: string }> = [
		{ id: 'refine', label: 'Refine', hint: 'Ask Ollama' },
		{ id: 'look', label: 'Look', hint: 'Quick steers' },
		{ id: 'images', label: 'Images', hint: 'Stock / upload' },
		{ id: 'inspire', label: 'Inspire', hint: 'From URLs' },
		{ id: 'config', label: 'Config', hint: 'Lede / logo' },
		{ id: 'history', label: 'History', hint: 'Versions' }
	];

	let open = $state(false);
	let tab = $state<TabId>('refine');
	let loading = $state(false);
	let error = $state('');
	let health = $state<Health | null>(null);
	let stockQuery = $state('abstract dark texture');
	let accent = $state('#1e4d6b');
	let inspireUrls = $state('https://www.catalystforge.com\n');
	let useLlm = $state(true);
	let selectedModel = $state('');
	let selectedHost = $state('');
	let discovered = $state<DiscoveredServer[]>([]);
	let includeLan = $state(false);
	let scanning = $state(false);
	let scanNote = $state('');
	let refinePrompt = $state('');
	let cfgLede = $state('');
	let cfgTagline = $state('');
	let cfgLogo = $state('');
	let renamingId = $state<string | null>(null);
	let renameDraft = $state('');
	let jobNote = $state('');
	let jobSecs = $state(0);
	let jobTimer: ReturnType<typeof setInterval> | null = null;

	function formatWait(secs: number): string {
		const m = Math.floor(secs / 60);
		const r = secs % 60;
		return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
	}

	function beginJob(note: string) {
		jobNote = note;
		jobSecs = 0;
		if (jobTimer) clearInterval(jobTimer);
		jobTimer = setInterval(() => {
			jobSecs += 1;
		}, 1000);
	}

	function endJob() {
		if (jobTimer) clearInterval(jobTimer);
		jobTimer = null;
		jobNote = '';
		jobSecs = 0;
	}

	async function api(path: string, init?: RequestInit) {
		const res = await fetch(`/__filepress/genie${path}`, {
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
			if (health?.ollama?.host && !selectedHost) selectedHost = health.ollama.host;
			if (health?.ollama?.model && !selectedModel) selectedModel = health.ollama.model;
			else if (health?.ollama?.models?.length && !selectedModel) {
				selectedModel = health.ollama.models[0];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function openPanel() {
		open = true;
		tab = 'refine';
		await refresh();
	}

	async function steer(brief: Record<string, unknown>, label: string) {
		loading = true;
		error = '';
		try {
			await api('/steer', { method: 'POST', body: JSON.stringify({ brief, label }) });
			await refresh();
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

	function versionWhen(v: VersionRow) {
		if (v.id === 'baseline') return 'pre-Genie snapshot';
		const d = new Date(v.createdAt);
		if (Number.isNaN(d.getTime())) return v.createdAt;
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function startRename(v: VersionRow) {
		renamingId = v.id;
		renameDraft = v.label;
	}

	async function toggleStar(v: VersionRow) {
		if (v.id === 'baseline') return;
		loading = true;
		error = '';
		try {
			await api('/star', {
				method: 'POST',
				body: JSON.stringify({ versionId: v.id, starred: !v.starred })
			});
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function saveLabel(v: VersionRow) {
		const label = renameDraft.trim();
		if (!label || label === v.label) {
			renamingId = null;
			return;
		}
		loading = true;
		error = '';
		try {
			await api('/label', { method: 'POST', body: JSON.stringify({ versionId: v.id, label }) });
			renamingId = null;
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function duplicate(v: VersionRow) {
		loading = true;
		error = '';
		try {
			await api('/duplicate', { method: 'POST', body: JSON.stringify({ versionId: v.id }) });
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		}
	}

	async function removeVersion(v: VersionRow) {
		if (v.id === 'baseline') return;
		if (
			!confirm(
				`Delete “${v.label}”? This only removes the snapshot under .filepress-genie/. The working tree stays as it is.`
			)
		) {
			return;
		}
		loading = true;
		error = '';
		try {
			await api('/delete', { method: 'POST', body: JSON.stringify({ versionId: v.id }) });
			await refresh();
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

	async function onUpload(ev: Event, role: 'hero' | 'background' | 'logo') {
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

	function normalizeHost(host: string) {
		return host.trim().replace(/\/+$/, '').toLowerCase();
	}

	function serverOptions(): DiscoveredServer[] {
		const map = new Map<string, DiscoveredServer>();
		if (health?.ollama?.host) {
			map.set(normalizeHost(health.ollama.host), {
				label: `OLLAMA_HOST (${health.ollama.host})`,
				endpoint: health.ollama.host.replace(/\/+$/, ''),
				source: 'env',
				self: true,
				models: health.ollama.models ?? []
			});
		}
		for (const s of discovered) {
			map.set(normalizeHost(s.endpoint), s);
		}
		return [...map.values()];
	}

	function modelsForHost(host: string): string[] {
		const hit = serverOptions().find((s) => normalizeHost(s.endpoint) === normalizeHost(host));
		return hit?.models ?? health?.ollama?.models ?? [];
	}

	function pickModel(models: string[], preferred: string) {
		if (preferred && models.includes(preferred)) return preferred;
		return models[0] || preferred || '';
	}

	function onHostChange() {
		selectedModel = pickModel(modelsForHost(selectedHost), selectedModel || health?.ollama?.model || '');
	}

	function hostIsReady() {
		if (modelsForHost(selectedHost).length) return true;
		if (!health) return false;
		return (
			health.ollama.available &&
			normalizeHost(selectedHost || health.ollama.host) === normalizeHost(health.ollama.host)
		);
	}

	async function runScan() {
		scanning = true;
		error = '';
		scanNote = includeLan ? 'Scanning LAN + known hosts…' : 'Scanning known hosts / Tailscale…';
		try {
			const data = await api('/scan', {
				method: 'POST',
				body: JSON.stringify({ lan: includeLan })
			});
			discovered = Array.isArray(data.servers) ? data.servers : [];
			if (data.error) {
				scanNote = data.error;
			} else if (!discovered.length) {
				scanNote =
					'No Ollama servers found. Add hosts in ~/.ollanet/config.json, set OLLANET_HOSTS, or enable LAN.';
			} else {
				const sources = Array.isArray(data.sources) ? data.sources.join(', ') : 'scan';
				scanNote = `Found ${discovered.length} server${discovered.length === 1 ? '' : 's'} (${sources}).`;
			}
			const options = serverOptions();
			if (!options.some((s) => normalizeHost(s.endpoint) === normalizeHost(selectedHost))) {
				selectedHost = options[0]?.endpoint || selectedHost;
			}
			onHostChange();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			scanNote = '';
		} finally {
			scanning = false;
		}
	}

	async function runInspire() {
		loading = true;
		error = '';
		beginJob(
			useLlm
				? `Inspire + ${selectedModel || 'Ollama'} — first load of a 12B model can take several minutes`
				: 'Crawling inspiration URLs'
		);
		try {
			await api('/inspire', {
				method: 'POST',
				body: JSON.stringify({
					urls: inspireUrls
						.split(/\n+/)
						.map((s) => s.trim())
						.filter(Boolean),
					useLlm,
					model: selectedModel || undefined,
					host: selectedHost || undefined
				})
			});
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		} finally {
			endJob();
		}
	}

	async function runRefine() {
		loading = true;
		error = '';
		beginJob(
			`Asking ${selectedModel || 'Ollama'} — first load of a 12B model can take several minutes`
		);
		try {
			await api('/refine', {
				method: 'POST',
				body: JSON.stringify({
					prompt: refinePrompt,
					model: selectedModel || undefined,
					host: selectedHost || undefined
				})
			});
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
		} finally {
			endJob();
		}
	}

	async function runConfig() {
		loading = true;
		error = '';
		try {
			const patch: Record<string, string | null> = {};
			if (cfgLede.trim()) patch.lede = cfgLede.trim();
			if (cfgTagline.trim()) patch.tagline = cfgTagline.trim();
			if (cfgLogo.trim()) patch.logo = cfgLogo.trim();
			if (!Object.keys(patch).length) throw new Error('Fill at least one config field');
			await api('/config', {
				method: 'POST',
				body: JSON.stringify({ patch })
			});
			location.reload();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			loading = false;
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
			<div>
				<strong>Genie</strong>
				<p class="genie-tagline">Try a look → activate → commit baked files</p>
			</div>
			<button type="button" class="genie-x" onclick={() => { open = false; endJob(); }}>Close</button>
		</header>

		{#if error}
			<p class="genie-err">{error}</p>
		{/if}
		{#if jobNote}
			<p class="genie-progress" aria-live="polite">
				{jobNote} · {formatWait(jobSecs)} elapsed. Watch the <code>filepress dev</code> terminal for
				“still generating…”.
			</p>
		{/if}

		{#if health}
			<div class="genie-shell">
				<nav class="genie-tabs" aria-label="Genie sections">
					{#each TABS as t (t.id)}
						<button
							type="button"
							class="genie-tab"
							class:active={tab === t.id}
							onclick={() => (tab = t.id)}
							title={t.hint}
						>
							<span class="genie-tab-label">{t.label}</span>
							<span class="genie-tab-hint">{t.hint}</span>
						</button>
					{/each}
				</nav>

				<div class="genie-body">
					{#if tab === 'refine'}
						<section class="genie-sec">
							<h3>Ollama refine</h3>
							<p class="genie-howto">
								Describe the look you want in plain language. Genie asks Ollama — local or another
								server you scan on the network — for a design brief, writes a new version, and
								activates it (page reloads). Undo anytime from <strong>History</strong>.
							</p>

							<div class="genie-status-pill" class:up={hostIsReady()}>
								{hostIsReady() ? 'Ollama up' : 'Ollama down'}
								{#if selectedHost}
									· {selectedHost.replace(/^https?:\/\//, '')}
								{/if}
								{#if hostIsReady() && selectedModel}
									· {selectedModel}
								{/if}
							</div>

							<label class="genie-row">
								Server
								<select bind:value={selectedHost} disabled={loading || scanning} onchange={onHostChange}>
									{#each serverOptions() as s (s.endpoint)}
										<option value={s.endpoint}>{s.label}</option>
									{/each}
								</select>
							</label>
							<div class="genie-scan-row">
								<label class="genie-check genie-check-inline">
									<input type="checkbox" bind:checked={includeLan} disabled={loading || scanning} />
									Include LAN
								</label>
								<button type="button" disabled={loading || scanning} onclick={runScan}>
									{scanning ? 'Scanning…' : 'Scan network'}
								</button>
							</div>
							{#if scanNote}
								<p class="genie-muted">{scanNote}</p>
							{/if}

							{#if hostIsReady() && modelsForHost(selectedHost).length}
								<label class="genie-row">
									Model
									<select bind:value={selectedModel} disabled={loading || scanning}>
										{#each modelsForHost(selectedHost) as m (m)}
											<option value={m}>{m}</option>
										{/each}
									</select>
								</label>
							{:else if !hostIsReady()}
								<p class="genie-hint">{health.ollama.hint}</p>
								<p class="genie-muted">
									Steers, images, and inspire still work without Ollama — use the other tabs. Or scan
									for a server on Tailscale / LAN.
								</p>
							{:else}
								<p class="genie-hint">{health.ollama.hint}</p>
							{/if}

							<label class="genie-row">
								Direction
								<textarea
									rows="3"
									bind:value={refinePrompt}
									placeholder="warmer gold accents, denser nav, softer hero, less noise"
									disabled={loading || !hostIsReady()}
								></textarea>
							</label>
							<button
								type="button"
								class="genie-primary"
								disabled={loading || scanning || !hostIsReady() || !refinePrompt.trim()}
								onclick={runRefine}
							>
								{loading ? `Asking Ollama… ${formatWait(jobSecs)}` : 'Refine & activate'}
							</button>
							<p class="genie-muted">
								The raw Ollama JSON is printed in the <code>filepress dev</code> terminal and saved to
								<code>.filepress-genie/last-ollama.json</code>. “Icy / Antarctica / bright” means a
								light page — activate <strong>baseline</strong> in History first if a prior dark look
								is still the seed.
								<code>gemma4:12b</code> often spends the first few minutes loading into VRAM — that is
								normal. Progress prints in the filepress terminal every 15s. Raise the budget with
								<code>FILEPRESS_OLLAMA_TIMEOUT_MS</code> (default 10 minutes). Tip: set
								<code>FILEPRESS_OLLAMA_MODEL</code> / <code>OLLAMA_HOST</code> for defaults;
								<a href="https://ollanet.dev" target="_blank" rel="noreferrer">ollanet</a> finds other
								boxes. Finetuna can tune a named variant.
							</p>
						</section>
					{:else if tab === 'look'}
						<section class="genie-sec">
							<h3>Quick steers</h3>
							<p class="genie-howto">
								Instant, no LLM. Each chip or accent change creates a version and reloads.
							</p>
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
									Apply accent
								</button>
							</label>
							<div class="genie-chips">
								<button
									type="button"
									disabled={loading}
									onclick={() =>
										steer(
											{
												paletteMode: 'dark',
												hero: 'bold',
												atmosphere: 'noise',
												elevatedCards: true,
												navStyle: 'uppercase-tracked',
												density: 'balanced'
											},
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
					{:else if tab === 'images'}
						<section class="genie-sec">
							<h3>Images</h3>
							<p class="genie-howto">
								Pull a CC stock background from Openverse, or upload a local file. Logo upload
								also sets <code>logo</code> in config.
							</p>
							<label class="genie-row">
								Openverse query
								<input type="text" bind:value={stockQuery} disabled={loading} />
								<button type="button" disabled={loading} onclick={applyStock}>
									Fetch background
								</button>
							</label>
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
							<label class="genie-row">
								Logo
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
									disabled={loading}
									onchange={(e) => onUpload(e, 'logo')}
								/>
							</label>
						</section>
					{:else if tab === 'inspire'}
						<section class="genie-sec">
							<h3>Inspire from URLs</h3>
							<p class="genie-howto">
								Paste 1–3 public site URLs. Genie crawls them and blends a look. Optionally refine
								with the model selected under <strong>Refine</strong>.
							</p>
							<label class="genie-row">
								URLs (one per line)
								<textarea rows="4" bind:value={inspireUrls} disabled={loading}></textarea>
							</label>
							<label class="genie-check">
								<input type="checkbox" bind:checked={useLlm} disabled={loading} />
								Refine with Ollama when available
								{#if selectedModel}
									<span class="genie-muted">({selectedModel})</span>
								{/if}
								{#if selectedHost}
									<span class="genie-muted">{selectedHost.replace(/^https?:\/\//, '')}</span>
								{/if}
							</label>
							<button type="button" class="genie-primary" disabled={loading} onclick={runInspire}>
								Crawl &amp; apply
							</button>
						</section>
					{:else if tab === 'config'}
						<section class="genie-sec">
							<h3>Site chrome</h3>
							<p class="genie-howto">
								Patches <code>filepress.config.ts</code> on activate (lede, tagline, logo path).
								Leave a field blank to skip it.
							</p>
							<label class="genie-row">
								Lede
								<input type="text" bind:value={cfgLede} disabled={loading} />
							</label>
							<label class="genie-row">
								Tagline
								<input type="text" bind:value={cfgTagline} disabled={loading} />
							</label>
							<label class="genie-row">
								Logo path
								<input
									type="text"
									bind:value={cfgLogo}
									placeholder="/images/logo.svg"
									disabled={loading}
								/>
							</label>
							<button type="button" class="genie-primary" disabled={loading} onclick={runConfig}>
								Apply config
							</button>
						</section>
					{:else}
						<section class="genie-sec">
							<h3>Versions</h3>
							<p class="genie-howto">
								Every Genie action saves a snapshot under <code>.filepress-genie/</code> (gitignored).
								Star keepers, rename, duplicate, then activate to bake into the working tree.
								<code>baseline</code> is the pre-Genie look and cannot be deleted.
							</p>
							<p class="genie-muted">
								Active: {health.active?.versionId ?? '(none)'}
								{#if health.versions.length}
									· {health.versions.length} saved
								{/if}
							</p>
							<ul class="genie-versions">
								{#each health.versions as v (v.id)}
									{@const isActive = health.active?.versionId === v.id}
									<li class:active={isActive} class:starred={v.starred}>
										<div class="genie-ver-head">
											<button
												type="button"
												class="genie-star"
												class:on={v.starred}
												disabled={loading || v.id === 'baseline'}
												aria-pressed={v.starred}
												aria-label={v.starred ? 'Unstar version' : 'Star version'}
												onclick={() => toggleStar(v)}
											>
												{v.starred ? '★' : '☆'}
											</button>
											{#if renamingId === v.id}
												<input
													class="genie-rename"
													type="text"
													bind:value={renameDraft}
													disabled={loading}
													aria-label="Version label"
													onkeydown={(e) => {
														if (e.key === 'Enter') void saveLabel(v);
														if (e.key === 'Escape') renamingId = null;
													}}
												/>
											{:else}
												<strong>{v.label}</strong>
											{/if}
											{#if isActive}
												<span class="genie-ver-badge">Active</span>
											{/if}
										</div>
										<p class="genie-ver-when">{versionWhen(v)}</p>
										<div class="genie-ver-actions">
											{#if renamingId === v.id}
												<button type="button" disabled={loading} onclick={() => saveLabel(v)}>
													Save name
												</button>
												<button type="button" disabled={loading} onclick={() => (renamingId = null)}>
													Cancel
												</button>
											{:else}
												<button
													type="button"
													disabled={loading || isActive}
													onclick={() => activate(v.id)}
												>
													Activate
												</button>
												<button type="button" disabled={loading} onclick={() => startRename(v)}>
													Rename
												</button>
												<button type="button" disabled={loading} onclick={() => duplicate(v)}>
													Duplicate
												</button>
												<button
													type="button"
													disabled={loading || v.id === 'baseline' || isActive}
													onclick={() => removeVersion(v)}
												>
													Delete
												</button>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
							<button type="button" class="genie-linkish" disabled={loading} onclick={refresh}>
								Refresh list
							</button>
						</section>
					{/if}
				</div>
			</div>
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
		width: min(28rem, 100vw);
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--bg, #12121a) 94%, #000);
		color: var(--ink, #eee);
		border-left: 1px solid var(--rule, #333);
		padding: 0.85rem 0.75rem 1rem;
		font: 0.9rem/1.45 var(--font-sans, system-ui, sans-serif);
		box-shadow: -12px 0 40px color-mix(in srgb, #000 40%, transparent);
	}

	.genie-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0 0.25rem 0.75rem;
		border-bottom: 1px solid var(--rule, #333);
		margin-bottom: 0.75rem;
		flex-shrink: 0;
	}

	.genie-tagline {
		margin: 0.2rem 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft, #999);
		font-weight: 400;
	}

	.genie-x,
	.genie-panel button {
		cursor: pointer;
	}

	.genie-shell {
		display: grid;
		grid-template-columns: 5.75rem 1fr;
		gap: 0.65rem;
		min-height: 0;
		flex: 1;
		overflow: hidden;
	}

	.genie-tabs {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow: auto;
		padding-right: 0.15rem;
	}

	.genie-tab {
		display: grid;
		gap: 0.1rem;
		text-align: left;
		border: 1px solid transparent;
		background: transparent;
		color: var(--ink-soft, #999);
		border-radius: 8px;
		padding: 0.45rem 0.4rem;
		font-size: 0.72rem;
	}

	.genie-tab-label {
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: inherit;
	}

	.genie-tab-hint {
		font-size: 0.65rem;
		opacity: 0.85;
		line-height: 1.2;
	}

	.genie-tab:hover {
		border-color: var(--rule, #444);
		color: var(--ink, #eee);
	}

	.genie-tab.active {
		border-color: color-mix(in srgb, var(--accent, #f0c040) 55%, var(--rule, #444));
		background: color-mix(in srgb, var(--accent, #f0c040) 12%, transparent);
		color: var(--accent, #f0c040);
	}

	.genie-body {
		overflow: auto;
		padding: 0 0.15rem 1rem 0.35rem;
		border-left: 1px solid var(--rule, #333);
		min-width: 0;
	}

	.genie-sec h3 {
		margin: 0 0 0.45rem;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft, #999);
		font-weight: 600;
	}

	.genie-howto {
		font-size: 0.8rem;
		color: var(--ink-soft, #bbb);
		line-height: 1.45;
		margin: 0 0 0.85rem;
	}

	.genie-status-pill {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--rule, #444);
		color: var(--ink-soft, #999);
		margin-bottom: 0.75rem;
	}

	.genie-status-pill.up {
		border-color: color-mix(in srgb, #3a8 50%, var(--rule));
		color: #7dca9a;
	}

	.genie-muted {
		color: var(--ink-soft, #999);
		font-size: 0.82rem;
		margin: 0.35rem 0;
	}

	.genie-hint {
		font-size: 0.78rem;
		color: var(--ink-soft, #aaa);
		line-height: 1.4;
		margin: 0.4rem 0 0.75rem;
		word-break: break-word;
	}

	.genie-err {
		background: color-mix(in srgb, #c44 22%, transparent);
		border: 1px solid #c44;
		padding: 0.5rem 0.65rem;
		border-radius: 6px;
		font-size: 0.82rem;
		margin: 0 0.25rem 0.65rem;
		flex-shrink: 0;
	}

	.genie-progress {
		margin: 0 0.25rem 0.65rem;
		padding: 0.5rem 0.65rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--accent, #f0c040) 40%, var(--rule, #444));
		font-size: 0.82rem;
		color: var(--ink-soft, #ccc);
		flex-shrink: 0;
	}

	.genie-row {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
		font-size: 0.82rem;
	}

	.genie-row input[type='text'],
	.genie-row input[type='file'],
	.genie-row textarea,
	.genie-row select {
		width: 100%;
		box-sizing: border-box;
	}

	.genie-check {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		margin-bottom: 0.65rem;
	}

	.genie-scan-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.65rem;
	}

	.genie-check-inline {
		margin-bottom: 0;
	}

	.genie-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.genie-chips button,
	.genie-row button,
	.genie-versions button,
	.genie-primary {
		border: 1px solid var(--rule, #444);
		background: var(--surface, #1c1c22);
		color: var(--ink, #eee);
		border-radius: 6px;
		padding: 0.4rem 0.65rem;
		font-size: 0.78rem;
	}

	.genie-primary {
		width: 100%;
		margin-top: 0.25rem;
		border-color: color-mix(in srgb, var(--accent, #f0c040) 50%, var(--rule));
		background: color-mix(in srgb, var(--accent, #f0c040) 16%, var(--surface, #1c1c22));
		color: var(--accent, #f0c040);
		font-weight: 700;
	}

	.genie-chips button:hover,
	.genie-row button:hover,
	.genie-versions button:hover,
	.genie-primary:hover:not(:disabled) {
		border-color: var(--accent, #f0c040);
	}

	.genie-primary:disabled,
	.genie-chips button:disabled,
	.genie-row button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.genie-versions {
		list-style: none;
		margin: 0.5rem 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.genie-versions li {
		display: grid;
		gap: 0.3rem;
		padding: 0.5rem 0.55rem;
		border: 1px solid var(--rule, #444);
		border-radius: 8px;
	}

	.genie-versions li.active {
		border-color: color-mix(in srgb, var(--accent, #f0c040) 55%, var(--rule, #444));
	}

	.genie-ver-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.genie-ver-head strong {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.84rem;
	}

	.genie-star {
		flex: 0 0 auto;
		width: 1.7rem;
		padding: 0.15rem 0;
		border: 1px solid transparent;
		background: none;
		color: var(--ink-soft, #999);
		font-size: 0.95rem;
		line-height: 1;
	}

	.genie-star.on {
		color: var(--accent, #f0c040);
	}

	.genie-ver-badge {
		flex: 0 0 auto;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent, #f0c040);
		border: 1px solid color-mix(in srgb, var(--accent, #f0c040) 45%, var(--rule, #444));
		border-radius: 999px;
		padding: 0.08rem 0.4rem;
	}

	.genie-rename {
		flex: 1 1 auto;
		min-width: 0;
		box-sizing: border-box;
		font: inherit;
		font-size: 0.82rem;
	}

	.genie-ver-when {
		margin: 0;
		font-size: 0.72rem;
		color: var(--ink-soft, #999);
	}

	.genie-ver-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.genie-ver-actions button {
		padding: 0.28rem 0.5rem;
		font-size: 0.72rem;
	}

	.genie-linkish {
		background: none;
		border: none;
		color: var(--accent, #f0c040);
		padding: 0;
		font-size: 0.8rem;
		text-decoration: underline;
	}

	.genie-howto code,
	.genie-muted code {
		font-size: 0.85em;
	}

	@media (max-width: 28rem) {
		.genie-shell {
			grid-template-columns: 1fr;
		}

		.genie-tabs {
			flex-direction: row;
			flex-wrap: wrap;
			border-bottom: 1px solid var(--rule, #333);
			padding-bottom: 0.5rem;
			margin-bottom: 0.25rem;
		}

		.genie-tab {
			flex: 1 1 auto;
			min-width: 4.5rem;
		}

		.genie-tab-hint {
			display: none;
		}

		.genie-body {
			border-left: none;
			padding-left: 0;
		}
	}
</style>
