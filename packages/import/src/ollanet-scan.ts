/**
 * Optional network discovery for Ollama via ollanet (≥ 0.4.0).
 * LAN TCP scan is opt-in (slow); default scan is localhost + config + Tailscale.
 * Node-only — Genie middleware and the import CLI, never the Svelte client.
 */
import { scanNetwork } from 'ollanet';

export type DiscoveredOllamaServer = {
	label: string;
	endpoint: string;
	source: string;
	self: boolean;
	models: string[];
};

export type OllamaScanResult = {
	ok: boolean;
	network: string;
	sources: string[];
	scanned: number;
	servers: DiscoveredOllamaServer[];
	error?: string;
};

/** Loose scan JSON (ollanet ScanPayload plus incomplete fixtures). */
type ScanPayloadLike = {
	network?: string;
	sources?: string[];
	scanned?: number;
	servers?: Array<{
		hostname?: string;
		dnsName?: string;
		ip?: string;
		source?: string;
		self?: boolean;
		endpoint?: string;
		models?: Array<{ name?: string }>;
	}>;
};

export function normalizeEndpoint(host: string): string {
	return host.trim().replace(/\/+$/, '').toLowerCase();
}

export function serverLabel(server: {
	dnsName?: string;
	hostname?: string;
	ip?: string;
	self?: boolean;
	source?: string;
}): string {
	const name = (server.dnsName || server.hostname || server.ip || 'ollama').trim();
	const bits = [name];
	if (server.self) bits.push('this device');
	if (server.source && server.source !== 'localhost') bits.push(server.source);
	return bits.join(' · ');
}

export function mapScanPayload(payload: ScanPayloadLike): OllamaScanResult {
	const servers = (payload.servers ?? [])
		.map((s) => {
			const endpoint = (s.endpoint || '').trim().replace(/\/+$/, '');
			if (!endpoint) return null;
			const models = (s.models ?? [])
				.map((m) => (m.name || '').trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b));
			return {
				label: serverLabel(s),
				endpoint,
				source: s.source || 'unknown',
				self: Boolean(s.self),
				models
			} satisfies DiscoveredOllamaServer;
		})
		.filter((s): s is DiscoveredOllamaServer => s != null);

	const seen = new Set<string>();
	const deduped: DiscoveredOllamaServer[] = [];
	for (const s of servers) {
		const key = normalizeEndpoint(s.endpoint);
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(s);
	}

	return {
		ok: true,
		network: payload.network || 'local',
		sources: payload.sources ?? [],
		scanned: payload.scanned ?? deduped.length,
		servers: deduped
	};
}

/** Prefer an explicit endpoint, then this-device with models, then any host with models. */
export function pickDiscoveredServer(
	servers: DiscoveredOllamaServer[],
	preferredEndpoint?: string
): DiscoveredOllamaServer | undefined {
	if (preferredEndpoint) {
		const want = normalizeEndpoint(preferredEndpoint);
		const hit = servers.find((s) => normalizeEndpoint(s.endpoint) === want);
		if (hit) return hit;
	}
	const withModels = servers.filter((s) => s.models.length > 0);
	const pool = withModels.length ? withModels : servers;
	return pool.find((s) => s.self) ?? pool[0];
}

/**
 * Discover reachable Ollama servers. Never throws — callers get `error` text.
 * Pass `lan: true` to TCP-scan local /24s (can take several seconds).
 */
export async function scanOllamaNetwork(
	opts: { lan?: boolean } = {}
): Promise<OllamaScanResult> {
	try {
		const payload = await scanNetwork({ lanScan: Boolean(opts.lan) });
		return mapScanPayload(payload);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			ok: false,
			network: '',
			sources: [],
			scanned: 0,
			servers: [],
			error: message
		};
	}
}
