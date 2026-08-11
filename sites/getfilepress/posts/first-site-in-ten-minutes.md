---
title: First site in ten minutes
date: 2026-08-10
description: Scaffold a content-only FilePress site, link the engine, and run your first build.
tags: [getting-started, workflow]
---

You need Node 20+, pnpm, and a clone of the FilePress engine (or a later git pin of `getfilepress`).

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

Open the URL Vite prints. Add a post under `posts/`:

```markdown
---
title: "Hello"
date: 2026-08-10
description: First note.
tags: [notes]
---

Ship the file. That’s the product.
```

```bash
pnpm build    # → ./build/
```

For Cloudflare later, swap the `link:` dependency for a pinned git URL — see [Deploy notes](/posts/deploy-notes). Config details live on [Getting started](/getting-started).
