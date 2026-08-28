---
title: Importing an existing site
date: 2026-08-09
updated: 2026-08-28
description: Use filepress import to crawl a public blog into Markdown posts and pages.
tags: [workflow, getting-started]
---

`filepress import` crawls a public site into a sibling content tree. Discovery prefers sitemap and RSS.

```bash
pnpm filepress import --source https://example.com \
  --inspire https://www.catalystforge.com \
  --yes
```

Articles land in `posts/`. Evergreen URLs land in `pages/`. A long home bio becomes `pages/home.md` plus `homePage` (index at `/posts`). Old paths go to `static/_redirects`.

Pass up to three `--inspire` URLs. Structure from the first; accent and fonts from the rest. With Ollama, import asks for a token brief. `--no-llm` still writes a deterministic `theme.css`.

After import, `pnpm dev` on the new site. Open **Genie** if the first theme needs a local taste loop. Overview: [Import](/import).
