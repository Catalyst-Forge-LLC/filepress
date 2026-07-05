---
title: "Hello, world"
date: 2026-06-20
description: The first post on a git-native Markdown blog — what Downpress is and why it exists.
tags: [notes, downpress]
---

Welcome to **Downpress**. Every post here is a plain Markdown file with a little
YAML frontmatter at the top, committed straight to a Git repository. There's no
database, no admin login, and no CMS — just files.

## Why files?

Because files are durable, portable, and editable from anywhere:

- Edit on a laptop in your favourite editor.
- Edit on your phone with the GitHub mobile app.
- Push, and a static build deploys the whole site.

## What you get

A fast, prerendered site with:

1. A reverse-chronological index.
2. Per-tag archive pages.
3. An RSS feed and a sitemap.

> The whole point is that writing should feel like writing a text file, not
> operating software.

Here's a tiny code sample, syntax-highlighted at build time:

```ts
export function greet(name: string): string {
	return `Hello, ${name}`;
}
```

That's it. Add a file, push, done.
