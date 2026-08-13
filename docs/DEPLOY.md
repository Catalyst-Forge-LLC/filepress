# Deploying a FilePress site

FilePress builds a **static** site. There is no Node server in production — host the
`build/` folder on any static CDN/object store.

**Audience:** site authors and agents wiring CI/hosting. Prefer pinned engine
versions; do not float on `main`.

## Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js | `>=20` (`engines` in the engine `package.json`) |
| pnpm | Recommended; matches the engine’s `packageManager` |
| Engine pin | `"getfilepress": "^0.1.1"` (npm) **or** `github:Catalyst-Forge-LLC/filepress#v0.1.1` |

Local `link:../filepress` is for sibling-folder development only — CI cannot use it.

Set `url` in `filepress.config.ts` to the live origin (no trailing slash). Feeds,
sitemap, and canonical URLs use that value.

## Happy path: Cloudflare Pages

Cheapest and simplest for most FilePress sites: git-connected Cloudflare Pages
(or Wrangler upload of `build/`).

### Git-connected site repo

Site repo root = content-only FilePress site (`filepress.config.ts`, `posts/`, …).

| Pages setting | Value |
| --- | --- |
| Framework preset | None / static |
| Root directory | `/` (site repo root) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |
| Node version | `20` (or newer LTS) |

Dependency in the site `package.json` (pick one):

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.1"
  }
}
```

```json
{
  "devDependencies": {
    "getfilepress": "github:Catalyst-Forge-LLC/filepress#v0.1.1"
  }
}
```

Attach a custom domain in the Cloudflare dashboard. Keep `url` in config in sync
with that domain.

### Wrangler (CLI upload)

From a site that already has `build/`:

```bash
pnpm build
npx wrangler pages deploy build --project-name <your-pages-project>
```

In this engine monorepo, the product site uses:

```bash
pnpm ship         # builds sites/getfilepress → Wrangler project `getfilepress`
```

## Any other static host

Same contract everywhere:

1. `pnpm install && pnpm build` (or `filepress build` from the site root)
2. Publish the **`build/`** directory as the web root
3. Serve `404.html` for unknown paths if the host supports a custom 404 (adapter-static emits one)

Examples: Netlify, GitHub Pages, S3+CloudFront, nginx, Caddy. Map their “publish
directory” / “output” setting to `build`. No SSR, no serverless functions required.

## Agent checklist

When an agent deploys or wires CI for a FilePress site:

1. Confirm `filepress.config.ts` `url` matches the production origin.
2. Pin `getfilepress` (npm semver or git tag/SHA) — never `link:` in CI.
3. Set build → `pnpm install && pnpm build`, output → `build`, Node ≥ 20.
4. Prefer Cloudflare Pages when the user has no host preference.
5. After first deploy, verify `/`, `/rss.xml`, and `/sitemap.xml` return 200.

## Related

- Packaging / local `link:` workflow: [`EXTERNAL_SITES.md`](EXTERNAL_SITES.md)
- Product walkthrough: [getfilepress.com/deploy](https://getfilepress.com/deploy)
- Theme / chrome classes (including `.nav-github`): [`THEME.md`](THEME.md)
