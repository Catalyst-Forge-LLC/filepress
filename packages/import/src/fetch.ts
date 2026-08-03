const DEFAULT_UA = 'DownpressImport/0.1 (+https://github.com/Catalyst-Forge-LLC/downpress)';

export async function fetchText(
	url: string,
	opts: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<{ url: string; status: number; text: string; contentType: string }> {
	const timeoutMs = opts.timeoutMs ?? 30_000;
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: {
				'user-agent': DEFAULT_UA,
				accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				...opts.headers
			},
			redirect: 'follow'
		});
		const contentType = res.headers.get('content-type') ?? '';
		const text = await res.text();
		return { url: res.url, status: res.status, text, contentType };
	} finally {
		clearTimeout(timer);
	}
}

export async function fetchBuffer(url: string, timeoutMs = 30_000): Promise<Uint8Array> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: { 'user-agent': DEFAULT_UA },
			redirect: 'follow'
		});
		if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
		return new Uint8Array(await res.arrayBuffer());
	} finally {
		clearTimeout(timer);
	}
}

export function originOf(url: string): string {
	const u = new URL(url);
	return `${u.protocol}//${u.host}`;
}

export function resolveUrl(base: string, href: string): string | null {
	try {
		return new URL(href, base).href;
	} catch {
		return null;
	}
}

export function sameOrigin(a: string, b: string): boolean {
	try {
		return new URL(a).origin === new URL(b).origin;
	} catch {
		return false;
	}
}
