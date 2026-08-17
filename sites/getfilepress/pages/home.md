---
title: FilePress
description: Start with files, or bring the site you already have. Design locally. Ship static. Keep everything.
order: 0
---

You write Markdown in git, or [import](/import) a public site you already have. Optional [Genie](/genie) helps you design in `filepress dev`. `filepress build` writes static HTML. Genie never ships in production.

## From folder to static site

1. Start from a blank folder, or `filepress import --source …` (up to three `--inspire` URLs; `--no-llm` stays deterministic).
2. Keep `posts/*.md`, `pages/*.md`, and `filepress.config.ts`. Optional `paths` mounts attach a docs app or other static tree at a URL prefix, without Essay chrome.
3. In `filepress dev`, [Genie](/genie) can steer look and feel. Activate writes `theme.css`, `static/`, and config.
4. `filepress build` writes `build/`. Host it on Cloudflare Pages or any static host.

Edit on a laptop, on GitHub’s web UI, or from your phone. Push when you’re ready. The next build is the site.

## Start here

- **[Getting started](/getting-started)** — install `getfilepress`, scaffold a site, configure nav, footer, and path mounts.
- **[Import](/import)** — crawl an existing public site into a FilePress content tree.
- **[Genie](/genie)** — local design cockpit; bake to commit; absent from production.
- **[Deploy](/deploy)** — Cloudflare Pages happy path; static `build/` anywhere else.
- **[Writing](/writing)** — essays and walkthroughs from the FilePress team.
- **npm:** [`getfilepress`](https://www.npmjs.com/package/getfilepress) · **GitHub:** [Catalyst-Forge-LLC/filepress](https://github.com/Catalyst-Forge-LLC/filepress)

## What you get

A reverse-chronological index (or a custom home page like this one), per-tag archives, RSS, sitemap, robots.txt, and a quiet Essay theme you override with a site-root `theme.css`. Optional `paths` mounts attach a site-owned HTML tree at a URL prefix. Optional Genie Mode is a local design environment. Experiments live under `.filepress-genie/`. What you keep is ordinary CSS, files, and config.
