---
title: First site in ten minutes
date: 2026-08-10
updated: 2026-08-28
description: Scaffold a content-only FilePress site, link the engine, and run the first build.
tags: [getting-started, workflow]
---

Node 20+, pnpm, and a clone of the FilePress engine (or a pin of `getfilepress`).

## Scaffold

```bash
cd filepress
pnpm install
pnpm create-site my-blog --external ../my-blog \
  --title "My Blog" \
  --url https://my.blog
```

That writes a sibling folder with `filepress.config.ts`, starter `posts/`, `pages/`, and:

```json
{
  "devDependencies": {
    "getfilepress": "link:../filepress"
  }
}
```

## Run it

```bash
cd ../my-blog
pnpm install
pnpm dev
```

Open the URL Vite prints. Stamp a post:

```bash
filepress new "Hello"
```

Or write `posts/YYYY-MM-DD-hello.md` by hand. Config and frontmatter: [Getting started](/docs/getting-started).

```bash
pnpm build    # → ./build/
```

For CI, swap `link:` for a pinned npm version — [Deploy](/deploy).
