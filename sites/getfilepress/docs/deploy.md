---
title: Deploy
---

`filepress build` writes a **static** `build/` folder. There is no runtime server. Set `url` in `filepress.config.ts` to the live origin (no trailing slash) so RSS, sitemap, and canonical links stay correct.

## Engine dependency in CI

Local sibling sites use `"getfilepress": "link:../filepress"`. Hosts cannot. Pin npm (current is `0.1.37`) or a git SHA / existing tag:

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.37"
  }
}
```

Do not float on `main`. FilePress does not create the Cloudflare project or git-connect the repo. That is host settings.

## Cloudflare Pages

Typical settings for a **content** repo:

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

This product site’s engine script is `pnpm ship` (Wrangler project `getfilepress`).

### Site and repository ship

A deployment-configured site needs `scripts.ship` in its own `package.json`: build, then upload with a local Wrangler to the confirmed Pages project and production branch.

When that site lives inside an app repository, the app `package.json` also needs a root command. The site is not configured until both exist:

```json
"ship": "pnpm --dir site run ship"
```

Use the real directory (`site` or `sites/<name>`). `pnpm ship` from the app repository runs it. Keep any existing app deployment command, and compose the root command when one repository has several sites. The scaffold adds this delegation for a nested git repository when you pass `--pages-project` and `--production-branch`. `filepress check` fails while the site has `ship` and that ancestor package does not run the site. The full contract is [`docs/DEPLOY.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/DEPLOY.md).

## Other hosts

Same contract: install → build → publish **`build/`** as the web root. Netlify, GitHub Pages, object storage + CDN, nginx. No SSR adapters or serverless functions. If the host supports a custom 404 document, point it at `404.html`.

## Headers and redirects

The build writes `_headers` for Cloudflare Pages (Netlify understands it too): HSTS, no framing, and it removes Pages’ default `Access-Control-Allow-Origin: *`. Drop `static/_headers` in the site for different values. The engine does not set `includeSubDomains` or `preload`.

When `homePage` is set, `/writing` lists posts. The build still remaps `/writing/<slug>` → `/posts/<slug>`. Import can add source-URL remaps. Extra rules: config `redirects` or `static/_redirects`.

## After deploy

Check `/`, `/rss.xml`, and `/sitemap.xml`. Agent checklist: [`docs/DEPLOY.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/DEPLOY.md).
