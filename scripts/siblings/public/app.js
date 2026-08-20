const $ = (id) => document.getElementById(id);
const POLL_MS = 10000;

let inventory = null;
let busy = null;
let plannedFor = null;
let jobTimer = null;
let pollTimer = null;
let renderedSites = '';

function esc(s) {
	return String(s)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function selectedNames() {
	return [...document.querySelectorAll('tbody input[type=checkbox]:checked')].map((el) => el.value);
}

/** Apply/Ship stay locked until Plan has run for exactly this selection. */
function selectionKey() {
	const names = selectedNames();
	return names.length ? names.sort().join(',') : '*all*';
}

function show(el, text) {
	el.textContent = text ?? '';
	el.classList.toggle('hidden', !text);
}

function setBusy(label) {
	busy = label;
	show($('busy'), label ? `Working: ${label}…` : '');
	const locked = Boolean(label);
	$('refresh').disabled = locked;
	$('plan').disabled = locked;
	const gated = locked || plannedFor !== selectionKey();
	$('apply').disabled = gated;
	$('ship').disabled = gated;
	$('apply').title = gated && !locked ? 'Run Plan for this selection first' : '';
	$('ship').title = $('apply').title;
}

function renderEngine(inv) {
	const { engine } = inv;
	const ahead = engine.published && engine.published !== engine.local;
	$('engine').innerHTML = [
		`<span class="strip-item"><em>local</em> <b>${esc(engine.local)}</b></span>`,
		`<span class="strip-item"><em>npm</em> <b>${esc(engine.published ?? '—')}</b></span>`,
		`<span class="strip-item${ahead ? ' ahead' : ''}"><em>target</em> <b>${esc(engine.target)}</b></span>`
	].join('');
	$('workspace').textContent = inv.workspace;
	show($('banner'), engine.note ?? '');
	$('scan-meta').textContent = `${inv.sites.length} site(s) · scanned in ${inv.buildMs}ms · ${new Date(inv.builtAt).toLocaleTimeString()}`;
}

function renderChips(sites) {
	const behind = sites.filter((s) => s.update.startsWith('pnpm update') || s.pinKind === 'link').length;
	const headers = sites.filter((s) => s.headers.action === 'merge').length;
	const dirty = sites.filter((s) => s.gitDirty).length;
	const picked = selectedNames().length;
	const chips = [
		`<span class="chip">${sites.length} sites</span>`,
		`<span class="chip${behind ? ' hot' : ''}">${behind} to update</span>`,
		`<span class="chip${headers ? ' hot' : ''}">${headers} header merges</span>`,
		`<span class="chip${dirty ? ' bad' : ''}">${dirty} dirty</span>`
	];
	if (picked) chips.push(`<span class="chip on">${picked} selected</span>`);
	$('chips').innerHTML = chips.join('');
}

function updateBadge(site) {
	if (site.pinKind === 'git') return '<span class="badge mute">git pin</span>';
	if (site.pinKind === 'link') return '<span class="badge todo">link → npm</span>';
	if (site.update.startsWith('already')) return '<span class="badge ok">current</span>';
	return `<span class="badge todo">${esc(site.update.replace('pnpm update getfilepress', '').trim() || 'update')}</span>`;
}

function headersBadge(h) {
	if (h.action === 'none') return '<span class="badge mute">engine default</span>';
	if (h.action === 'ok') return '<span class="badge ok">ok</span>';
	return `<span class="badge todo" title="${esc(h.added.join(', '))}">merge +${h.added.length}</span>`;
}

function gitBadge(dirty) {
	if (dirty === null) return '<span class="badge mute">no git</span>';
	return dirty ? '<span class="badge bad">dirty</span>' : '<span class="badge ok">clean</span>';
}

function renderSkeleton() {
	const body = $('rows');
	body.replaceChildren();
	for (let i = 0; i < 6; i++) {
		const tr = document.createElement('tr');
		tr.className = 'skeleton';
		tr.innerHTML = '<td></td>' + '<td><span></span></td>'.repeat(8);
		body.append(tr);
	}
}

/** Polling must not rebuild the table under the operator's cursor when nothing moved. */
function renderRows(sites, force = false) {
	const signature = JSON.stringify(sites);
	if (!force && signature === renderedSites) return;
	renderedSites = signature;
	const picked = new Set(selectedNames());
	const body = $('rows');
	body.replaceChildren();
	for (const site of sites) {
		const tr = document.createElement('tr');
		if (picked.has(site.name)) tr.classList.add('picked');
		tr.innerHTML = `
			<td class="pick"><input type="checkbox" value="${esc(site.name)}" ${picked.has(site.name) ? 'checked' : ''} /></td>
			<td><div class="site-name">${esc(site.name)}</div><div class="path">${esc(site.path)}</div></td>
			<td><span class="pin">${esc(site.pin)}</span></td>
			<td><span class="pin">${esc(site.lockedVersion ?? '—')}</span></td>
			<td>${updateBadge(site)}</td>
			<td>${headersBadge(site.headers)}</td>
			<td>${gitBadge(site.gitDirty)}</td>
			<td class="num">${site.leasePort ? `<a href="http://127.0.0.1:${site.leasePort}" target="_blank" rel="noreferrer">:${site.leasePort}</a>` : '—'}</td>
			<td>${site.url ? `<a href="${esc(site.url)}" target="_blank" rel="noreferrer">${esc(site.url.replace(/^https?:\/\//, ''))}</a>` : '—'}</td>
		`;
		body.append(tr);
	}
	$('empty').classList.toggle('hidden', sites.length > 0);
}

async function refresh(force = false) {
	const res = await fetch(`/api/inventory${force ? '?refresh=1' : ''}`);
	if (!res.ok) throw new Error(`inventory ${res.status}`);
	inventory = await res.json();
	renderEngine(inventory);
	renderRows(inventory.sites);
	renderChips(inventory.sites);
	show($('error'), '');
}

function schedulePoll() {
	clearTimeout(pollTimer);
	pollTimer = setTimeout(async () => {
		if (!busy) await refresh().catch(() => {});
		schedulePoll();
	}, POLL_MS);
}

function appendLog(text) {
	$('log').textContent = text;
	$('log').scrollTop = $('log').scrollHeight;
}

async function startJob(action) {
	const only = selectedNames();
	setBusy(action);
	$('job-meta').textContent = `${action} starting…`;
	appendLog('');
	const res = await fetch('/api/jobs', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ action, only, commit: $('commit').checked })
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		setBusy(null);
		show($('error'), body.error ?? `job failed (${res.status})`);
		return;
	}
	pollJob(body.id, action, only);
}

async function pollJob(id, action, only) {
	clearInterval(jobTimer);
	const tick = async () => {
		const res = await fetch(`/api/jobs/${id}`);
		if (!res.ok) {
			clearInterval(jobTimer);
			setBusy(null);
			show($('error'), `job ${id} disappeared`);
			return;
		}
		const job = await res.json();
		const ok = job.results.filter((r) => r.ok).length;
		$('job-meta').textContent = `${job.action} · ${job.status} · ${ok}/${job.results.length || '…'} ok`;
		appendLog(job.lines.join('\n'));
		if (job.status === 'running') return;
		clearInterval(jobTimer);
		if (action === 'plan' && job.status === 'ok') {
			plannedFor = only.length ? [...only].sort().join(',') : '*all*';
		}
		setBusy(null);
		await refresh(true).catch((err) => show($('error'), err.message));
	};
	await tick();
	jobTimer = setInterval(tick, 700);
}

$('refresh').addEventListener('click', () => {
	setBusy('refresh');
	refresh(true)
		.catch((err) => show($('error'), err.message))
		.finally(() => setBusy(null));
});
$('plan').addEventListener('click', () => startJob('plan'));
$('apply').addEventListener('click', () => {
	if (confirm('Apply rewrites pins and headers, then commits in each selected repo. No push.')) {
		startJob('apply');
	}
});
$('ship').addEventListener('click', () => {
	if (confirm('Ship applies, then deploys each site that has a ship script. No push.')) {
		startJob('ship');
	}
});
$('clear-log').addEventListener('click', () => {
	appendLog('');
	$('job-meta').textContent = 'No job yet.';
});
$('all').addEventListener('change', (e) => {
	for (const box of document.querySelectorAll('tbody input[type=checkbox]')) {
		box.checked = e.target.checked;
	}
	onSelectionChange();
});
$('workspace').addEventListener('click', async () => {
	const path = inventory?.workspace;
	if (!path) return;
	await navigator.clipboard.writeText(path).catch(() => {});
	const el = $('workspace');
	el.textContent = 'Copied';
	setTimeout(() => {
		el.textContent = path;
	}, 1200);
});
document.addEventListener('change', (e) => {
	if (e.target.matches('tbody input[type=checkbox]')) onSelectionChange();
});

function onSelectionChange() {
	for (const box of document.querySelectorAll('tbody input[type=checkbox]')) {
		box.closest('tr').classList.toggle('picked', box.checked);
	}
	if (inventory) renderChips(inventory.sites);
	setBusy(busy);
}

renderSkeleton();
setBusy('scanning workspace');
refresh()
	.catch((err) => show($('error'), err.message))
	.finally(() => {
		setBusy(null);
		schedulePoll();
	});
