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

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
		if (['--title', '--url', '--external', '--pages-project', '--production-branch', '--root-package'].includes(a)) {
			if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(`missing value for ${a}`);
			args[a.slice(2)] = argv[++i];
		}
		else if (a === '--force') args.force = true;
		else if (a.startsWith('--')) fail(`unknown option ${a}`);
		else args._.push(a);
	}
	return args;
}

const args = parseArgs(process.argv.slice(2));
const name = args._[0];

if (!name) {
	fail(
		'missing site name.\n' +
			'  Usage: node scripts/create-site.mjs <name> [--title ..] [--url ..] [--external <path>]\n' +
			'  Deploy: --pages-project <project> --production-branch <branch> [--root-package <path/package.json>]'
	);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
	fail(`invalid site name "${name}". Use lowercase letters, numbers, and hyphens.`);
}

const external = Boolean(args.external);
const target = external ? resolve(repoRoot, args.external) : join(repoRoot, 'sites', name);

// A domain or directory name is not a Pages deployment target.
const pagesProject = args['pages-project'];
const productionBranch = args['production-branch'];
if (Boolean(pagesProject) !== Boolean(productionBranch)) fail('--pages-project and --production-branch must be supplied together');
if ((pagesProject || args['root-package']) && !external) fail('deployment options require --external');
if (pagesProject && !/^[a-z0-9][a-z0-9-]*$/.test(pagesProject)) fail('invalid Pages project name');
if (productionBranch && !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(productionBranch)) fail('invalid production branch');
if (args['root-package'] && !pagesProject) fail('--root-package requires a configured Pages target');
let rootPackagePath;
let rootPackage;
let rootShip;
if (args['root-package']) {
	rootPackagePath = resolve(repoRoot, args['root-package']);
	const sitePath = relative(dirname(rootPackagePath), target).replaceAll('\\', '/');
	if (!sitePath || sitePath.startsWith('../') || !/^[a-zA-Z0-9_./ -]+$/.test(sitePath)) {
		fail('--root-package must belong to an ancestor of the site with a shell-safe relative path');
	}
	try { rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8')); }
	catch { fail(`cannot read root package.json: ${rootPackagePath}`); }
	if (!rootPackage || typeof rootPackage !== 'object' || Array.isArray(rootPackage)) fail('root package.json must be an object');
	rootShip = `pnpm --dir "${sitePath}" run ship`;
	if (rootPackage.scripts?.ship && rootPackage.scripts.ship !== rootShip) {
		fail('root already has a different ship command; preserve it and wire site delegation explicitly');
	}
}

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
	logo: null,
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
					dev: 'filepress dev --host 0.0.0.0',
					build: 'filepress build',
					preview: 'filepress preview',
					check: 'filepress check',
					...(pagesProject ? { ship: `pnpm build && wrangler pages deploy build --project-name ${pagesProject} --branch ${productionBranch}` } : {})
				},
				devDependencies: {
					// link: uses the live engine tree (with its workspace node_modules).
					// Alternatives after publish / push:
					// "getfilepress": "^0.1.1"
					// "getfilepress": "github:Catalyst-Forge-LLC/filepress#v0.1.1"
					getfilepress: `link:${relToEngine}`,
					...(pagesProject ? { wrangler: JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).devDependencies.wrangler } : {})
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

${pagesProject ? `Pages target: \`${pagesProject}\`, production branch: \`${productionBranch}\`.
Run \`pnpm install\` to install the site's local Wrangler dependency, then \`pnpm ship\` to build and upload.
Confirm the authenticated Cloudflare account and that the Pages project exists before shipping.
${rootPackagePath ? 'The parent package.json also delegates its ship command to this site.' : 'If this site is nested in an app repo, add a root ship command delegating to this site (pnpm --dir <site-path> run ship). Preserve any existing app deployment command.'}
Scaffolding does not provision a cloud project or deploy the site.
` : `Deployment is not configured. Before release, choose the hosting account, project and production branch,
install a local deployment CLI, and add a site \`ship\` command that builds then uploads.
For a nested site, also add root \`ship\` delegation. See https://getfilepress.com/deploy.
`}

\`link:\` only works on your machine. For CI/hosting, pin npm or a git tag:

\`\`\`json
"getfilepress": "^0.1.1"
\`\`\`

**Cloudflare Pages (recommended):** build \`pnpm install && pnpm build\`, output \`build\`, Node 20+.

Any static host: publish the \`build/\` folder. Details: https://getfilepress.com/deploy
`
	);

	console.log(`Created external site at ${target}`);
	if (rootPackagePath) {
		const original = readFileSync(rootPackagePath, 'utf8');
		rootPackage.scripts = { ...rootPackage.scripts, ship: rootShip };
		const indent = original.match(/\n([\t ]+)"/)?.[1] || '\t';
		writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, indent) + '\n');
		console.log(`Added root ship delegation in ${rootPackagePath}`);
	}
	console.log(`Next:`);
	console.log(`  cd ${relToEngine} && pnpm install   # if not already`);
	console.log(`  cd ${target} && pnpm install && pnpm dev`);
	console.log(`  filepress new "My Post"`);
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

Deployment is not configured for this content folder. Before release, configure
the engine repository's build/upload command for this site and confirmed hosting
target. Use an external site package for independent site Ship and root delegation.
See https://getfilepress.com/deploy.
`
	);

	console.log(`Created sites/${name} (content-only)`);
	console.log(`Next: pnpm filepress dev --site ${name}`);
}
