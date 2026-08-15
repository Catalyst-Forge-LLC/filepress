---
title: About
description: What FilePress is — and what it deliberately is not.
order: 4
---

**FilePress** is a file-based Markdown blog engine. Posts are plain `.md` files with YAML frontmatter in git. A SvelteKit static build produces HTML you can host anywhere.

## What it is

- A reusable engine (`getfilepress` on npm) plus content-only sites
- Essay theme by default; per-site `theme.css` overrides (CSS Zen Garden style)
- Static pages, tags, RSS, sitemap, robots.txt
- Optional `paths` mounts (site-owned HTML at a URL prefix such as `/docs`)
- Optional import CLI and Genie Mode for local authoring

## What it is not

- Not a hosted CMS
- Not a database app
- Not a runtime server
- **Not a comments platform** — visitor comments are a permanent non-goal

## Names

| Layer | Name |
| --- | --- |
| Product | FilePress |
| npm package | `getfilepress` |
| GitHub / folder | `filepress` |
| CLI | `filepress` / `getfilepress` |
| Domain | getfilepress.com |

This site is built with FilePress itself (`sites/getfilepress` in the engine monorepo). The in-repo `sites/demo` site remains the engine’s fixture for drafts, scheduled posts, and frontmatter edge cases.

Maintained by [Catalyst Forge](https://github.com/Catalyst-Forge-LLC). MIT licensed.
