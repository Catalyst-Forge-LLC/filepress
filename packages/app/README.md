# @filepress/app

The only SvelteKit application in the filepress monorepo. All routes, layouts, and
Kit wiring live here. Content sites under [`../../sites`](../../sites) provide:

- `filepress.config.ts` — identity
- `posts/` — Markdown
- `static/` — favicon, images (optional)

## Run against a site

From the repo root (do not run vite directly without `FILEPRESS_SITE_ROOT`):

```bash
pnpm filepress dev --site demo
pnpm filepress build --site demo
```

Build output is written to `sites/<name>/build/`.
