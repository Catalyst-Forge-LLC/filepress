#!/usr/bin/env node
// Scaffold a new Downpress site into sites/<name>.
//
// Usage:
//   node scripts/create-site.mjs <name> [--title "My Site"] [--url https://my.site]
//
// The shared boilerplate (routes, app shell, build config) is copied from the
// reference site `sites/example-site` — routes are identical across sites,
// so it is the single source of truth. Only per-site files (package.json,
// downpress.config.ts, README, starter post) are generated. Refuses to write
// into a non-empty directory (edge case 18).

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const templateSite = join(repoRoot, 'sites', 'example-site');

function fail(msg) {
	console.error(`create-site: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--title' || a === '--url') args[a.slice(2)] = argv[++i];
		else args._.push(a);
	}
	return args;
}

const args = parseArgs(process.argv.slice(2));
const name = args._[0];

if (!name) fail('missing site name. Usage: node scripts/create-site.mjs <name> [--title ..] [--url ..]');
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
	fail(`invalid site name "${name}". Use lowercase letters, numbers, and hyphens.`);
}
if (!existsSync(templateSite)) fail(`template site not found at ${templateSite}.`);

const target = join(repoRoot, 'sites', name);
if (existsSync(target) && readdirSync(target).length > 0) {
	fail(`refusing to overwrite non-empty directory: sites/${name}`);
}

const title = args.title || name;
const url = args.url || `https://${name}.example.com`;

// Copy the shared boilerplate, skipping per-site and generated content.
const SKIP = new Set(
	[
		'node_modules',
		'.svelte-kit',
		'build',
		'README.md',
		'package.json',
		join('src', 'lib', 'downpress.config.ts'),
		'posts'
	].map((p) => join(templateSite, p))
);

cpSync(templateSite, target, {
	recursive: true,
	filter: (src) => !SKIP.has(src)
});

// package.json
writeFileSync(
	join(target, 'package.json'),
	JSON.stringify(
		{
			name,
			private: true,
			version: '0.0.1',
			type: 'module',
			scripts: {
				dev: 'vite dev',
				build: 'vite build',
				preview: 'vite preview',
				prepare: "svelte-kit sync || echo ''",
				check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json'
			},
			dependencies: { '@downpress/core': 'workspace:*' },
			devDependencies: {
				'@sveltejs/adapter-static': '^3.0.10',
				'@sveltejs/kit': '^2.63.0',
				'@sveltejs/vite-plugin-svelte': '^7.1.2',
				'@types/node': '^26.1.0',
				svelte: '^5.56.1',
				'svelte-check': '^4.6.0',
				typescript: '^6.0.3',
				vite: '^8.0.16'
			}
		},
		null,
		'\t'
	) + '\n'
);

// downpress.config.ts
writeFileSync(
	join(target, 'src', 'lib', 'downpress.config.ts'),
	`import { defineDownpressConfig } from '@downpress/core';

export default defineDownpressConfig({
	title: ${JSON.stringify(title)},
	description: 'A Downpress site.',
	url: ${JSON.stringify(url)},
	author: ${JSON.stringify(title)},
	topics: []
});
`
);

// README.md
writeFileSync(
	join(target, 'README.md'),
	`# ${title}

A Downpress site. Content is the Markdown in [\`posts/\`](posts/); identity lives
in [\`src/lib/downpress.config.ts\`](src/lib/downpress.config.ts). Engine logic
comes from [\`@downpress/core\`](../../packages/core).

\`\`\`bash
pnpm --filter ${name} dev
pnpm --filter ${name} build
pnpm --filter ${name} check
\`\`\`
`
);

// Starter post so the site builds immediately.
mkdirSync(join(target, 'posts'), { recursive: true });
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
	join(target, 'posts', 'hello-world.md'),
	`---
title: "Hello, world"
date: ${today}
description: The first post on ${title}.
tags: [meta]
---

This is your first post. Edit or replace \`posts/hello-world.md\`, then push.
`
);

console.log(`Created sites/${name}`);
console.log(`Next:`);
console.log(`  pnpm install`);
console.log(`  pnpm --filter ${name} dev`);
