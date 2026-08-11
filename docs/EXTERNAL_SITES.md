# Running a site against this engine

A site is a separate folder (or repo) that depends on filepress and only keeps
config + content (+ optional `theme.css`). The build output is a static `build/`
directory.

The engine can live in one GitHub org/account and each site in another — the
site only needs a dependency pin on this package.

## Local development

Sibling folders:

```
workspace/
  filepress/     ← this repo
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
    "filepress": "link:../filepress"
  }
}
```

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
import { defineFilepressConfig } from 'filepress';

export default defineFilepressConfig({
  title: 'My Site',
  url: 'https://my.site'
});
```

Optional: `theme.css` at the site root overrides the default
Essay theme. See [`THEME.md`](THEME.md).

### Scaffold

From this repo:

```bash
pnpm create-site my-blog --external ../my-blog --title "My Blog" --url https://my.blog
```

## CI / Cloudflare Pages

`link:` only works on your machine. For builds in the cloud, pin a tag or commit:

```json
"filepress": "github:Catalyst-Forge-LLC/filepress#v0.1.0"
```

| Setting | Value |
| --- | --- |
| Root directory | `/` (the site repo) |
| Build command | `pnpm install && pnpm build` |
| Output directory | `build` |

If this engine repo is private, the site’s CI needs permission to clone it.
Set `url` in `filepress.config.ts` to the live custom domain (feeds and sitemap use it).

## Sites inside this repo

Optional content under `sites/*`:

```bash
pnpm filepress build --site demo
```
