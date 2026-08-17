---
title: Import
description: Crawl a public site into a FilePress content tree with filepress import.
order: 2
---

Bring an existing public blog into FilePress without hand-copying every post. The importer discovers URLs (sitemap/RSS preferred), extracts articles and pages, scaffolds a sibling content site, and optionally asks a local Ollama model for a first-pass theme.

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

`--inspire` URLs (up to three) bias structure and accent; later URLs tint fonts and color. Use `--no-llm` when Ollama is unavailable. You still get a deterministic theme scaffold.

## What lands on disk

A content-only sibling folder with `filepress.config.ts`, `posts/`, `pages/`, `static/`, and a starter `theme.css`. Point its dependency at `"getfilepress": "link:../filepress"`, run `pnpm install`, then `pnpm dev`.

## Design loop after import

Import writes a first `theme.css` you can edit. For local taste-tuning (tokens, stock backgrounds, versioned experiments), open **Genie Mode** in `filepress dev`. Genie never appears in `preview` or production builds. See [Genie](/genie).

Full CLI notes: [`docs/SITE_IMPORT_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/SITE_IMPORT_SPEC.md) in the engine repo. A narrative walkthrough lives in [Writing](/writing).
