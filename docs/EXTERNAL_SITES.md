# External (sibling) Downpress sites

Option D: a site is a separate folder/repo that **links** the engine and only
keeps config + content. Deploy still serves the static `build/` folder.

**Engine** lives under [Catalyst-Forge-LLC](https://github.com/Catalyst-Forge-LLC)
(`Catalyst-Forge-LLC/downpress`). **Sites** can live on a personal GitHub account
(or any other org) — they only need a dependency pin on the engine.

## Local development (`link:`)

Sibling layout:

```
workspace/
  downpress/              ← engine (this repo)
  example-site/      ← content-only site
```

Site `package.json`:

```json
{
  "scripts": {
    "dev": "downpress dev",
    "build": "downpress build",
    "preview": "downpress preview",
    "check": "downpress check"
  },
  "devDependencies": {
    "downpress": "link:../downpress"
  }
}
```

```bash
# once
cd downpress && pnpm install

cd ../example-site
pnpm install
pnpm dev
pnpm build          # → ./build/
```

Site config:

```ts
import { defineDownpressConfig } from 'downpress';

export default defineDownpressConfig({
  title: 'My Site',
  url: 'https://my.site'
  // …
});
```

### Scaffold

From the engine repo:

```bash
pnpm create-site my-site --external ../my-site --title "My Site" --url https://my.site
```

## Cloudflare Pages / CI (git pin)

`link:` only works on your machine. Once this engine is pushed to GitHub:

```json
"downpress": "github:Catalyst-Forge-LLC/downpress#v0.1.0"
```

Pin a **tag or commit SHA** (not floating `main`) so engine upgrades are deliberate (D4).

| CF Pages setting | Value |
| --- | --- |
| Root directory | `/` (site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

No Downpress env vars required if `downpress.config.ts` + `posts/` are in the site repo. Canonical `url` in config must match the custom domain.

### First-time GitHub checklist

1. Push this engine to `Catalyst-Forge-LLC/downpress` (repo already created).
2. Tag a release when the CLI is stable (`v0.1.0`).
3. Create each site repo on **personal GitHub** (or elsewhere) from the content-only tree — e.g. `you/example-site`.
4. Switch the site’s dependency from `link:../downpress` to the git pin on the engine.
5. Wire CF Pages to the **site** repo with the table above.

If the engine repo is **private**, the site’s CF/GitHub Actions install needs permission
to read `Catalyst-Forge-LLC/downpress` (deploy key, machine user, or make the engine public).

## Monorepo sites (still supported)

Inside this repo, content sites under `sites/*` run with:

```bash
pnpm downpress build --site example-site
```

Use the monorepo for engine work + the demo site; use sibling repos for real properties you want to deploy independently.
