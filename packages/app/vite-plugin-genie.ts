import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
	applyConfigOnly,
	applySteer,
	doActivate,
	fetchStockCover,
	health,
	receiveUpload,
	refineWithOllama,
	runInspire,
	scanOllamaHosts
} from './src/lib/genie/ops.ts';
import { deleteVersion, duplicateVersion, listVersionRows, updateVersionMeta } from './src/lib/genie/store.ts';

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
		name: 'filepress-genie',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url || '';
				if (!url.startsWith('/__filepress/genie')) return next();

				const path = url.split('?')[0];
				const method = (req.method || 'GET').toUpperCase();

				try {
					if (method === 'GET' && path === '/__filepress/genie/health') {
						return sendJson(res, 200, await health(siteRoot));
					}

					if (method === 'GET' && path === '/__filepress/genie/versions') {
						const h = await health(siteRoot);
						return sendJson(res, 200, {
							active: h.active,
							versions: listVersionRows(siteRoot),
							brief: h.brief
						});
					}

					if (method === 'POST' && path === '/__filepress/genie/steer') {
						const body = JSON.parse(await readBody(req));
						return sendJson(res, 200, applySteer(siteRoot, body));
					}

					if (method === 'POST' && path === '/__filepress/genie/stock') {
						const body = JSON.parse(await readBody(req));
						if (!body.query || typeof body.query !== 'string') {
							return sendJson(res, 400, { error: '`query` string required' });
						}
						return sendJson(res, 200, await fetchStockCover(siteRoot, body));
					}

					if (method === 'POST' && path === '/__filepress/genie/upload') {
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

					if (method === 'POST' && path === '/__filepress/genie/activate') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						return sendJson(res, 200, {
							active: doActivate(siteRoot, body.versionId)
						});
					}

					if (method === 'POST' && path === '/__filepress/genie/scan') {
						const body = JSON.parse((await readBody(req)) || '{}');
						return sendJson(res, 200, await scanOllamaHosts({ lan: Boolean(body.lan) }));
					}

					if (method === 'POST' && path === '/__filepress/genie/inspire') {
						const body = JSON.parse(await readBody(req));
						const urls = Array.isArray(body.urls)
							? body.urls
							: typeof body.urls === 'string'
								? body.urls.split(/\n+/).map((s: string) => s.trim())
								: [];
						return sendJson(
							res,
							200,
							await runInspire(siteRoot, {
								urls,
								useLlm: body.useLlm,
								model: body.model,
								host: body.host,
								activate: body.activate,
								label: body.label
							})
						);
					}

					if (method === 'POST' && path === '/__filepress/genie/refine') {
						const body = JSON.parse(await readBody(req));
						if (!body.prompt || typeof body.prompt !== 'string') {
							return sendJson(res, 400, { error: '`prompt` string required' });
						}
						return sendJson(
							res,
							200,
							await refineWithOllama(siteRoot, {
								prompt: body.prompt,
								model: body.model,
								host: body.host,
								activate: body.activate
							})
						);
					}

					if (method === 'POST' && path === '/__filepress/genie/config') {
						const body = JSON.parse(await readBody(req));
						if (!body.patch || typeof body.patch !== 'object') {
							return sendJson(res, 400, { error: '`patch` object required' });
						}
						return sendJson(
							res,
							200,
							applyConfigOnly(siteRoot, {
								patch: body.patch,
								label: body.label,
								activate: body.activate
							})
						);
					}

					if (method === 'POST' && path === '/__filepress/genie/star') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						if (typeof body.starred !== 'boolean') {
							return sendJson(res, 400, { error: '`starred` boolean required' });
						}
						return sendJson(res, 200, {
							version: updateVersionMeta(siteRoot, body.versionId, { starred: body.starred })
						});
					}

					if (method === 'POST' && path === '/__filepress/genie/label') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						if (typeof body.label !== 'string') {
							return sendJson(res, 400, { error: '`label` string required' });
						}
						return sendJson(res, 200, {
							version: updateVersionMeta(siteRoot, body.versionId, { label: body.label })
						});
					}

					if (method === 'POST' && path === '/__filepress/genie/duplicate') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						return sendJson(res, 200, {
							version: duplicateVersion(
								siteRoot,
								body.versionId,
								typeof body.label === 'string' ? body.label : undefined
							)
						});
					}

					if (method === 'POST' && path === '/__filepress/genie/delete') {
						const body = JSON.parse(await readBody(req));
						if (!body.versionId) {
							return sendJson(res, 400, { error: '`versionId` required' });
						}
						deleteVersion(siteRoot, body.versionId);
						return sendJson(res, 200, { ok: true });
					}

					return sendJson(res, 404, { error: `Unknown Genie route: ${method} ${path}` });
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					console.error(`filepress genie: ${method} ${path} failed: ${message}`);
					return sendJson(res, 500, { error: message });
				}
			});
		}
	};
}
