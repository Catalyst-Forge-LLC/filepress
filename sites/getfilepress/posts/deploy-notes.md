---
title: Deploy notes
date: 2026-08-08
description: Pin getfilepress for CI and point Cloudflare Pages at a static build folder.
tags: [deploy, workflow]
---

Local `link:../filepress` only works on your machine. For CI and Cloudflare Pages, pin the engine to a tag or commit:

```json
{
  "devDependencies": {
    "getfilepress": "github:Catalyst-Forge-LLC/filepress#v0.1.0"
  }
}
```

| Setting | Value |
| --- | --- |
| Root directory | `/` (the site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

If the engine repo is private, grant the host permission to clone it. Pin deliberately — floating `main` means a silent theme or loader change on the next deploy.

## Honest status

This product site (`sites/getfilepress`) is content-ready in the engine monorepo. Wiring Cloudflare Pages + the getfilepress.com custom domain (roadmap M3) and cutting a public install tag are still follow-ups. Until then, build locally with:

```bash
pnpm filepress build --site getfilepress
# → sites/getfilepress/build/
```

More packaging detail: [`docs/EXTERNAL_SITES.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/EXTERNAL_SITES.md).
