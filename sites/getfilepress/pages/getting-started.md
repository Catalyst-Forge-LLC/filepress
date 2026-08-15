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

Or depend on the published package from an empty folder (after scaffolding by hand or copying a site tree):

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.3"
  }
}
```

The site folder stays content-only:

- `filepress.config.ts` — title, URL, nav, footer, topics, optional `homePage`, optional `paths`
- `posts/` — dated Markdown posts (`/posts/<slug>`)
- `pages/` — evergreen Markdown pages (`about.md` → `/about`)
- `paths` mounts — optional site-owned HTML/CSS/JS trees at a URL prefix (e.g. `/docs`)
- `static/` — favicon, images, logo
- `theme.css` — optional Essay overrides
- `package.json` — `"getfilepress": "link:../filepress"` locally, or npm / git pin in CI

## Config

```ts
import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/acme/my-blog';

export default defineFilepressConfig({
  title: 'My Blog',
  description: 'Notes and essays.',
  url: 'https://my.blog',
  author: 'Me',
  tagline: 'Ends before means.',
  topics: [{ label: 'Essays', tag: 'essays' }],
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'GitHub', href: github, icon: 'github' }
  ],
  // Omitting footerLinks keeps the default RSS + Topics row.
  footerLinks: [
    { label: 'RSS', href: '/rss.xml' },
    { label: 'Topics', href: '/topics' },
    { label: 'GitHub', href: github, icon: 'github' }
  ]
});
```

`title` and `url` are required. Missing values fail the build with a clear error.

### Nav, footer, and icons

- `nav` — header links (defaults to Posts + Topics, or Home + Posts + Topics when `homePage` is set).
- `footerLinks` — footer row (defaults to RSS + Topics when omitted). Setting it **replaces** the default list, so keep RSS/Topics if you still want them.
- `icon: 'github'` — built-in mark beside the label; opens in a new tab. Theme class: `.nav-github` (see [`docs/THEME.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/THEME.md)).

For a product-style home (static page at `/`, posts at `/writing`), set `homePage: 'home'` and add `pages/home.md` — this site does exactly that.

### Path mounts

Attach a site-owned HTML/CSS/JS tree at a URL prefix. FilePress serves the mount in `filepress dev` and copies it into `build/` after the Vite/Kit build. It does **not** parse Markdown or inject Essay chrome — the site owns the shell (for example a docs sidebar).

```ts
paths: [{ url: '/docs', dir: 'docs/dist' }]
```

- `dir` is site-relative; `url` starts with `/` and must not collide with engine routes (`posts`, `writing`, `tags`, …).
- The first URL segment is reserved against `pages/<slug>.md` (so `pages/docs.md` cannot sit next to `url: '/docs'`).
- HTML files under the mount are included in `sitemap.xml`.
- The engine fixture lives at `sites/demo/mounts/docs` (`paths: [{ url: '/docs', dir: 'mounts/docs' }]`).

## Commands

| Command | What it does |
| --- | --- |
| `filepress dev` | Dev server + Genie FAB |
| `filepress build` | Static `build/` |
| `filepress preview` | Serve the build (no Genie) |
| `filepress check` | Type-check against the site |

In the engine monorepo, pass `--site <name>` (for example `--site getfilepress`). Sibling sites use cwd mode — no `--site` flag.

## Next

- Ship it: [Deploy](/deploy)
- Import an existing site: [Import](/import)
- Tune look and feel in dev: [Genie](/genie)
- Walkthrough posts: [Writing](/writing)
