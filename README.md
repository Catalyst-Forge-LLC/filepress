# FilePress

> File-based Markdown blogs. No admin UI. No database. Just git.

A file-based Markdown blog engine. Posts are plain `.md` files with YAML frontmatter. Edit them in the GitHub mobile app, the web editor, or any text editor. There is no admin UI, no database, and no server at runtime: a static build produces HTML you can host anywhere (for example Cloudflare Pages).

| | |
| --- | --- |
| **Site** | [https://getfilepress.com](https://getfilepress.com) |
| **npm** | [`getfilepress`](https://www.npmjs.com/package/getfilepress) |
| **CLI** | `filepress` (also `getfilepress`) |

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
pnpm dev      # local preview (Genie Mode FAB in the corner)
pnpm build    # → build/
```

The site folder only needs:

- `filepress.config.ts` — title, URL, and other site settings
- `posts/` — Markdown posts (`/posts/<slug>`)
- `pages/` — optional static Markdown pages (`about.md` → `/about`)
- `paths` mounts — optional site-owned HTML/CSS/JS trees at a URL prefix (e.g. `/docs`)
- `static/` — favicon, images, etc.
- `package.json` — depends on this engine (`"getfilepress": "link:../filepress"` locally, `"getfilepress": "^0.1.3"` from npm, or a git URL + tag/SHA)

### Import an existing site

Crawl a public site (sitemap/RSS preferred), extract posts and pages, scaffold a sibling FilePress site, and optionally ask Ollama (local or a host found with `--scan`) for a token theme:

```bash
pnpm install
pnpm filepress import --source https://example.com \
  --inspire https://www.catalystforge.com \
  --inspire https://app.execfoundry.com/start \
  --yes

# up to 3 --inspire URLs; signals are blended (first biases structure, later ones tint accent/fonts)

# dry-run first (no write):
pnpm filepress import --source https://example.com --dry-run --no-llm
```

See [`docs/SITE_IMPORT_SPEC.md`](docs/SITE_IMPORT_SPEC.md).

More detail: [`docs/EXTERNAL_SITES.md`](docs/EXTERNAL_SITES.md).

### In this repo

- `sites/demo` — engine fixture (drafts, scheduled posts, frontmatter cheatsheet). Root `pnpm check` / `pnpm build` target this site.
- `sites/getfilepress` — product site for getfilepress.com (`homePage` landing + Writing). Sibling publications live in their own repos.

```bash
pnpm install
pnpm dev                 # → demo fixture
pnpm build               # → sites/demo/build/
pnpm dev:www             # → product site
pnpm build:www           # → sites/getfilepress/build/
pnpm ship                # build + Wrangler Pages deploy (project: getfilepress)
```

Two `filepress dev` processes share Vite **5173** unless you pin the port. With [LocalBerth](https://www.npmjs.com/package/localberth) 0.2+, `filepress dev` reads a named lease. Claim once; see [docs/LOCALBERTH.md](docs/LOCALBERTH.md).

## Site configuration

```ts
import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({
  title: 'My Site',
  description: 'A short site description.',
  url: 'https://my.site', // required; canonical origin, no trailing slash
  author: 'Me',
  postsPerPage: 10,
  topics: [{ label: 'Essays', tag: 'essays' }],
  nav: [
    { label: 'Posts', href: '/' },
    { label: 'GitHub', href: 'https://github.com/acme/site', icon: 'github' }
  ],
  // Replaces the default RSS + Topics row when set.
  footerLinks: [
    { label: 'RSS', href: '/rss.xml' },
    { label: 'GitHub', href: 'https://github.com/acme/site', icon: 'github' }
  ],
  newsletter: {
    url: 'https://buttondown.email/me',
    blurb: 'Occasional notes.',
    cta: 'Subscribe'
  }
});
```

`title` and `url` are required; missing values fail the build with a clear error.

**Nav / footer:** `nav` is the header; `footerLinks` replaces the default RSS + Topics footer row when set (include those entries yourself if you still want them). Items may set `icon: 'github'` for a built-in mark (`.nav-github` in themes).

### Path mounts

Attach a site-owned HTML/CSS/JS tree at a URL prefix. FilePress copies it into `build/` after the Kit build and serves it in `filepress dev`. It does **not** parse Markdown or inject Essay chrome into the mount. The site owns the shell (for example a docs sidebar).

```ts
paths: [
  { url: '/docs', dir: 'docs/dist' }
]
```

- `dir` is site-relative; `url` starts with `/` and must not collide with engine routes (`posts`, `writing`, `tags`, …).
- The first URL segment is reserved against `pages/<slug>.md`.
- HTML files under the mount are included in `sitemap.xml`.

## Theming

The engine ships a default Essay look. To restyle a site, add `theme.css` next to
`filepress.config.ts`. It loads after the default theme, so you can override CSS
variables and structural classes without forking the app.

In local `filepress dev` / `pnpm dev`, **Genie Mode** (floating FAB) is a design cockpit:
steers, Openverse / uploads, live inspire URLs, optional Ollama refine, and
`lede` / `tagline` / `logo` config patches. Experiments live under `.filepress-genie/`.
Activate writes `theme.css`, `static/`, and config. Dev-only; absent from
`preview` and production builds. See [`docs/GENIE_MODE_SPEC.md`](docs/GENIE_MODE_SPEC.md)
and [getfilepress.com/genie](https://getfilepress.com/genie).

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

`filepress build` emits a static `build/` folder. No Node server in production.

**Happy path: [Cloudflare Pages](https://pages.cloudflare.com/)** (git-connected site repo or Wrangler upload).

| Setting | Value |
| --- | --- |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |
| Node | 20+ |

Pin the engine in the site `package.json` (`"getfilepress": "^0.1.3"` or `github:Catalyst-Forge-LLC/filepress#v0.1.3`). Do not use `link:` in CI. Set config `url` to the live origin.

Any other static host works the same way: publish `build/` as the web root. The build also writes a `_headers` file (HSTS, no framing, no wildcard CORS) for Cloudflare Pages; override it with `static/_headers`.

Full notes (including an agent checklist): [`docs/DEPLOY.md`](docs/DEPLOY.md) · product page: [getfilepress.com/deploy](https://getfilepress.com/deploy).

## Repository layout

```
packages/core     shared engine (content pipeline, components, theme)
packages/app      SvelteKit app (routes + Genie Mode in dev) used by the CLI
packages/import   site crawl / scaffold CLI (also powers Genie theme helpers)
sites/demo        engine fixture content
sites/getfilepress product site (getfilepress.com)
scripts/          filepress CLI and create-site scaffold
```

```bash
pnpm test    # engine unit tests
```

<!-- xfacts-nutrition-label -->

## Nutrition label

- **AppFacts:** [viewer](https://appfacts.dev/v#af1.eNptkkGLGzEMhf-K0dnZoVefygZKt01KYbK9lKUotjLxxmMZWzNhCPnvxZNk9tAebX9Pen7SBUYwnzRE7AkMHHyglKkU0CBTqlc9R86UGDQUQRkKGEArfiTQELylWCq2fdndCHsCc4GAsRuwqy-7KVFrs0-iVTtSENLqG474uFu3rVZfd9sNaMhDFD87-cGOnt6rj0PGns6cT2Dgpv_uBTTsh-gCZTDwywvNzafgYwcG1m0LGo5c5H4OPLhDwEzqJ3ZU4KrBUSpgfl8ggoHPZS78XprTXDtVEWdSZ9qrDwNXfcNv9J17fVGW-8SRovyHHf1CPg8-OCXMQWF0ytGoCuWR8gLLkKPjc1wsxJGyzOkoYbXFfJqfH_wQ_cGTezi5nZTlKNVMymypFB87lXyi4CMtysAWw56yHO_iLUbsSCXOogJhoaIOnNXMVasUOPUUBa5vGspol-z-CVdDHUorKN6q-xCql9G7-tW3OjofXF2ThPaEHf3p5-ZVlmLq6_JRkSXolT2SrYlCXcTihfMEBo4iqZim6bwch_2T5b5Zo2CYiqy-cO5otdmsm4-Vvv4FzW_8rQ) · [raw](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/APP_FACTS.md)

## License

MIT — see [LICENSE](LICENSE).
