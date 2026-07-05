# example-site.example

A Downpress site. Content is the Markdown in [`posts/`](posts/); identity lives
in [`src/lib/downpress.config.ts`](src/lib/downpress.config.ts). All the engine
logic comes from [`@downpress/core`](../../packages/core).

## Develop

```bash
pnpm --filter example-site dev
pnpm --filter example-site build     # -> build/ (static, adapter-static)
pnpm --filter example-site check
```

## Writing

Add a Markdown file with frontmatter to `posts/`. See the root
[README](../../README.md) for the frontmatter fields and conventions.

## Deploy

Cloudflare Pages, custom domain at root. Build command `pnpm --filter
example-site build`, output directory `sites/example-site/build`.
