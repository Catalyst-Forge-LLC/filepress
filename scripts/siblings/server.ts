/**
 * Local sibling dashboard. Not published. Bind 127.0.0.1 by default.
 *
 *   pnpm siblings
 *   pnpm siblings --port 5198
 *   pnpm siblings --host 0.0.0.0
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	applySite,
	buildInventory,
	discoverSiblingSites,
	loadEngineStrip,
	persistInventory,
	planContext,
	planSite,
	type Inventory
} from './lib.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(here, 'public');

type JobAction = 'plan' | 'apply' | 'ship';

type Job = {
	id: string;
	action: JobAction;
	status: 'running' | 'ok' | 'failed';
	commit: boolean;
	only: string[];
	lines: string[];
	results: { name: string; ok: boolean }[];
	startedAt: string;
	finishedAt: string | null;
};

const jobs = new Map<string, Job>();
let activeJobId: string | null = null;

function parseListen(argv: string[]): { host: string; port: number } {
	let host = '127.0.0.1';
	let port = Number(process.env.FILEPRESS_SIBLINGS_PORT || 5198);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--host') host = argv[++i] || host;
		else if (argv[i]?.startsWith('--host=')) host = argv[i].slice('--host='.length);
		else if (argv[i] === '--port') port = Number(argv[++i]);
		else if (argv[i]?.startsWith('--port=')) port = Number(argv[i].slice('--port='.length));
	}
	if (host === 'true') host = '0.0.0.0';
	if (!Number.isInteger(port) || port < 1) port = 5198;
	return { host, port };
}

function json(res: ServerResponse, status: number, body: unknown): void {
	const data = JSON.stringify(body);
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store'
	});
	res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolveBody, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (c) => chunks.push(c as Buffer));
		req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

function serveStatic(urlPath: string, res: ServerResponse): void {
	const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
	const file = join(publicDir, rel);
	if (!file.startsWith(publicDir) || !existsSync(file)) {
		res.writeHead(404);
		res.end('not found');
		return;
	}
	const types: Record<string, string> = {
		'.html': 'text/html; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.js': 'text/javascript; charset=utf-8',
		'.svg': 'image/svg+xml'
	};
	res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
	res.end(readFileSync(file));
}

const INVENTORY_TTL_MS = 4000;
let cached: Inventory | null = null;
let inFlight: Promise<Inventory> | null = null;

/** Poll traffic and the first paint share one build; a rebuild never runs twice at once. */
async function inventory(force = false): Promise<Inventory> {
	if (!force && cached && Date.now() - Date.parse(cached.builtAt) < INVENTORY_TTL_MS) return cached;
	inFlight ??= buildInventory()
		.then((inv) => {
			cached = inv;
			persistInventory(inv);
			return inv;
		})
		.finally(() => {
			inFlight = null;
		});
	return inFlight;
}

function headersLine(headers: { action: string; added: string[] }): string {
	if (headers.action === 'none') return 'none (engine writes build/_headers)';
	if (headers.action === 'ok') return 'static/_headers already has defaults';
	return `merge static/_headers (+${headers.added.join(', ')})`;
}

