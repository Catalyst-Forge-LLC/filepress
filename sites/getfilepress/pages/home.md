---
title: FilePress
description: File-based Markdown blogs. No admin UI. No database. Just git.
order: 0
---

**FilePress** turns a folder of Markdown posts into a fast, prerendered site. You write in plain files with YAML frontmatter, commit them to git, and build with the `filepress` CLI. There is no admin UI, no database, and no server at runtime.

## How it works

1. Keep posts in `posts/*.md` and evergreen pages in `pages/*.md`.
2. Declare site identity in `filepress.config.ts`.
3. Run `filepress build` — SvelteKit `adapter-static` writes a deployable `build/` folder.

Edit on a laptop, on GitHub’s web UI, or from your phone. Push when you’re ready. The next build is the site.

## Start here

- **[Getting started](/getting-started)** — install `getfilepress`, scaffold a site, configure nav/footer (including GitHub icon).
- **[Deploy](/deploy)** — Cloudflare Pages happy path; static `build/` anywhere else.
- **[Import](/import)** — crawl an existing public site into a FilePress content tree.
- **[Writing](/writing)** — essays and walkthroughs from the FilePress team.
- **npm:** [`getfilepress`](https://www.npmjs.com/package/getfilepress) · **GitHub:** [Catalyst-Forge-LLC/filepress](https://github.com/Catalyst-Forge-LLC/filepress)

## What you get

A reverse-chronological index (or a custom home page like this one), per-tag archives, RSS, sitemap, robots.txt, and a quiet Essay theme you can override with a site-root `theme.css`. Optional **Genie Mode** helps you tune look and feel in local `filepress dev` — it never ships in production builds.
