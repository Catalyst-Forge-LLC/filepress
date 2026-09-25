---
title: Markdown from git
description: Publish Markdown from git as a static site. Import a public site or start from files.
order: 0
---

Publish Markdown from git as a static site, with tags, feeds, and a theme you can adapt. Start with a folder of posts, or use the supported import workflow to bring an existing site into plain files.

No CMS. No database. No server at runtime.

<div class="cta-row">
  <a class="cta cta-primary" href="/docs/getting-started">Read the docs</a>
  <a class="cta cta-secondary" href="https://github.com/Catalyst-Forge-LLC/filepress">View on GitHub</a>
</div>

## Shortest path

A content-only folder is enough:

```text
my-blog/
  filepress.config.ts
  package.json
  posts/2026-09-10-hello.md
```

Write posts as Markdown files. Build the site locally, then publish the generated files to your static host.

`package.json` depends on **`getfilepress`** `^0.1.37`, a compatible range, and maps the commands. Commit the lockfile if you want later installs to resolve the same set. "Pin" here means an exact version, not a caret range:

```json
{
  "type": "module",
  "scripts": {
    "dev": "filepress dev",
    "build": "filepress build",
    "preview": "filepress preview"
  },
  "devDependencies": { "getfilepress": "^0.1.37" }
}
```

`filepress.config.ts` needs `title` and `url`. Add `logo: null` for a text title, or put a `logo.png` in `static/`. The build fails if it links a logo that is not there.

```ts
import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({ title: 'My Blog', url: 'https://my.blog', logo: null });
```

The post needs `title` and `date` (`YYYY-MM-DD`) in frontmatter. Then:

```bash
pnpm install
pnpm build      # writes ./build/
pnpm preview    # serves build/ at http://127.0.0.1:27777, no Genie
```

`pnpm dev` is the optional design loop. It is not required to produce a site. FilePress does not pick a host or upload `build/` for you. [Getting started](/docs/getting-started) has the scaffold command if you want a full starter tree.

Live result of this engine: [getfilepress.com](https://getfilepress.com) (this page). In-repo fixture: `sites/demo` (`pnpm filepress dev --site demo` from a FilePress clone).

## Why this engine

Markdown, RSS, tags, and static hosting are common. Two FilePress paths that are less generic:

**Import a public site.** `filepress import --source https://example.com` crawls sitemap or RSS when it can, writes Markdown into a sibling folder, and can draft a first `theme.css`. You review the files. Nothing is published until you build and deploy. `--no-llm` stays deterministic when Ollama is down. [Import](/import)

**Genie, locally.** In `filepress dev` only, a floating cockpit can steer `theme.css`, `static/`, and a few config fields (`lede`, `tagline`, `logo`). Experiments stay in gitignored `.filepress-genie/`. What you commit is ordinary CSS, files, and config. [Genie](/genie)

## Dev versus production

| Command | What runs |
| --- | --- |
| `filepress dev` | Vite preview plus the Genie FAB |
| `filepress build` | Static `build/`. A leak check fails the build if Genie markers appear |
| `filepress preview` | Serves `build/` with no Genie |

A static host never needs Genie, Ollama, or `filepress dev`.

## First-party examples

These are Catalyst Forge sites, not independent customer adoption. All of them use the default **Essay** chrome plus a site-root `theme.css`. Named presets `ink` and `folio` exist in the engine. These live pages do not switch those presets.

| Site | Customization |
| --- | --- |
| [getfilepress.com](https://getfilepress.com) | Essay plus `theme.css` (wider measure, product chrome) |
| [haulout.dev](https://haulout.dev) | Essay plus `theme.css` |
| [localslip.dev](https://localslip.dev) | Essay plus `theme.css` |
| In-repo `sites/demo` | Essay plus an accent override in `theme.css` |

## Start here

- **[Docs](/docs)** — install, import, Genie, theme, deploy
- **[Writing](/writing)** — walkthroughs
- **npm:** [`getfilepress`](https://www.npmjs.com/package/getfilepress) · **GitHub:** [Catalyst-Forge-LLC/filepress](https://github.com/Catalyst-Forge-LLC/filepress)

## What ships

A reverse-chronological index, or a custom home like this one (`homePage`). Tags, RSS, sitemap, robots.txt. Essay theme, plus `ink` / `folio` presets and a site-root `theme.css`. Optional `paths` mounts for a site-owned HTML tree. Optional Genie, locally. Experiments stay in `.filepress-genie/`. What gets committed is CSS, files, and config.
