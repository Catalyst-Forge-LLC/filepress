import { describe, expect, it } from 'vitest';
import {
	mapScanPayload,
	normalizeEndpoint,
	pickDiscoveredServer,
	serverLabel
} from './ollanet-scan.ts';
import { assertOllamaEndpoint } from './ollama.ts';

describe('mapScanPayload', () => {
	it('maps ollanet JSON into picker rows and drops empty endpoints', () => {
		const result = mapScanPayload({
			network: 'tailscale',
			sources: ['localhost', 'tailscale'],
			scanned: 3,
			servers: [
				{
					hostname: 'studio',
					dnsName: 'studio.tailnet.ts.net',
					ip: '100.64.0.2',
					source: 'tailscale',
					self: false,
					endpoint: 'http://100.64.0.2:11434/',
					models: [{ name: 'gemma4:12b' }, { name: 'llama3.2:1b' }]
				},
				{
					hostname: 'laptop',
					dnsName: 'localhost',
					ip: '127.0.0.1',
					source: 'localhost',
					self: true,
					endpoint: 'http://127.0.0.1:11434',
					models: [{ name: 'gemma4:12b' }]
				},
				{ hostname: 'ghost', endpoint: '', models: [] }
			]
		});
		expect(result.ok).toBe(true);
		expect(result.servers).toHaveLength(2);
		expect(result.servers[0].endpoint).toBe('http://100.64.0.2:11434');
		expect(result.servers[0].label).toContain('studio.tailnet.ts.net');
		expect(result.servers[0].models).toEqual(['gemma4:12b', 'llama3.2:1b']);
		expect(result.servers[1].self).toBe(true);
	});

	it('dedupes the same endpoint', () => {
		const result = mapScanPayload({
			servers: [
				{ endpoint: 'http://127.0.0.1:11434', models: [{ name: 'a' }] },
				{ endpoint: 'http://127.0.0.1:11434/', models: [{ name: 'b' }] }
			]
		});
		expect(result.servers).toHaveLength(1);
		expect(result.servers[0].models).toEqual(['a']);
	});
});

describe('pickDiscoveredServer', () => {
	const servers = [
		{
			label: 'gpu · tailscale',
			endpoint: 'http://100.64.0.2:11434',
			source: 'tailscale',
			self: false,
			models: ['gemma4:12b']
		},
		{
			label: 'localhost · this device',
			endpoint: 'http://127.0.0.1:11434',
			source: 'localhost',
			self: true,
			models: ['llama3.2:1b']
		}
	];

	it('honors an explicit preferred endpoint', () => {
		const hit = pickDiscoveredServer(servers, 'http://100.64.0.2:11434/');
		expect(hit?.endpoint).toBe('http://100.64.0.2:11434');
	});

	it('prefers this-device when no preference is given', () => {
		expect(pickDiscoveredServer(servers)?.self).toBe(true);
	});
});

describe('normalizeEndpoint / serverLabel', () => {
	it('strips trailing slashes case-insensitively', () => {
		expect(normalizeEndpoint('HTTP://127.0.0.1:11434/')).toBe('http://127.0.0.1:11434');
	});

	it('tags self and non-localhost sources', () => {
		expect(serverLabel({ hostname: 'box', source: 'lan', self: true })).toBe(
			'box · this device · lan'
		);
	});
});

describe('assertOllamaEndpoint', () => {
	it('accepts http(s) hosts and strips a path', () => {
		expect(assertOllamaEndpoint('http://127.0.0.1:11434/')).toBe('http://127.0.0.1:11434');
	});

	it('rejects credentials and non-http schemes', () => {
		expect(() => assertOllamaEndpoint('http://user:pass@127.0.0.1:11434')).toThrow(
			/credentials/
		);
		expect(() => assertOllamaEndpoint('file:///etc/passwd')).toThrow(/http\(s\)/);
	});
});
