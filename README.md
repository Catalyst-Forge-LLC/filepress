# Downpress

A git-native Markdown blog engine. Posts are plain `.md` files with YAML frontmatter — edit them in the GitHub mobile app, the web editor, or any text editor. There is no admin UI, no database, and no server at runtime: a static build produces HTML you can host anywhere (e.g. Cloudflare Pages).

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io)

## Quick start (new site)

From a clone of this repo:

```bash
pnpm install
pnpm create-site my-blog --external ../my-blog --title "My Blog" --url https://my.blog

cd ../my-blog
pnpm install
pnpm dev      # local preview
pnpm build    # → build/
```

The site folder only needs:

- `downpress.config.ts` — title, URL, and other site settings
- `posts/` — Markdown posts (`/posts/<slug>`)
- `pages/` — optional static Markdown pages (`about.md` → `/about`)
- `static/` — favicon, images, etc.
- `package.json` — depends on this engine (`link:../downpress` locally, or a git URL + tag/SHA in CI)

### Import an existing site

Crawl a public site (sitemap/RSS preferred), extract posts and pages, scaffold a sibling Downpress site, and optionally ask a local Ollama model for a token theme:

```bash
pnpm install
pnpm downpress import --source https://example.com \
  --inspire https://www.catalystforge.com \
  --inspire https://app.execfoundry.com/start \
  --yes

# up to 3 --inspire URLs; signals are blended (first biases structure, later ones tint accent/fonts)

# dry-run first (no write):
pnpm downpress import --source https://example.com --dry-run --no-llm
```

See [`docs/SITE_IMPORT_SPEC.md`](docs/SITE_IMPORT_SPEC.md).

More detail: [`docs/EXTERNAL_SITES.md`](docs/EXTERNAL_SITES.md).

### In this repo

`sites/demo` is the engine's example content (frontmatter, drafts, tags, phone
workflow, theme override). Real publications live in their own repos and depend
on this package. From the engine root:

```bash
pnpm install
pnpm dev                 # → demo
pnpm build               # → sites/demo/build/
```

## Site configuration

```ts
import { defineDownpressConfig } from 'downpress';

export default defineDownpressConfig({
  title: 'My Site',
  description: 'A short site description.',
  url: 'https://my.site', // required; canonical origin, no trailing slash
  author: 'Me',
  postsPerPage: 10,
  topics: [{ label: 'Essays', tag: 'essays' }],
  newsletter: {
    url: 'https://buttondown.email/me',
    blurb: 'Occasional notes.',
    cta: 'Subscribe'
  }
});
```

`title` and `url` are required; missing values fail the build with a clear error.

## Theming

The engine ships a default Essay look. To restyle a site, add `theme.css` (or
`theme.scss`) next to `downpress.config.ts`. It loads after the default theme, so
you can override CSS variables and structural classes without forking the app.

```css
/* theme.css */
:root {
  --accent: #1e4d6b;
  --accent-strong: #163a52;
}
```

Token and class reference: [`docs/THEME.md`](docs/THEME.md).

## Writing a post

Add a file under the site's `posts/` directory:

```markdown
---
title: "My Post"
date: 2026-07-04
description: A short summary used in listings and SEO.
tags: [notes]
author: Jane Roe
draft: false
updated: 2026-07-05
---

Body content in **Markdown**.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Build fails (naming the file) if missing. |
| `date` | yes | Strict `YYYY-MM-DD`. Future-dated posts stay hidden until that date. |
| `slug` | no | Derived from the filename if omitted. |
| `description` / `excerpt` | no | Listings and meta tags. |
| `tags` | no | YAML list; lowercased and de-duplicated. |
| `author` | no | Per-post byline; omit on single-author sites. |
| `draft` | no | Hidden from production listings/feeds/sitemap; still builds at its URL. Listed with a Draft label under `pnpm dev` (localhost). |
| `updated` | no | Shown when different from `date`. |

**Images:** put files in `static/images/posts/<slug>/` and reference them as `/images/posts/<slug>/photo.jpg`.

**Captions:** an image alone on a line becomes a `<figure>`; the title attribute is the caption:

```markdown
![alt text](/images/posts/my-post/photo.jpg "Caption under the image")
```

## Deploy

Build output is a static folder. For a site that depends on this engine:

| Setting | Value |
| --- | --- |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

Point the site's dependency at a pinned commit or tag of this repo (not a floating branch) so upgrades are intentional. If this engine repo is private, the host's build needs permission to clone it.

## Repository layout

```
packages/core     shared engine (content pipeline, components, theme)
packages/app      SvelteKit app (routes) used by the CLI
sites/            optional in-repo content sites
scripts/          downpress CLI and create-site scaffold
```

```bash
pnpm test    # engine unit tests
```
