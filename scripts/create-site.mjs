#!/usr/bin/env node
// Scaffold a content-only Downpress site into sites/<name>.
//
// Usage:
//   node scripts/create-site.mjs <name> [--title "My Site"] [--url https://my.site]
//
// Sites are NOT SvelteKit apps — they only contain downpress.config.ts, posts/,
// optional static/, and a README. The shared app in packages/app is run via
// `pnpm downpress <dev|build> --site <name>`. Refuses a non-empty directory
// (edge case 18).

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

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

const target = join(repoRoot, 'sites', name);
if (existsSync(target) && readdirSync(target).length > 0) {
	fail(`refusing to overwrite non-empty directory: sites/${name}`);
}

const title = args.title || name;
const url = args.url || `https://${name}.example.com`;

mkdirSync(join(target, 'posts'), { recursive: true });
mkdirSync(join(target, 'static'), { recursive: true });

writeFileSync(
	join(target, 'downpress.config.ts'),
	`import { defineDownpressConfig } from '../../packages/core/src/lib/index.ts';

export default defineDownpressConfig({
	title: ${JSON.stringify(title)},
	description: 'A Downpress site.',
	url: ${JSON.stringify(url)},
	author: ${JSON.stringify(title)},
	topics: []
});
`
);

writeFileSync(
	join(target, 'README.md'),
	`# ${title}

Content-only Downpress site. Edit identity in [\`downpress.config.ts\`](downpress.config.ts)
and posts in [\`posts/\`](posts/). The shared engine + routes live in
[\`packages/app\`](../../packages/app) and [\`packages/core\`](../../packages/core).

\`\`\`bash
pnpm downpress dev --site ${name}
pnpm downpress build --site ${name}   # → build/
\`\`\`
`
);

writeFileSync(
	join(target, '.gitignore'),
	`/build
.DS_Store
Thumbs.db
`
);

writeFileSync(
	join(target, 'tsconfig.json'),
	`{
	"compilerOptions": {
		"module": "esnext",
		"moduleResolution": "bundler",
		"target": "esnext",
		"strict": true,
		"skipLibCheck": true,
		"noEmit": true,
		"allowImportingTsExtensions": true
	},
	"include": ["downpress.config.ts"]
}
`
);

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

console.log(`Created sites/${name} (content-only)`);
console.log(`Next:`);
console.log(`  pnpm downpress dev --site ${name}`);
