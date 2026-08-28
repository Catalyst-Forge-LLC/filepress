---
title: Deploy notes
date: 2026-08-08
updated: 2026-08-28
description: Pin getfilepress for CI and point a static host at the build folder.
tags: [deploy, workflow]
---

The full guide is **[Deploy](/deploy)**. This post is the short version.

## Pin the engine

Local `link:../filepress` only works on one machine. For CI, pin npm (current is `0.1.19`) or a git SHA / existing tag:

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.19"
  }
}
```

Do not float on `main`. FilePress does not git-connect Cloudflare Pages. That is host settings.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory | `/` (the site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

Set `url` in `filepress.config.ts` to the live origin. Agent checklist: [`docs/DEPLOY.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/DEPLOY.md).
