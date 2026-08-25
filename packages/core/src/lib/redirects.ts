/**
 * Cloudflare Pages / Netlify `_redirects` lines.
 * Code owns the file shape; sites and import only supply from/to pairs.
 */
export type RedirectStatus = 301 | 302 | 308;

export type RedirectRule = {
	from: string;
	to: string;
	status: RedirectStatus;
};

const STATUS = new Set<RedirectStatus>([301, 302, 308]);

export function normalizeRedirectPath(path: string): string {
	const trimmed = path.trim();
	if (!trimmed) throw new Error('redirect path cannot be empty');
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		const url = new URL(trimmed);
		const out = url.pathname || '/';
		return out === '/' ? '/' : out.replace(/\/+$/, '') || '/';
	}
	const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
	if (withSlash.includes('*') || withSlash.includes(':splat')) return withSlash;
	return withSlash === '/' ? '/' : withSlash.replace(/\/+$/, '') || '/';
}

export function serializeRedirects(rules: RedirectRule[]): string {
	const lines = rules.map((r) => `${r.from}  ${r.to}  ${r.status}`);
	return `${lines.join('\n')}\n`;
}

export function parseRedirectsFile(text: string): RedirectRule[] {
	const rules: RedirectRule[] = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.replace(/#.*$/, '').trim();
		if (!line) continue;
		const parts = line.split(/\s+/);
		if (parts.length < 2) continue;
		const status = Number(parts[2] ?? 301);
		if (!STATUS.has(status as RedirectStatus)) continue;
		rules.push({
			from: parts[0],
			to: parts[1],
			status: status as RedirectStatus
		});
	}
	return rules;
}

export function mergeRedirects(existing: string, extra: RedirectRule[]): string {
	const have = new Set(parseRedirectsFile(existing).map((r) => `${r.from}\0${r.to}`));
	const add = extra.filter((r) => !have.has(`${r.from}\0${r.to}`));
	if (add.length === 0) return existing.endsWith('\n') ? existing : `${existing}\n`;
	const prefix = existing.trimEnd();
	const block = serializeRedirects(add);
	return prefix ? `${prefix}\n${block}` : block;
}

/** When `/` is a landing page, old `/writing` indexes used to hold the post list. */
export function writingPostRedirects(): RedirectRule[] {
	return [
		{ from: '/writing', to: '/posts', status: 308 },
		{ from: '/writing/*', to: '/posts/:splat', status: 301 }
	];
}

export function redirectsFromSourceUrls(
	pairs: Array<{ sourceUrl: string; destPath: string }>
): RedirectRule[] {
	const rules: RedirectRule[] = [];
	const seen = new Set<string>();
	for (const pair of pairs) {
		let from: string;
		try {
			from = normalizeRedirectPath(pair.sourceUrl);
		} catch {
			continue;
		}
		const to = pair.destPath.startsWith('/') ? pair.destPath : `/${pair.destPath}`;
		if (from === to || from === '/') continue;
		const key = `${from}\0${to}`;
		if (seen.has(key)) continue;
		seen.add(key);
		rules.push({ from, to, status: 301 });
	}
	return rules;
}