async function runJob(job: Job): Promise<void> {
	const log = (line: string) => {
		job.lines.push(line);
	};
	try {
		const engine = await loadEngineStrip();
		log(`engine ${engine.local}  npm ${engine.published ?? 'unknown'}  target ${engine.target}`);
		if (engine.note) log(engine.note);
		let sites = discoverSiblingSites();
		if (job.only.length) {
			const only = new Set(job.only.map((n) => n.toLowerCase()));
			sites = sites.filter((s) => only.has(s.name.toLowerCase()));
		}
		if (sites.length === 0) {
			log('No sibling sites matched.');
			job.status = 'ok';
			return;
		}
		if (job.action === 'plan') {
			const ctx = await planContext(sites);
			for (const site of sites) {
				const plan = planSite(site, engine.target, ctx);
				log('');
				log(plan.name);
				log(`  pin      ${plan.pin}${plan.lockedVersion ? `  locked ${plan.lockedVersion}` : ''}`);
				log(`  update   ${plan.update}`);
				log(`  headers  ${headersLine(plan.headers)}`);
				log(`  ship     ${plan.ship ?? 'none'}`);
				if (plan.gitDirty) log('  git      dirty (apply will commit those files too)');
				job.results.push({ name: site.name, ok: true });
			}
			job.status = 'ok';
			return;
		}
		let failed = 0;
		for (const site of sites) {
			log('');
			log(site.name);
			const ok = applySite(
				site,
				{
					target: engine.target,
					ship: job.action === 'ship',
					commit: job.commit
				},
				log
			);
			job.results.push({ name: site.name, ok });
			if (!ok) failed++;
		}
		job.status = failed ? 'failed' : 'ok';
		log('');
		log(failed ? `${sites.length - failed}/${sites.length} ok, ${failed} failed.` : `${sites.length} site(s) ${job.action} ok.`);
	} catch (err) {
		job.status = 'failed';
		log(err instanceof Error ? err.message : String(err));
	} finally {
		job.finishedAt = new Date().toISOString();
		if (activeJobId === job.id) activeJobId = null;
		cached = null;
	}
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const host = req.headers.host ?? '127.0.0.1';
	const url = new URL(req.url ?? '/', `http://${host}`);
	const method = req.method ?? 'GET';

	if (method === 'GET' && url.pathname === '/api/inventory') {
		json(res, 200, await inventory(url.searchParams.get('refresh') === '1'));
		return;
	}
	if (method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
		const id = url.pathname.slice('/api/jobs/'.length);
		const job = jobs.get(id);
		if (!job) {
			json(res, 404, { error: 'job not found' });
			return;
		}
		json(res, 200, job);
		return;
	}
	if (method === 'POST' && url.pathname === '/api/jobs') {
		if (activeJobId) {
			json(res, 409, { error: 'a job is already running', id: activeJobId });
			return;
		}
		let body: { action?: string; only?: string[]; commit?: boolean } = {};
		try {
			const raw = await readBody(req);
			if (raw.trim()) body = JSON.parse(raw) as typeof body;
		} catch {
			json(res, 400, { error: 'invalid JSON' });
			return;
		}
		const action = body.action;
		if (action !== 'plan' && action !== 'apply' && action !== 'ship') {
			json(res, 400, { error: 'action must be plan, apply, or ship' });
			return;
		}
		const job: Job = {
			id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
			action,
			status: 'running',
			commit: body.commit !== false,
			only: Array.isArray(body.only) ? body.only.filter((n) => typeof n === 'string') : [],
			lines: [],
			results: [],
			startedAt: new Date().toISOString(),
			finishedAt: null
		};
		jobs.set(job.id, job);
		activeJobId = job.id;
		void runJob(job);
		json(res, 202, { id: job.id });
		return;
	}
	if (method === 'GET') {
		serveStatic(url.pathname, res);
		return;
	}
	res.writeHead(405);
	res.end();
}

const { host, port } = parseListen(process.argv.slice(2));
if (host !== '127.0.0.1' && host !== 'localhost') {
	console.warn('sibling dashboard: binding off loopback. This UI can mutate sibling repos.');
}

createServer((req, res) => {
	handle(req, res).catch((err) => {
		console.error(err);
		if (!res.headersSent) json(res, 500, { error: err instanceof Error ? err.message : String(err) });
	});
}).listen(port, host, () => {
	const shown = host === '0.0.0.0' ? '127.0.0.1' : host;
	console.log(`Sibling dashboard  http://${shown}:${port}`);
	console.log('Local operator tool. Does not push. Not published.');
	void inventory().then((inv) => {
		console.log(`Scanned ${inv.sites.length} sibling site(s) in ${inv.buildMs}ms.`);
	});
});
