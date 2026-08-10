---
title: "Frontmatter cheatsheet"
date: 2026-07-04
description: The fields a Downpress post understands, and what the build does with each one.
tags: [downpress, notes]
---

Every post is a Markdown file under `posts/` with a YAML block at the top.

```yaml
---
title: "My Post"
date: 2026-07-04
description: Short summary for listings and SEO.
tags: [notes]
author: Jane Roe
draft: false
updated: 2026-07-05
slug: my-post
---
```

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Build fails (naming the file) if missing. |
| `date` | yes | Strict `YYYY-MM-DD`. Future dates stay hidden until that day. |
| `slug` | no | Derived from the filename if omitted. |
| `description` / `excerpt` | no | Listings and meta tags. |
| `tags` | no | YAML list; lowercased and de-duplicated. |
| `author` | no | Per-post byline; omit on single-author sites. |
| `draft` | no | Hidden from production index, feeds, and sitemap. Listed under `pnpm dev`. Page still builds at its URL. |
| `updated` | no | Shown when different from `date`. |

**Images:** put files in `static/images/posts/<slug>/` and reference them as
`/images/posts/<slug>/photo.jpg`. An image alone on a line becomes a `<figure>`;
the title attribute is the caption.

This site (`sites/demo`) is the engine's own example content. Your publication
should be a separate folder or repo that depends on Downpress.
