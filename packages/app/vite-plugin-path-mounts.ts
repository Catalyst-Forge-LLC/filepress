import type { IncomingMessage, ServerResponse } from 'node:http';
import {
	createReadStream,
	existsSync,
	statSync,
} from 'node:fs';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import type { PathMount } from '../core/src/lib/paths-shared.ts';

const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
};

function contentType(filePath: string): string {
	return MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Resolve a request path under a mount to a file on disk.
 * Returns null when the path escapes the mount root or does not exist.
 */
function resolveMountFile(mountRoot: string, urlPath: string, mountUrl: string): string | null {
	const prefix = mountUrl.endsWith('/') ? mountUrl.slice(0, -1) : mountUrl;
	let rest = urlPath === prefix ? '' : urlPath.slice(prefix.length);
	if (rest.startsWith('/')) rest = rest.slice(1);
	rest = decodeURIComponent(rest.split('?')[0] ?? '');

	const candidates = rest
		? [rest, join(rest, 'index.html'), `${rest}.html`]
		: ['index.html'];

	for (const rel of candidates) {
		const abs = normalize(resolve(mountRoot, rel));
		const rootNorm = normalize(mountRoot) + sep;
		if (abs !== normalize(mountRoot) && !abs.startsWith(rootNorm)) continue;
		if (existsSync(abs) && statSync(abs).isFile()) return abs;
	}
	return null;
}

function sendFile(res: ServerResponse, filePath: string): void {
	res.statusCode = 200;
	res.setHeader('Content-Type', contentType(filePath));
	res.setHeader('Cache-Control', 'no-store');
	createReadStream(filePath).pipe(res);
}

export interface PathMountsPluginOptions {
	siteRoot: string;
	/** Resolved mounts from site config (may be empty). */
	mounts: PathMount[];
}

/**
 * Serve `paths` mounts in `filepress dev` and copy them into `build/` after
 * `filepress build`. Mount contents are opaque to FilePress (site-owned HTML/CSS/JS).
 */
export function pathMountsPlugin(opts: PathMountsPluginOptions): Plugin {
	const { siteRoot, mounts } = opts;

	return {
		name: 'filepress-path-mounts',
		configureServer(server) {
			if (mounts.length === 0) return;

			server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
				const raw = req.url || '';
				const pathname = raw.split('?')[0] ?? '';
				const mount = mounts.find(
					(m) => pathname === m.url || pathname.startsWith(`${m.url}/`),
				);
				if (!mount) return next();

				const root = resolve(siteRoot, mount.dir);
				if (!existsSync(root)) return next();

				const file = resolveMountFile(root, pathname, mount.url);
				if (!file) return next();
				sendFile(res, file);
			});
		},
		// Copy happens in scripts/filepress.mjs after `vite build` so adapter-static
		// has already written `build/` (closeBundle runs too early / wrong tree).
	};
}

/** Dev helper: relative path for logging. */
export function describeMount(siteRoot: string, mount: PathMount): string {
	return `${mount.url} ← ${relative(siteRoot, resolve(siteRoot, mount.dir)) || mount.dir}`;
}
