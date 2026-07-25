# Downpress

A git-native Markdown blog engine. Every post is a plain `.md` file with YAML frontmatter, committed to a Git repo and editable from anywhere — the GitHub mobile app, the GitHub web editor, or any text editor. There is **no admin UI, no database, and no server runtime**: a SvelteKit `adapter-static` build compiles the Markdown into a fast, fully prerendered site that deploys on every push.

## Why

Blogging platforms bring accounts, databases, and plugin ecosystems to something that should be a folder of text files. Downpress keeps the whole thing as files in Git, and moves all the strictness into the build so authoring from a phone text box stays trivial.

## Monorepo layout

Downpress is a pnpm workspace: one engine, one SvelteKit app, and content-only sites.

```
packages/core            @downpress/core — content loader, Markdown pipeline,
                         feeds, config helper, Essay theme, shared components
packages/app             @downpress/app — the only SvelteKit project (all routes)
sites/<name>/            content-only: downpress.config.ts + posts/ + static/
scripts/downpress.mjs    run the app against a site (`dev` / `build` / …)
scripts/create-site.mjs  scaffolds a new content-only site
```

A site is **not** a SvelteKit app. Identity lives in `downpress.config.ts` next to `posts/`. Routes live once in `packages/app` and are selected with `--site`.

## Requirements

- Node.js 20+ (developed on 24)
- pnpm

## Getting started

```bash
pnpm install

pnpm downpress dev --site example-site
pnpm downpress build --site example-site   # → sites/example-site/build/
pnpm downpress check --site demo

pnpm test                 # @downpress/core unit tests
pnpm build                # build example-site + demo
```

### Create a new site

```bash
pnpm create-site my-site --title "My Site" --url https://my.site
pnpm downpress dev --site my-site
```

The scaffold writes config, a starter post, and `static/`. It refuses a non-empty directory.

## Writing a post

Create a Markdown file in the site's `posts/` directory:

```markdown
---
title: "My Post"
date: 2026-07-04
description: A short summary used in listings and SEO.
tags: [notes, sveltekit]
author: Jane Roe
draft: false
updated: 2026-07-05
---

Body content in **Markdown**.
```

### Frontmatter fields

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Build fails (naming the file) if missing. |
| `date` | yes | Strict `YYYY-MM-DD`. Future-dated posts stay hidden until their date arrives. |
| `slug` | no | Derived from the filename if omitted. |
| `description` / `excerpt` | no | Used for listing previews and meta tags. |
| `tags` | no | A YAML list; normalized to lowercase and de-duplicated. |
| `author` | no | Byline shown on the post and in listings. Omit on single-author sites. |
| `draft` | no | `true` hides the post from listings, tags, RSS, and the sitemap — but the page still builds at its URL (unlinked, `noindex`) so you can preview it. |
| `updated` | no | Strict `YYYY-MM-DD`; shown when different from `date`. |

### Conventions & behavior

- **Dates are strict `YYYY-MM-DD`.** Anything else fails the build with the file named.
- **Future-dated posts are hidden** until a build runs on or after their date.
- **Duplicate slugs fail the build**, naming both files.
- **Raw HTML in a post body is passed through** — the content is yours (trust boundary is repo push access). Don't paste untrusted HTML.
- **Images:** place assets under a site's `static/images/posts/<slug>/` and reference them by absolute path, e.g. `/images/posts/<slug>/photo.jpg`, so you never have to compute relative paths on a phone.
- **Captions:** an image on its own line becomes a `<figure>`; its title text becomes the caption, e.g. `![alt text](/images/…/photo.jpg "Caption shown under the image")`.

## Site configuration

Each site declares its identity via `defineDownpressConfig` in `downpress.config.ts` at the site root:

```ts
import { defineDownpressConfig } from '@downpress/core';

export default defineDownpressConfig({
  title: 'My Site',
  description: '…',
  url: 'https://my.site',        // required; canonical origin, no base path
  author: 'Me',
  postsPerPage: 10,
  topics: [{ label: 'Essays', tag: 'essays' }],
  newsletter: { url: 'https://buttondown.email/me', blurb: '…', cta: 'Subscribe' }
});
```

Missing `title`/`url` fails the build loudly. Content lives in the site's own `posts/`; set `DOWNPRESS_CONTENT_DIR` only for local experiments against an external folder.

## How it works

Core reads a site's `posts/*.md` at build time with Node `fs` (server-only), parses with `gray-matter`, validates, and compiles to HTML with a `unified` remark/rehype pipeline (GFM, heading anchors, build-time syntax highlighting, image captions). Every route is prerendered by `adapter-static`. See [`CONTEXT_PROMPT.md`](CONTEXT_PROMPT.md) for architecture and [`docs/PHASE_1_BRIEF.md`](docs/PHASE_1_BRIEF.md) for the full plan.

## Deploy

Target host is **Cloudflare Pages** on a custom domain, per site. Example for example-site:

| Setting | Value |
| --- | --- |
| Root directory | `/` (repo root) |
| Build command | `pnpm install && pnpm downpress build --site example-site` |
| Output directory | `sites/example-site/build` |

CI wiring is still on the roadmap ([`TODO.md`](TODO.md)). Packaging for external content-only repos (Option D) is sketched in [`docs/SITE_PACKAGING_OPTIONS.md`](docs/SITE_PACKAGING_OPTIONS.md).

## Status

Engine + Essay theme + feature batch + **content-only sites with a single shared app (Option C)** work end to end. Two sites build to their own `build/` folders. Next: Option D CLI packaging, then M3 Cloudflare deploy automation.
