---
title: Deploy notes
date: 2026-08-08
updated: 2026-08-11
description: Pin getfilepress for CI and point Cloudflare Pages at a static build folder.
tags: [deploy, workflow]
---

The full deploy guide lives on **[Deploy](/deploy)** (Cloudflare Pages happy path + any static host). This post is the short version.

## Pin the engine

Local `link:../filepress` only works on your machine. For CI:

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.3"
  }
}
```

Git pin also works: `github:Catalyst-Forge-LLC/filepress#v0.1.3`. Prefer a tag or SHA over floating `main`.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory | `/` (the site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

Set `url` in `filepress.config.ts` to the live custom domain. Agents wiring CI: see [`docs/DEPLOY.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/DEPLOY.md).
