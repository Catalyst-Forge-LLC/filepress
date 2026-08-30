import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertNoGenieInBuild } from './assert-no-genie.mjs';

describe('assertNoGenieInBuild', () => {
	it('allows a clean static build', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-nogenie-ok-'));
		writeFileSync(join(root, 'index.html'), '<html><body>Genie is a local cockpit.</body></html>');
		assert.doesNotThrow(() => assertNoGenieInBuild(root));
	});

	it('fails when a Genie chunk name or API path is present', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-nogenie-bad-'));
		mkdirSync(join(root, '_app', 'immutable', 'assets'), { recursive: true });
		writeFileSync(
			join(root, '_app', 'immutable', 'assets', 'GeniePanel.abc.css'),
			'.genie-fab{position:fixed}'
		);
		writeFileSync(join(root, 'index.html'), '<link href="/_app/immutable/assets/GeniePanel.abc.css">');
		assert.throws(() => assertNoGenieInBuild(root), /Genie leaked/);
	});
});
