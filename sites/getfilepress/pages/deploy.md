---
title: Deploy
description: Ship a FilePress site — Cloudflare Pages happy path, plus the static-host contract for everywhere else.
order: 2
---

`filepress build` writes a **static** `build/` folder. There is no runtime server to run — only files to host. Set `url` in `filepress.config.ts` to your live origin (no trailing slash) so RSS, sitemap, and canonical links stay correct.

## Engine dependency in CI

Local sibling sites use `"getfilepress": "link:../filepress"`. Hosts cannot. Pin npm or a git tag:

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.1"
  }
}
```

or:

```json
{
  "devDependencies": {
    "getfilepress": "github:Catalyst-Forge-LLC/filepress#v0.1.1"
  }
}
```

Do not float on `main` — upgrades should be deliberate.

## Cloudflare Pages (recommended)

Git-connect the **site** repo (content-only). Typical settings:

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |
| Node.js version | `20`+ |

Attach a custom domain in Cloudflare; keep config `url` in sync.

### Wrangler CLI

```bash
pnpm build
npx wrangler pages deploy build --project-name <project>
```

This product site’s engine script is `pnpm deploy:www` (Wrangler project `getfilepress`).

## Other hosts

Same contract: install → build → publish **`build/`** as the web root. Works on Netlify, GitHub Pages, object storage + CDN, nginx, etc. No SSR adapters or serverless functions are required. If the host supports a custom 404 document, point it at `404.html` (emitted by the static adapter).

## After deploy

Check `/`, `/rss.xml`, and `/sitemap.xml`. Deeper packaging notes for agents and CI: [`docs/DEPLOY.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/DEPLOY.md) in the engine repo.
