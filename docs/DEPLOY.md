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
| Engine pin | `"getfilepress": "^0.1.37"` (npm) **or** a git SHA / existing tag — not `main` |

Local `link:../filepress` is for sibling-folder development only — CI cannot use it.

Set `url` in `filepress.config.ts` to the live origin (no trailing slash). Feeds,
sitemap, and canonical URLs use that value.

## Cloudflare Pages

Git-connect the **content** repo in the Cloudflare dashboard, or upload `build/`
with Wrangler. FilePress does not create the project or attach git.

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
    "getfilepress": "^0.1.37"
  }
}
```

```json
{
  "devDependencies": {
    "getfilepress": "github:Catalyst-Forge-LLC/filepress#<tag-or-sha>"
  }
}
```

Attach a custom domain in the Cloudflare dashboard. Keep `url` in config in sync
with that domain.

## Wrangler (CLI upload)

### Ship commands (site and repository root)

Every deployment-configured site needs `scripts.ship` in its own `package.json`:

```json
"ship": "pnpm build && wrangler pages deploy build --project-name <confirmed-project> --branch <production-branch>"
```

Install Wrangler locally with `pnpm add -D wrangler`; do not depend on a global CLI.
Confirm the authenticated account, existing Pages project and its production branch.
The public domain and folder name are not sufficient to identify that target.
Creating a missing Pages project and running a deployment are separate operations;
preparing scripts does not perform either one.

For a site inside an app repository, also add a root command:

```json
"ship": "pnpm --dir site run ship"
```

Use the actual path (`site` or `sites/<name>`). Preserve any existing app deployment
command; explicitly choose or compose the root target when there are multiple sites.
LocalHelm's repository Ship and site Ship rely on these respective scripts. Land
synchronizes FilePress and then uses the site's Ship; it does not invent a deployment
command, add a missing deployment CLI dependency, or provision a host.

The external scaffold can prepare both commands for a confirmed target:

```bash
pnpm create-site my-site --external ../my-app/site --url https://my.example \
  --pages-project my-pages-project --production-branch main \
  --root-package ../my-app/package.json
```

`--root-package` is optional for standalone sites. It requires an existing ancestor
package.json and refuses to overwrite a different Ship command. Both Pages options
are required together. Run `pnpm install` in the generated site to install its CLI.
Without a target, the scaffold marks deployment as unconfigured and omits Ship.

Verify the build locally before first deployment, and confirm that LocalHelm
discovers both the repository and site Ship actions. Treat a missing project,
authentication, or installation as pending setup, even when the scripts exist.

### Manual upload

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

## Security headers

`filepress build` writes `build/_headers` for Cloudflare Pages
(Netlify reads the same file). Defaults:

- HSTS (`max-age=31536000`) — no `includeSubDomains` or `preload`
- `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Detach Pages’ default `Access-Control-Allow-Origin: *`

Put your own `static/_headers` in the site to replace the default entirely.
Do not add `preload` unless you intend to submit the domain to the HSTS preload
list. Add `includeSubDomains` only after every subdomain is HTTPS.

## Agent checklist

When an agent deploys or wires CI for a FilePress site:

1. Confirm `filepress.config.ts` `url` matches the production origin.
2. Pin `getfilepress` (npm semver or git tag/SHA) — never `link:` in CI.
3. Set build → `pnpm install && pnpm build`, output → `build`, Node ≥ 20.
4. Prefer Cloudflare Pages when the user has no host preference.
5. After first deploy, verify `/`, `/rss.xml`, and `/sitemap.xml` return 200.
6. On Cloudflare Pages, `curl -sI` the origin and confirm HSTS / CSP are present
   and `access-control-allow-origin: *` is not.

## Related

- Packaging / local `link:` workflow: [`EXTERNAL_SITES.md`](EXTERNAL_SITES.md)
- Product walkthrough: [getfilepress.com/deploy](https://getfilepress.com/deploy)
- Theme / chrome classes (including `.nav-github`): [`THEME.md`](THEME.md)
