import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
	applySteer,
	doActivate,
	fetchStockCover,
	health,
	receiveUpload
} from './src/lib/genie/ops.ts';
import { deleteVersion, listVersions } from './src/lib/genie/store.ts';

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
	const body = JSON.stringify(data);
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Cache-Control', 'no-store');
	res.end(body);
}

/**
 * Dev-only Genie Mode API. `apply: 'serve'` keeps this out of `vite build`.
 */
export function geniePlugin(siteRoot: string): Plugin {
	return {
		name: 'downpress-genie',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url || '';
				if (!url.startsWith('/__downpress/genie')) return next();

				const path = url.split('?')[0];
				const method = (req.method || 'GET').toUpperCase();

				try {
					if (method === 'GET' && path === '/__downpress/genie/health') {
						return sendJson(res, 200, await health(siteRoot));
					}

					if (method === 'GET' && path === '/__downpress/genie/versions') {
						const h = await health(siteRoot);
						return sendJson(res, 200, {
							active: h.active,
							versions: listVersions(siteRoot),
							brief: h.brief
						});
					}

					if (method === 'POST' && path === '/__downpress/genie/steer') {
						const body = JSON.parse(await readBody(req));
						return sendJson(res, 200, applySteer(siteRoot, body));
					}

					if (method === 'POST' && path === '/__downpress/genie/stock') {
						const body = JSON.parse(await readBody(req));
						if (!body.query || typeof body.query !== 'string') {
							return sendJson(res, 400, { error: '`query` string required' });
						}
						return sendJson(res, 200, await fetchStockCover(siteRoot, body));
					}

					if (method === 'POST' && path === '/__downpress/genie/upload') {
						const body = JSON.parse(await readBody(req));
						if (!body.dataBase64 || !body.role) {
							return sendJson(res, 400, {
								error: '`role` and `dataBase64` required'
							});
						}
						return sendJson(
							res,
							200,
							receiveUpload(siteRoot, {
								role: body.role,
								filename: body.filename || `${body.role}.jpg`,
								dataBase64: body.dataBase64,
								activate: body.activate
							})
						);
					}

					if (method === 'POST' && path === '/__downpress/genie/activate') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						return sendJson(res, 200, {
							active: doActivate(siteRoot, body.versionId)
						});
					}

					if (method === 'POST' && path === '/__downpress/genie/delete') {
						const body = JSON.parse(await readBody(req));
						deleteVersion(siteRoot, body.versionId);
						return sendJson(res, 200, { ok: true });
					}

					return sendJson(res, 404, { error: `Unknown Genie route: ${method} ${path}` });
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					return sendJson(res, 500, { error: message });
				}
			});
		}
	};
}
