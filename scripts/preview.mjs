/**
 * Serve a FilePress `build/` folder the way a static host does:
 * pretty URLs (`/about` → `about.html`) and `404.html` for unknown paths.
 *
 * Usage: node scripts/preview.mjs <buildDir> [port] [host]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.xml': 'application/xml',
	'.txt': 'text/plain; charset=utf-8',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.map': 'application/json'
};

const isMain =
	Boolean(process.argv[1]) && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

function underRoot(root, abs) {
	return abs === root || abs.startsWith(root + sep);
}

/** Map a request path to a file under `root`, or null. */
export function resolveBuildFile(root, urlPath) {
	const pathname = decodeURIComponent((urlPath.split('?')[0] || '/'));
	const rel = pathname.replace(/^\/+/, '');
	const abs = resolve(root, rel);
	if (!underRoot(root, abs)) return null;
	try {
		const st = statSync(abs);
		if (st.isFile()) return abs;
		if (st.isDirectory()) {
			const index = join(abs, 'index.html');
			if (existsSync(index)) return index;
		}
	} catch {
		/* pretty URL or sibling .html next to an empty adapter dir */
	}
	if (!extname(abs) && existsSync(`${abs}.html`)) return `${abs}.html`;
	return null;
}

function send(res, file, status = 200) {
	const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
	res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
	res.end(readFileSync(file));
}

export function startPreview(root, port = 27777, host = '127.0.0.1') {
	const site = resolve(root);
	if (!existsSync(join(site, 'index.html'))) {
		throw new Error(`filepress preview: no index.html in ${site}`);
	}
	const fallback = join(site, '404.html');
	return createServer((req, res) => {
		const file = resolveBuildFile(site, req.url || '/');
		if (file && existsSync(file)) {
			send(res, file);
			return;
		}
		if (existsSync(fallback)) {
			send(res, fallback, 404);
			return;
		}
		res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
		res.end('Not found');
	}).listen(port, host, () => {
		console.log(`filepress: preview http://${host}:${port} → ${site}`);
	});
}

if (isMain) {
	try {
		startPreview(process.argv[2] ?? '', Number(process.argv[3] ?? 27777), process.argv[4] ?? '127.0.0.1');
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}
