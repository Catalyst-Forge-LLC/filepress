# example-site.example

Content-only Downpress site. Identity: [`downpress.config.ts`](downpress.config.ts).
Posts: [`posts/`](posts/). Shared routes/engine: [`packages/app`](../../packages/app)
+ [`packages/core`](../../packages/core).

```bash
pnpm downpress dev --site example-site
pnpm downpress build --site example-site   # → build/
```

## Deploy (Cloudflare Pages)

- Build command: `pnpm install && pnpm downpress build --site example-site`
- Output directory: `sites/example-site/build`
- Root directory: repo root (monorepo)
