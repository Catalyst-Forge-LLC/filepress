---
title: Import
description: Crawl a public site into a FilePress content tree with filepress import.
order: 2
---

`filepress import` crawls a public blog into Markdown. It discovers URLs (sitemap/RSS preferred), extracts articles and pages, scaffolds a sibling content site, and can ask a local Ollama model for a first-pass theme.

## Quick start

From the engine repo:

```bash
pnpm install
pnpm filepress import --source https://example.com \
  --inspire https://www.catalystforge.com \
  --yes
```

Dry-run without writing files:

```bash
pnpm filepress import --source https://example.com --dry-run --no-llm
```

`--inspire` URLs (up to three) bias structure and accent; later URLs tint fonts and color. `--no-llm` stays deterministic when Ollama is down.

## What lands on disk

A content-only sibling folder: `filepress.config.ts`, `posts/`, `pages/`, `static/`, and a starter `theme.css`. Point its dependency at `"getfilepress": "link:../filepress"`, then `pnpm install` and `pnpm dev`.

A long source bio becomes `pages/home.md` and `homePage: 'home'` (post index at `/posts`). Old article URLs are written to `static/_redirects` for Cloudflare Pages / Netlify.

## After import

Import writes a first `theme.css`. For local taste-tuning, open **Genie** in `filepress dev`. Genie never appears in `preview` or production. See [Genie](/genie).

CLI notes: [`docs/SITE_IMPORT_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/SITE_IMPORT_SPEC.md). A walkthrough lives in [Writing](/writing).
