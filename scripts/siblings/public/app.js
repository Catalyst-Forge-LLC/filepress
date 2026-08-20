const $ = (id) => document.getElementById(id);

function esc(s) {
	return String(s)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

let inventory = null;
let pollTimer = null;

function selectedNames() {
	return [...document.querySelectorAll('tbody input[type=checkbox]:checked')].map((el) => el.value);
}

function renderEngine(engine, workspace) {
	$('workspace').textContent = workspace;
	$('engine').innerHTML = [
		`<div>Local <strong>${engine.local}</strong></div>`,
		`<div>npm <strong>${engine.published ?? 'unknown'}</strong></div>`,
		`<div>Sync target <strong>${engine.target}</strong></div>`
	].join('');
	const banner = $('banner');
	if (engine.note) {
		banner.textContent = engine.note;
		banner.classList.remove('hidden');
	} else {
		banner.classList.add('hidden');
	}
}

function headerLabel(h) {
	if (h.action === 'none') return 'engine default';
	if (h.action === 'ok') return 'ok';
	return `merge +${h.added.length}`;
}

function gitLabel(dirty) {
	if (dirty === null) return '—';
	return dirty ? 'dirty' : 'clean';
}

function renderRows(sites) {
	const body = $('rows');
	body.replaceChildren();
	for (const site of sites) {
		const tr = document.createElement('tr');
		const behind = site.lockedVersion && site.update.startsWith('pnpm update');
		tr.innerHTML = `
			<td><input type="checkbox" value="${esc(site.name)}" /></td>
			<td><strong>${esc(site.name)}</strong><div class="muted">${esc(site.path)}</div></td>
			<td>${esc(site.pinKind)}<div class="muted">${esc(site.pin)}</div></td>
			<td>${esc(site.lockedVersion ?? '—')}</td>
			<td class="${behind ? 'behind' : ''}">${esc(site.update)}</td>
			<td>${esc(headerLabel(site.headers))}</td>
			<td>${site.ship ? 'yes' : 'no'}</td>
			<td>${esc(gitLabel(site.gitDirty))}</td>
			<td>${site.url ? `<a href="${esc(site.url)}" target="_blank" rel="noreferrer">live</a>` : '—'}</td>
			<td>${site.leasePort ? `:${site.leasePort}` : '—'}</td>
		`;
		body.append(tr);
	}
	updateSelectionLabel();
}

function updateSelectionLabel() {
	const n = selectedNames().length;
	$('selection').textContent = n ? `${n} selected` : 'All discovered sites';
}

async function refresh() {
	const res = await fetch('/api/inventory');
	if (!res.ok) throw new Error(`inventory ${res.status}`);
	inventory = await res.json();
	renderEngine(inventory.engine, inventory.workspace);
	renderRows(inventory.sites);
}

function setBusy(busy) {
	for (const id of ['refresh', 'plan', 'apply', 'ship']) $(id).disabled = busy;
}

async function startJob(action) {
	const only = selectedNames();
	const commit = $('commit').checked;
	setBusy(true);
	$('job-meta').textContent = `Starting ${action}…`;
	$('log').textContent = '';
	const res = await fetch('/api/jobs', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ action, only, commit })
	});
	const body = await res.json();
	if (!res.ok) {
		setBusy(false);
		$('log').textContent = body.error || `job failed (${res.status})`;
		return;
	}
	pollJob(body.id);
}

async function pollJob(id) {
	clearInterval(pollTimer);
	const tick = async () => {
		const res = await fetch(`/api/jobs/${id}`);
		if (!res.ok) {
			clearInterval(pollTimer);
			setBusy(false);
			$('log').textContent = `job ${id} disappeared`;
			return;
		}
		const job = await res.json();
		$('job-meta').textContent = `${job.action} · ${job.status} · ${job.results.filter((r) => r.ok).length}/${job.results.length || '…'} ok`;
		$('log').textContent = job.lines.join('\n');
		$('log').scrollTop = $('log').scrollHeight;
		if (job.status !== 'running') {
			clearInterval(pollTimer);
			setBusy(false);
			refresh().catch((err) => {
				$('log').textContent += `\nrefresh failed: ${err.message}`;
			});
		}
	};
	await tick();
	pollTimer = setInterval(tick, 800);
}

$('refresh').addEventListener('click', () => refresh().catch((err) => alert(err.message)));
$('plan').addEventListener('click', () => startJob('plan'));
$('apply').addEventListener('click', () => {
	if (confirm('Apply will write pins/headers and may commit in the selected repos. No push.')) {
		startJob('apply');
	}
});
$('ship').addEventListener('click', () => {
	if (confirm('Ship will apply, then deploy Pages for sites that have a ship script. No git push.')) {
		startJob('ship');
	}
});
$('all').addEventListener('change', (e) => {
	for (const box of document.querySelectorAll('tbody input[type=checkbox]')) {
		box.checked = e.target.checked;
	}
	updateSelectionLabel();
});
document.addEventListener('change', (e) => {
	if (e.target.matches('tbody input[type=checkbox]')) updateSelectionLabel();
});

refresh().catch((err) => {
	$('engine').textContent = err.message;
});
