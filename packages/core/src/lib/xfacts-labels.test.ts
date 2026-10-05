import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverXFactsLabels, readXFactsLabel } from './xfacts-discover';
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
		expect(card?.serving).toBe('Serving size: one repository');
		expect(card?.href).toBe('https://appfacts.dev/v#af1.abc');
		expect(card?.viewer).toBe(true);
		expect(card?.home).toBe('https://appfacts.dev');
		expect(card?.summary).toContain('stack');
	});

	it('reads a FeatureFacts selection and leaves unknown fields off the card', () => {
		const card = labelCardFromMarkdown(
			'FEATURE_FACTS.md',
			'FEATURE_FACTS.md',
			`---
name: LocalHelm
type: typescript-node
status: active
mode: map-backed
features:
  - name: Push
    lifecycle: implemented
    availability: unknown
    maturity: unknown
    documentation: partial
    tests: partial
    evidence_state: current
  - name: Scan
    lifecycle: implemented
    availability: conditional
    conditions:
      - kind: plan
        value: Pro
    maturity: unknown
    documentation: partial
    tests: unknown
    evidence_state: current
---
`
		);
		expect(card?.family).toBe('FeatureFacts');
		expect(card?.href).toBe('/xfacts/FEATURE_FACTS.md');
		expect(card?.home).toBe('https://featurefacts.dev');
		expect(card?.serving).toBe('Serving size: one product');
		expect(card?.meta).toEqual([
			{ label: 'Type', value: 'typescript-node' },
			{ label: 'Status', value: 'active' }
		]);
		expect(card?.rows).toEqual([
			{ label: 'Selected', value: 'Push · Scan' },
			{ label: 'Lifecycle', value: 'implemented' },
			{ label: 'Documentation', value: 'partial' },
			{ label: 'Evidence', value: 'current' }
		]);
	});

	it('omits a type or status that is still unknown', () => {
		const card = labelCardFromMarkdown(
			'FEATURE_FACTS.md',
			'FEATURE_FACTS.md',
			`---
name: Draft
type: unknown
status: unknown
credits:
  generated_with: https://featurefacts.dev
---
`
		);
		expect(card?.meta).toEqual([]);
		expect(card?.rows).toEqual([]);
	});

	it('links to the local full label when there is no viewer URL', () => {
		const card = labelCardFromMarkdown('skills/demo/SKILL_FACTS.md', 'SKILL_FACTS.md', SKILL);
		expect(card?.title).toBe('Demo-Skill');
		expect(card?.href).toBe('/xfacts/skills/demo/SKILL_FACTS.md');
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

		mkdirSync(join(root, 'site', 'static', 'skills', 'demo'), { recursive: true });
		writeFileSync(join(root, 'site', 'static', 'skills', 'demo', 'SKILL_FACTS.md'), SKILL);

		const cards = discoverXFactsLabels(join(root, 'site'));
		expect(cards.map((card) => card.id)).toEqual(['APP_FACTS.md', 'skills/demo/SKILL_FACTS.md']);
		expect(cards[0]?.viewer).toBe(true);
		expect(readXFactsLabel(join(root, 'site'), 'APP_FACTS.md')).toBe(APP);
		expect(readXFactsLabel(join(root, 'site'), '../APP_FACTS.md')).toBeNull();
		expect(readXFactsLabel(join(root, 'site'), 'examples/APP_FACTS.md')).toBeNull();
	});
});
