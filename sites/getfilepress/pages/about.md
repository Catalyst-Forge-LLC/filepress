---
title: About
description: What FilePress is, and what it is not.
order: 4
---

**FilePress** is a file-based Markdown blog engine. Posts are `.md` files with YAML frontmatter in git. A SvelteKit static build produces HTML any static host can serve.

## What it is

- A reusable engine (`getfilepress` on npm) plus content-only sites
- Essay theme by default; named presets `essay` | `ink` | `folio`; per-site `theme.css` last
- Static pages, tags, RSS, sitemap, robots.txt, styled 404
- Optional `paths` mounts (site-owned HTML at a URL prefix such as `/docs`)
- Optional import CLI and Genie for local authoring

## What it is not

- Not a hosted CMS
- Not a database app
- Not a runtime server
- **Not a comments platform.** Visitor comments are a permanent non-goal.

## Names

| Layer | Name |
| --- | --- |
| Product | FilePress |
| npm package | `getfilepress` |
| GitHub / folder | `filepress` |
| CLI | `filepress` / `getfilepress` |
| Domain | getfilepress.com |

This site is FilePress (`sites/getfilepress` in the engine monorepo). `sites/demo` is the engine fixture for drafts, scheduled posts, and frontmatter edge cases.

Maintained by [Catalyst Forge](https://github.com/Catalyst-Forge-LLC). MIT licensed.
