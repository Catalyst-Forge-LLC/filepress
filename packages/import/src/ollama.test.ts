import { describe, expect, it } from 'vitest';
import {
	appendOllamaChatDelta,
	applyPaletteHint,
	buildDesignBriefPrompt,
	DEFAULT_OLLAMA_CHAT_TIMEOUT_MS,
	hexRelativeLuminance,
	isAbortLike,
	LIGHT_FLOOR,
	ollamaChatTimeoutMs,
	ollamaTimeoutMessage,
	paletteHintFromSteer
} from './ollama.ts';
import { DEFAULT_BRIEF } from './theme.ts';

describe('ollamaChatTimeoutMs', () => {
	it('defaults to ten minutes', () => {
		expect(ollamaChatTimeoutMs({})).toBe(DEFAULT_OLLAMA_CHAT_TIMEOUT_MS);
	});

	it('reads FILEPRESS_OLLAMA_TIMEOUT_MS when sane', () => {
		expect(ollamaChatTimeoutMs({ FILEPRESS_OLLAMA_TIMEOUT_MS: '900000' })).toBe(900_000);
	});

	it('ignores tiny or junk values', () => {
		expect(ollamaChatTimeoutMs({ FILEPRESS_OLLAMA_TIMEOUT_MS: '500' })).toBe(
			DEFAULT_OLLAMA_CHAT_TIMEOUT_MS
		);
		expect(ollamaChatTimeoutMs({ FILEPRESS_OLLAMA_TIMEOUT_MS: 'nope' })).toBe(
			DEFAULT_OLLAMA_CHAT_TIMEOUT_MS
		);
	});
});

describe('isAbortLike / ollamaTimeoutMessage', () => {
	it('recognizes the browser/Node timeout text', () => {
		expect(
			isAbortLike({ name: 'TimeoutError', message: 'The operation was aborted due to timeout' })
		).toBe(true);
		expect(isAbortLike(new Error('boom'))).toBe(false);
	});

	it('tells the author to retry warm and how to raise the budget', () => {
		const msg = ollamaTimeoutMessage({
			host: 'http://127.0.0.1:11434',
			model: 'gemma4:12b',
			timeoutMs: 600_000
		});
		expect(msg).toMatch(/600s/);
		expect(msg).toMatch(/ollama ps/);
		expect(msg).toMatch(/FILEPRESS_OLLAMA_TIMEOUT_MS/);
	});
});

describe('appendOllamaChatDelta', () => {
	it('concatenates streamed message pieces', () => {
		const acc = { content: '' };
		appendOllamaChatDelta(JSON.stringify({ message: { content: '{"mood":' } }), acc);
		appendOllamaChatDelta(JSON.stringify({ message: { content: '"icy"}' } }), acc);
		expect(acc.content).toBe('{"mood":"icy"}');
	});

	it('throws Ollama error events', () => {
		expect(() => appendOllamaChatDelta('{"error":"model is busy"}', { content: '' })).toThrow(
			/busy/
		);
	});
});

describe('paletteHintFromSteer', () => {
	it('reads icy / Antarctica as light, not night', () => {
		expect(paletteHintFromSteer('icy blue Antarctica, bright and crisp')).toBe('light');
		expect(paletteHintFromSteer('cold eye, white snow field')).toBe('light');
		expect(paletteHintFromSteer('midnight noir charcoal')).toBe('dark');
	});
});

describe('applyPaletteHint', () => {
	it('floors a black background when the author asked for light', () => {
		const out = applyPaletteHint(
			{
				...DEFAULT_BRIEF,
				paletteMode: 'dark',
				tokens: { ...DEFAULT_BRIEF.tokens, bg: '#0a0c10', ink: '#e8eef4', accent: '#88c', accentStrong: '#66a' }
			},
			'light'
		);
		expect(out.paletteMode).toBe('light');
		expect(hexRelativeLuminance(out.tokens.bg)).toBeGreaterThan(0.75);
		expect(out.tokens.bg).toBe(LIGHT_FLOOR.bg);
		expect(hexRelativeLuminance(out.tokens.ink)).toBeLessThan(0.45);
	});
});

describe('buildDesignBriefPrompt', () => {
	const ir = {
		title: 'X',
		description: 'd',
		author: 'A',
		canonicalUrl: 'https://x.example'
	};

	it('keeps the import rule that dark inspiration stays dark', () => {
		const { system, user } = buildDesignBriefPrompt({
			intent: 'import',
			seed: DEFAULT_BRIEF,
			ir: { source: { url: 'https://x.example', generator: null }, identity: ir, posts: [], pages: [], nav: [], topics: [], lede: null, homeMarkdown: null, notes: [], assets: [] },
			inspireSummaries: [],
			inspireSignals: []
		});
		expect(system).toMatch(/Preserve dark inspiration/);
		expect(user).toMatch(/MUST stay "dark"/);
	});

	it('tells a Genie steer that ice/Antarctica is a bright page', () => {
		const { system, user } = buildDesignBriefPrompt({
			intent: 'steer',
			steer: 'Antarctica, icy blue, white background',
			seed: DEFAULT_BRIEF,
			ir: { source: { url: 'https://x.example', generator: null }, identity: ir, posts: [], pages: [], nav: [], topics: [], lede: null, homeMarkdown: null, notes: [], assets: [] },
			inspireSummaries: [],
			inspireSignals: []
		});
		expect(system).toMatch(/never a black one/);
		expect(user).toMatch(/Author direction/);
		expect(user).toMatch(/Antarctica/);
		expect(user).not.toMatch(/MUST stay "dark"/);
	});
});
