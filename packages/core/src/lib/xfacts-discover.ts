import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { labelCardFromMarkdown, sortLabelCards, type XFactsLabelCard } from './xfacts-labels';

const SKIP_DIRS = new Set([
	'node_modules',
	'build',
	'dist',
	'coverage',
	'examples',
	'fixtures',
	'test',
	'tests',
	'.filepress',
	'.wrangler',
	'.svelte-kit'
]);

const MAX_DEPTH = 6;
const MAX_BYTES = 200_000;

/** Repository root that contains this site, or the site root when no .git is found. */
export function repoRootForSite(siteRoot: string): string {
	let dir = resolve(siteRoot);
	for (let i = 0; i < 8; i++) {
		if (existsSync(join(dir, '.git'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return resolve(siteRoot);
}

function walk(dir: string, depth: number, files: string[]): void {
	if (depth > MAX_DEPTH) return;
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			walk(full, depth + 1, files);
		} else if (entry.isFile() && /_FACTS\.md$/i.test(entry.name)) {
			files.push(full);
		}
	}
}

/** A site `static/` copy of a skill pack is an install file, not a second label. */
function copyRank(id: string): number {
	return id.split('/').includes('static') ? 1 : 0;
}

function labelText(raw: string): string {
	return raw.replace(/\r\n/g, '\n').trim();
}

/** Find project xFacts labels and turn each one into a home-page card. */
export function discoverXFactsLabels(siteRoot: string): XFactsLabelCard[] {
	const root = repoRootForSite(siteRoot);
	const files: string[] = [];
	walk(root, 0, files);
	const ordered = files
		.map((file) => ({ file, id: relative(root, file).split(sep).join('/') }))
		.sort((a, b) => copyRank(a.id) - copyRank(b.id) || a.id.localeCompare(b.id));
	const seen = new Set<string>();
	const cards: XFactsLabelCard[] = [];
	for (const { file, id } of ordered) {
		let size = 0;
		try {
			size = statSync(file).size;
		} catch {
			continue;
		}
		if (size > MAX_BYTES) continue;
		let raw = '';
		try {
			raw = readFileSync(file, 'utf8');
		} catch {
			continue;
		}
		const text = labelText(raw);
		if (seen.has(text)) continue;
		seen.add(text);
		const card = labelCardFromMarkdown(id, basename(file), raw);
		if (card) cards.push(card);
	}
	return sortLabelCards(cards);
}
