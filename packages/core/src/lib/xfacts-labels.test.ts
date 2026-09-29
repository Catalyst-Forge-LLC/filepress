import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverXFactsLabels } from './xfacts-discover';
import { labelCardFromMarkdown } from './xfacts-labels';

const APP = `---
name: Demo
type: spec / tooling
status: active
stack:
  language: TypeScript
  runtime: Node.js
credits:
  generated_with: https://appfacts.dev
---

[appfacts-label]: https://appfacts.dev/v#af1.abc
`;

const SKILL = `---
name: demo-skill
kind: agents-skill
status: active
purpose: Curate a ledger without calling a network
credits:
  generated_with: https://skillfacts.dev
---
`;

describe('labelCardFromMarkdown', () => {
	it('uses the viewer URL when the file has one', () => {
		const card = labelCardFromMarkdown('APP_FACTS.md', 'APP_FACTS.md', APP);
		expect(card?.family).toBe('AppFacts');
		expect(card?.title).toBe('Demo');
		expect(card?.meta).toEqual([
			{ label: 'Type', value: 'spec / tooling' },
			{ label: 'Status', value: 'active' }
		]);
		expect(card?.rows.map((row) => row.value)).toEqual(['TypeScript', 'Node.js']);
		expect(card?.serving).toContain('one repository');
		expect(card?.href).toBe('https://appfacts.dev/v#af1.abc');
		expect(card?.viewer).toBe(true);
	});

	it('falls back to the family site when there is no viewer URL', () => {
		const card = labelCardFromMarkdown('skills/demo/SKILL_FACTS.md', 'SKILL_FACTS.md', SKILL);
		expect(card?.href).toBe('https://skillfacts.dev');
		expect(card?.viewer).toBe(false);
		expect(card?.meta[0]).toEqual({ label: 'Kind', value: 'agents-skill' });
		expect(card?.purpose).toContain('Curate a ledger');
	});
});

describe('discoverXFactsLabels', () => {
	it('reads labels from the repo and skips examples and dependencies', () => {
		const root = mkdtempSync(join(tmpdir(), 'filepress-xfacts-'));
		mkdirSync(join(root, '.git'));
		mkdirSync(join(root, 'site'));
		mkdirSync(join(root, 'skills', 'demo'), { recursive: true });
		mkdirSync(join(root, 'examples'), { recursive: true });
		mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
		writeFileSync(join(root, 'APP_FACTS.md'), APP);
		writeFileSync(join(root, 'skills', 'demo', 'SKILL_FACTS.md'), SKILL);
		writeFileSync(join(root, 'examples', 'APP_FACTS.md'), APP);
		writeFileSync(join(root, 'node_modules', 'pkg', 'APP_FACTS.md'), APP);

		const cards = discoverXFactsLabels(join(root, 'site'));
		expect(cards.map((card) => card.id)).toEqual(['APP_FACTS.md', 'skills/demo/SKILL_FACTS.md']);
		expect(cards[0]?.viewer).toBe(true);
	});
});
