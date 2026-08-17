---
title: Why files
date: 2026-08-11
description: Edit Markdown in git, push, ship a static site. Durable publishing without a CMS.
tags: [workflow, getting-started]
---

Publishing software loves to become an operating system: dashboards, drafts that live only in a vendor’s database, WYSIWYG that fights your paste buffer. FilePress takes the opposite bet.

A post is a file. Frontmatter is YAML. The source of truth is the same git repo you already trust for code. That means:

- **Edit anywhere.** Laptop editor, GitHub web, mobile app — if it can change a text file, it can publish.
- **History is free.** Diffs, blame, branches, and pull requests work on essays the same way they work on TypeScript.
- **Hosting is boring.** `filepress build` emits a static folder. Put it on Cloudflare Pages, Netlify, or any object store with a CDN.

The engine still does the unglamorous work: slug derivation, draft/future-date rules, tag archives, RSS, sitemap, loud build errors when a title is missing. You keep the writing surface simple on purpose.

If that sounds like how you already want to work, start with [Getting started](/getting-started).
