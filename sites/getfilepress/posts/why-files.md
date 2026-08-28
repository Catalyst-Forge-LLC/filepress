---
title: Why files
date: 2026-08-11
updated: 2026-08-28
description: Edit Markdown in git, push, ship a static site. Durable publishing without a CMS.
tags: [workflow, getting-started]
---

A post is a file. Frontmatter is YAML. The source of truth is the same git repo used for code.

- **Edit anywhere.** Laptop editor, GitHub web, mobile app — if it can change a text file, it can publish.
- **History is free.** Diffs, blame, branches, and pull requests work on essays the same way they work on TypeScript.
- **Hosting is boring.** `filepress build` emits a static folder. Put it on Cloudflare Pages, Netlify, or any object store with a CDN.

FilePress still does the unglamorous work: slug derivation, draft and future-date rules, tag archives, RSS, sitemap, loud build errors when a title is missing. The writing surface stays a file on purpose.

Start with [Getting started](/getting-started).
