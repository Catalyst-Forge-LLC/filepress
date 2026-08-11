---
title: Importing an existing site
date: 2026-08-09
description: Use filepress import to crawl a public blog into Markdown posts and pages.
tags: [workflow, getting-started]
---

Moving off a CMS or a bespoke stack is usually the painful middle of adopting FilePress. The import CLI shortens that middle.

## Crawl → extract → scaffold

```bash
pnpm filepress import --source https://example.com \
  --inspire https://www.catalystforge.com \
  --yes
```

Discovery prefers sitemap and RSS. Extraction maps articles into `posts/` and evergreen URLs into `pages/`, then scaffolds a sibling content site wired to `getfilepress`.

## Theme without a redesign sprint

Pass up to three `--inspire` URLs. Signals blend: structure from the first, accent and fonts from the rest. With Ollama available, import asks for a token brief; with `--no-llm`, you still get a deterministic `theme.css`.

After import, run `pnpm dev` on the new site and open **Genie** if you want a local taste loop before you commit theme and config. Overview page: [Import](/import).
