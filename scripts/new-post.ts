/**
 * Stamp a dated Markdown post into a site's posts/ folder.
 *
 *   filepress new "Post title"
 *   filepress new "Post title" --site demo
 *   filepress new "Post title" --draft
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../packages/core/src/lib/content/parse.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

export type NewPostArgs = {
	title: string;
	site: string | null;
	root: string | null;
	draft: boolean;
	help: boolean;
};

export function parseNewArgs(argv: string[]): NewPostArgs {
	const args: NewPostArgs = { title: '', site: null, root: null, draft: false, help: false };
	const titleParts: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--help' || a === '-h') args.help = true;
		else if (a === '--draft') args.draft = true;
		else if (a === '--site') args.site = argv[++i] ?? '';
		else if (a?.startsWith('--site=')) args.site = a.slice('--site='.length);
		else if (a === '--root') args.root = argv[++i] ?? '';
		else if (a?.startsWith('--root=')) args.root = a.slice('--root='.length);
		else if (a.startsWith('-')) throw new Error(`unknown flag: ${a}`);
		else titleParts.push(a);
	}
	args.title = titleParts.join(' ').trim().replace(/^["']|["']$/g, '');
	return args;
}

export function resolveNewSiteRoot(args: Pick<NewPostArgs, 'site' | 'root'>, cwd = process.cwd()): string {
	if (args.root) return resolve(cwd, args.root);
	if (args.site) return join(packageRoot, 'sites', args.site);
	return resolve(cwd);
}

export function isoDate(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

export function newPostFilename(title: string, date: string): { slug: string; filename: string } {
	const slug = slugify(title);
	if (!slug) throw new Error('title did not produce a slug');
	return { slug, filename: `${date}-${slug}.md` };
}

export function renderNewPost(title: string, date: string, draft: boolean): string {
	const draftLine = draft ? 'draft: true\n' : '';
	return `---
title: ${JSON.stringify(title)}
date: ${date}
${draftLine}description: ""
tags: []
---

`;
}

export function writeNewPost(
	siteRoot: string,
	title: string,
	opts: { draft?: boolean; now?: Date } = {}
): { path: string; filename: string } {
	const date = isoDate(opts.now);
	const { filename } = newPostFilename(title, date);
	const postsDir = join(siteRoot, 'posts');
	mkdirSync(postsDir, { recursive: true });
	const dest = join(postsDir, filename);
	if (existsSync(dest)) throw new Error(`already exists: posts/${filename}`);
	writeFileSync(dest, renderNewPost(title, date, Boolean(opts.draft)));
	return { path: dest, filename };
}

function usage(): string {
	return `Usage: filepress new "Post title" [--draft] [--site name | --root path]

Writes posts/YYYY-MM-DD-slug.md next to filepress.config.ts.
Does not commit or deploy.`;
}

export function main(argv = process.argv.slice(2)): number {
	let args: NewPostArgs;
	try {
		args = parseNewArgs(argv);
	} catch (err) {
		console.error(`filepress new: ${err instanceof Error ? err.message : err}`);
		return 1;
	}
	if (args.help) {
		console.log(usage());
		return 0;
	}
	if (!args.title) {
		console.error(usage());
		return 1;
	}
	const siteRoot = resolveNewSiteRoot(args);
	if (!existsSync(join(siteRoot, 'filepress.config.ts'))) {
		console.error(`filepress new: no filepress.config.ts in ${siteRoot}`);
		return 1;
	}
	try {
		const written = writeNewPost(siteRoot, args.title, { draft: args.draft });
		console.log(`Wrote posts/${written.filename}`);
		return 0;
	} catch (err) {
		console.error(`filepress new: ${err instanceof Error ? err.message : err}`);
		return 1;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
	process.exitCode = main();
}
