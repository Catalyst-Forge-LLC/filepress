declare module 'ollanet/dist/scan.js' {
	export function scanNetwork(options?: {
		includeOffline?: boolean;
		lanScan?: boolean;
	}): Promise<{
		network: string;
		sources: string[];
		port: number;
		scanned: number;
		servers: Array<{
			hostname: string;
			dnsName: string;
			ip: string;
			port: number;
			os: string;
			source: string;
			self: boolean;
			endpoint: string;
			models: Array<{ name?: string }>;
		}>;
	}>;
}
