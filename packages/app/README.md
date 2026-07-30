# @downpress/app

The only SvelteKit application in the Downpress monorepo. All routes, layouts, and
Kit wiring live here. Content sites under [`../../sites`](../../sites) provide:

- `downpress.config.ts` — identity
- `posts/` — Markdown
- `static/` — favicon, images (optional)

## Run against a site

From the repo root (do not run vite directly without `DOWNPRESS_SITE_ROOT`):

```bash
pnpm downpress dev --site demo
pnpm downpress build --site demo
```

Build output is written to `sites/<name>/build/`.
