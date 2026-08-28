# Running a site against this engine

A site is a separate folder (or repo) that depends on **getfilepress** (the FilePress
engine) and only keeps config + content (+ optional `theme.css`). The build output
is a static `build/` directory.

The engine can live in one GitHub org/account and each site in another — the
site only needs a dependency pin on this package.

## Local development

Sibling folders:

```
workspace/
  filepress/     ← this repo (folder/repo name)
  my-blog/       ← content-only site
```

Site `package.json`:

```json
{
  "scripts": {
    "dev": "filepress dev",
    "build": "filepress build",
    "preview": "filepress preview",
    "check": "filepress check"
  },
  "devDependencies": {
    "getfilepress": "link:../filepress"
  }
}
```

Local `filepress dev` follows `FILEPRESS_PORT`, then a LocalBerth lease, then Vite 5173. Details: [LOCALBERTH.md](./LOCALBERTH.md).

```bash
# once, in the engine
cd filepress && pnpm install

cd ../my-blog
pnpm install
pnpm dev
pnpm build    # → ./build/
```

```ts
// filepress.config.ts
import { defineFilepressConfig } from 'getfilepress';

export default defineFilepressConfig({
  title: 'My Site',
  url: 'https://my.site',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'GitHub', href: 'https://github.com/acme/my-site', icon: 'github' }
  ],
  footerLinks: [
    { label: 'RSS', href: '/rss.xml' },
    { label: 'Topics', href: '/topics' },
    { label: 'GitHub', href: 'https://github.com/acme/my-site', icon: 'github' }
  ]
});
```

Optional: `theme.css` at the site root overrides the default
Essay theme. See [`THEME.md`](THEME.md). Chrome classes for the GitHub control:
`.nav-github`, `.nav-icon`, `.has-icon`.

### Scaffold

From this repo:

```bash
pnpm create-site my-blog --external ../my-blog --title "My Blog" --url https://my.blog
```

## CI / deploy

`link:` only works on your machine. See **[`DEPLOY.md`](DEPLOY.md)** for the full
contract (Cloudflare Pages, Wrangler, any static host, agent checklist).

Short form — pin npm or a git tag:

```json
"getfilepress": "^0.1.19"
```

```json
"getfilepress": "github:Catalyst-Forge-LLC/filepress#<tag-or-sha>"
```

| Setting | Value |
| --- | --- |
| Root directory | `/` (the site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

Set `url` in `filepress.config.ts` to the live custom domain (feeds and sitemap use it).

## Sites inside this repo

Optional content under `sites/*`:

```bash
pnpm filepress build --site demo
pnpm build:www          # product site → sites/getfilepress/build/
pnpm ship               # Wrangler Pages project `getfilepress`
```
