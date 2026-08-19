/**
 * Default Cloudflare Pages / Netlify `_headers` for a FilePress build.
 * A site-owned `static/_headers` wins: adapter-static copies it first, and
 * we refuse to overwrite `build/_headers`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const templatePath = join(dirname(fileURLToPath(import.meta.url)), 'default-headers.txt');

export function defaultSecurityHeaders(): string {
	return readFileSync(templatePath, 'utf8');
}

export function writeBuildHeaders(buildDir: string): 'wrote' | 'kept' {
	const dest = join(buildDir, '_headers');
	if (existsSync(dest)) return 'kept';
	writeFileSync(dest, defaultSecurityHeaders());
	return 'wrote';
}

export type MergeSecurityHeadersResult = {
	text: string;
	changed: boolean;
	added: string[];
};

type HeaderBlock = { path: string; lines: string[] };

/** Header name from a `_headers` line (`Name: value` or `! Name`). */
export function headerNameFromLine(line: string): string | null {
	const t = line.trim();
	if (!t || t.startsWith('#')) return null;
	if (t.startsWith('! ')) return t.slice(2).trim().toLowerCase();
	const colon = t.indexOf(':');
	if (colon === -1) return null;
	return t.slice(0, colon).trim().toLowerCase();
}

function isPathLine(line: string): boolean {
	if (line.startsWith(' ') || line.startsWith('\t')) return false;
	const t = line.trim();
	return t.startsWith('/') || t.startsWith('http://') || t.startsWith('https://');
}

function parseHeadersFile(text: string): { preamble: string[]; blocks: HeaderBlock[] } {
	const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	const preamble: string[] = [];
	const blocks: HeaderBlock[] = [];
	let current: HeaderBlock | null = null;
	let beforeFirst = true;

	for (const line of lines) {
		if (isPathLine(line)) {
			current = { path: line.trim(), lines: [] };
			blocks.push(current);
			beforeFirst = false;
			continue;
		}
		if (beforeFirst) preamble.push(line);
		else if (current) current.lines.push(line);
	}
	return { preamble, blocks };
}

function serializeHeadersFile(preamble: string[], blocks: HeaderBlock[]): string {
	const out: string[] = [...preamble];
	for (const block of blocks) {
		out.push(block.path);
		out.push(...block.lines);
	}
	let text = out.join('\n');
	if (!text.endsWith('\n')) text += '\n';
	return text;
}

function starHeaderLines(defaults: string): string[] {
	const { blocks } = parseHeadersFile(defaults);
	const star = blocks.find((b) => b.path === '/*');
	if (!star) {
		throw new Error('default _headers template has no /* block');
	}
	return star.lines.filter((line) => headerNameFromLine(line));
}

function blockIndent(lines: string[]): string {
	for (const line of lines) {
		if (headerNameFromLine(line)) {
			const match = /^(?<indent>[ \t]+)/.exec(line);
			if (match?.groups?.indent) return match.groups.indent;
		}
	}
	return '  ';
}

/**
 * Fold FilePress default `/*` security rules into a site-owned `_headers`
 * without dropping other path blocks. Existing values for the same header
 * name win (including an explicit `Access-Control-Allow-Origin`).
 */
export function mergeSecurityHeaders(
	existing: string,
	defaults: string = defaultSecurityHeaders()
): MergeSecurityHeadersResult {
	const wanted = starHeaderLines(defaults);
	const parsed = parseHeadersFile(existing);
	const added: string[] = [];
	let star = parsed.blocks.find((b) => b.path === '/*');
	if (!star) {
		star = { path: '/*', lines: [''] };
		parsed.blocks.push(star);
	}

	const present = new Set(
		star.lines.map((line) => headerNameFromLine(line)).filter((n): n is string => Boolean(n))
	);
	const indent = blockIndent(star.lines);

	let insertAt = star.lines.length;
	while (insertAt > 0 && star.lines[insertAt - 1].trim() === '') insertAt--;

	for (const line of wanted) {
		const name = headerNameFromLine(line);
		if (!name || present.has(name)) continue;
		star.lines.splice(insertAt, 0, `${indent}${line.trim()}`);
		insertAt++;
		present.add(name);
		added.push(name);
	}

	const text = serializeHeadersFile(parsed.preamble, parsed.blocks);
	return { text, changed: added.length > 0, added };
}
