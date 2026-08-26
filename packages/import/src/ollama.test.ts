import { describe, expect, it } from 'vitest';
import {
	appendOllamaChatDelta,
	DEFAULT_OLLAMA_CHAT_TIMEOUT_MS,
	isAbortLike,
	ollamaChatTimeoutMs,
	ollamaTimeoutMessage
} from './ollama.ts';

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
