#!/usr/bin/env node
// Scaffold a content-only filepress site.
//
// Monorepo (default):
//   node scripts/create-site.mjs my-site --title "My Site" --url https://my.site
//   → sites/my-site/
//
// External sibling repo:
//   node scripts/create-site.mjs example-site --external ../example-site \
//     --title "…" --url https://…
//   → writes package.json with "getfilepress": "link:<rel-to-engine>"
//
// Refuses a non-empty target (edge case 18), unless --force is passed (still
// refuses to overwrite filepress.config.ts / package.json if present).

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

function fail(msg) {
	console.error(`create-site: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { _: [], force: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--title' || a === '--url' || a === '--external') args[a.slice(2)] = argv[++i];
		else if (a === '--force') args.force = true;
		else args._.push(a);
	}
	return args;
}

const args = parseArgs(process.argv.slice(2));
const name = args._[0];

if (!name) {
	fail(
		'missing site name.\n' +
			'  Usage: node scripts/create-site.mjs <name> [--title ..] [--url ..] [--external <path>]'
	);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
	fail(`invalid site name "${name}". Use lowercase letters, numbers, and hyphens.`);
}

const external = Boolean(args.external);
const target = external ? resolve(repoRoot, args.external) : join(repoRoot, 'sites', name);

if (existsSync(target)) {
	const entries = readdirSync(target).filter((e) => e !== '.git' && e !== 'artifacts');
	if (entries.length > 0 && !args.force) {
		fail(`refusing to overwrite non-empty directory: ${target} (pass --force to merge carefully)`);
	}
	if (existsSync(join(target, 'filepress.config.ts'))) {
		fail(`filepress.config.ts already exists in ${target}`);
	}
	if (external && existsSync(join(target, 'package.json'))) {
		fail(`package.json already exists in ${target}`);
	}
}

const title = args.title || name;
const url = args.url || `https://${name}.example.com`;

mkdirSync(join(target, 'posts'), { recursive: true });
mkdirSync(join(target, 'pages'), { recursive: true });
mkdirSync(join(target, 'static'), { recursive: true });

const defaultFavicon = join(repoRoot, 'packages', 'core', 'src', 'lib', 'assets', 'favicon.svg');
if (existsSync(defaultFavicon)) {
	copyFileSync(defaultFavicon, join(target, 'static', 'favicon.svg'));
}

const configImport = external
	? `import { defineFilepressConfig } from 'getfilepress';`
	: `import { defineFilepressConfig } from 'getfilepress';`;

writeFileSync(
	join(target, 'filepress.config.ts'),
	`${configImport}

export default defineFilepressConfig({
	title: ${JSON.stringify(title)},
	description: 'A filepress site.',
	url: ${JSON.stringify(url)},
	author: ${JSON.stringify(title)},
	topics: []
});
`
);

writeFileSync(
	join(target, '.gitignore'),
	`/build
/node_modules
.DS_Store
Thumbs.db
.filepress/
.filepress-genie/
.filepress-import/crawl-cache/
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

writeFileSync(
	join(target, 'pages', 'about.md'),
	`---
title: About
description: About ${title}.
order: 1
---

Tell visitors who you are. This page lives at \`/about\` — edit \`pages/about.md\`.
`
);

if (external) {
	const relToEngine = relative(target, repoRoot).replace(/\\/g, '/') || '..';
	writeFileSync(
		join(target, 'package.json'),
		JSON.stringify(
			{
				name,
				private: true,
				version: '0.0.1',
				type: 'module',
				scripts: {
					dev: 'filepress dev --host',
					build: 'filepress build',
					preview: 'filepress preview',
					check: 'filepress check'
				},
				devDependencies: {
					// link: uses the live engine tree (with its workspace node_modules).
					// Alternatives after publish / push:
					// "getfilepress": "^0.1.1"
					// "getfilepress": "github:Catalyst-Forge-LLC/filepress#v0.1.1"
					getfilepress: `link:${relToEngine}`
				}
			},
			null,
			'\t'
		) + '\n'
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
	"include": ["filepress.config.ts"]
}
`
	);

	writeFileSync(
		join(target, 'README.md'),
		`# ${title}

Content-only filepress site. Local engine via \`link:${relToEngine}\`.

\`\`\`bash
# once in the engine repo
cd ${relToEngine} && pnpm install

# in this site
pnpm install
pnpm dev
pnpm build    # → build/
\`\`\`

Optional: add \`theme.css\` next to \`filepress.config.ts\` to
override the default Essay theme.

## Deploy

\`link:\` only works on your machine. For CI/hosting, pin npm or a git tag:

\`\`\`json
"getfilepress": "^0.1.1"
\`\`\`

**Cloudflare Pages (recommended):** build \`pnpm install && pnpm build\`, output \`build\`, Node 20+.

Any static host: publish the \`build/\` folder. Details: https://getfilepress.com/deploy
`
	);

	console.log(`Created external site at ${target}`);
	console.log(`Next:`);
	console.log(`  cd ${relToEngine} && pnpm install   # if not already`);
	console.log(`  cd ${target} && pnpm install && pnpm dev`);
} else {
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
	"include": ["filepress.config.ts"]
}
`
	);

	writeFileSync(
		join(target, 'README.md'),
		`# ${title}

Content-only filepress site (monorepo). Edit [\`filepress.config.ts\`](filepress.config.ts)
and [\`posts/\`](posts/). Optional [\`theme.css\`](theme.css) overrides the Essay theme.

\`\`\`bash
pnpm filepress dev --site ${name}
pnpm filepress build --site ${name}   # → build/
\`\`\`
`
	);

	console.log(`Created sites/${name} (content-only)`);
	console.log(`Next: pnpm filepress dev --site ${name}`);
}
