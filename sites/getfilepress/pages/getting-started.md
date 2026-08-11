---
title: Getting started
description: Install getfilepress, scaffold a content-only site, and run your first build.
order: 1
---

FilePress is published on npm as **`getfilepress`**. The CLI bins are `filepress` and `getfilepress` (same script). You need **Node.js 20+** and [pnpm](https://pnpm.io).

## Scaffold a site

From a clone of the [filepress](https://github.com/Catalyst-Forge-LLC/filepress) engine:

```bash
pnpm install
pnpm create-site my-blog --external ../my-blog \
  --title "My Blog" \
  --url https://my.blog

cd ../my-blog
pnpm install
pnpm dev      # local preview
pnpm build    # → build/
```

The site folder stays content-only:

- `filepress.config.ts` — title, URL, nav, topics, optional `homePage`
- `posts/` — dated Markdown posts (`/posts/<slug>`)
- `pages/` — evergreen Markdown pages (`about.md` → `/about`)
- `static/` — favicon, images, logo
- `theme.css` — optional Essay overrides
- `package.json` — depends on `"getfilepress": "link:../filepress"` locally

## Config

```ts
import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({
  title: 'My Blog',
  description: 'Notes and essays.',
  url: 'https://my.blog',
  author: 'Me',
  tagline: 'Ends before means.',
  topics: [{ label: 'Essays', tag: 'essays' }]
});
```

`title` and `url` are required. Missing values fail the build with a clear error.

For a product-style home (static page at `/`, posts at `/writing`), set `homePage: 'home'` and add `pages/home.md` — this site does exactly that.

## Commands

| Command | What it does |
| --- | --- |
| `filepress dev` | Dev server + Genie FAB |
| `filepress build` | Static `build/` |
| `filepress preview` | Serve the build (no Genie) |
| `filepress check` | Type-check against the site |

In the engine monorepo, pass `--site <name>` (for example `--site getfilepress`). Sibling sites use cwd mode — no `--site` flag.

## Next

- Import an existing site: [Import](/import)
- Tune look and feel in dev: [Genie](/genie)
- Walkthrough posts: [Writing](/writing)
