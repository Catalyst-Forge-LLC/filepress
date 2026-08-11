# FilePress — Project Context Prompt

_Paste into a new chat to resume. Single most important document for session continuity — update at the end of every session. Decisions live in `.forgekit/workflow_tracking.json`._

---

## HANDOFF (2026-08-11) — read this first

Workspace path may have reset chat history (Cursor often keys history to folder path). **Pick up here.**

### Naming (locked — don’t “fix” these)

| Layer | Name |
| --- | --- |
| **Local folder / GitHub repo** | **`filepress`** (`Z:\workspace\filepress`, `Catalyst-Forge-LLC/filepress`) |
| **Product / README display** | **FilePress** |
| **npm package** | **`getfilepress`** (bare `filepress` blocked — too similar to vitepress) |
| **Domain (planned, not live yet)** | getfilepress.com — **do not push as ready** |
| **CLI bins** | `filepress` and `getfilepress` (same script) |
| **Config file / helper** | `filepress.config.ts`, `defineFilepressConfig` |
| **Workspace packages** | `@filepress/core`, `@filepress/app`, `@filepress/import` |
| **Env / Genie paths** | `FILEPRESS_*`, `/__filepress/genie/*`, `.filepress-genie/` |
| **Former name** | Downpress (rebranded 2026-08-11) |

Site configs: `import { defineFilepressConfig } from 'getfilepress'`.  
Sibling deps: `"getfilepress": "link:../filepress"`. CI pin: `github:Catalyst-Forge-LLC/filepress#…`.

### Rename status (done)

| What | Status |
| --- | --- |
| Local folder | `Z:\workspace\filepress` |
| GitHub | `Catalyst-Forge-LLC/filepress` (was `downpress` → briefly `getfilepress` → `filepress`) |
| `origin` | `https://github.com/Catalyst-Forge-LLC/filepress.git` |
| `backup` mirror | `D:/git-mirrors/filepress.git` |

### Latest commits (main, synced with origin)

- `631c0c2` — npm name `getfilepress` + FilePress branding
- `b56121e` — Downpress → filepress rebrand, MIT LICENSE, latin-only fonts, hljs allowlist, drop sass, publish `files` includes import+Genie

### npm publish

- Registry stake: **`getfilepress@0.0.0`** (placeholder). Ready to publish **`0.1.0`** after repo is public.
- Publish shape fixed: root hoists real deps (no `workspace:*` on published manifest); CLI invokes vite/sirv/tsx directly; `prepack`/`postpack` stash nested `node_modules`; postinstall + CLI link `@filepress/*`; smoke via `pnpm pack:smoke`.
- Bare `filepress` is **not** available on npm.

### ForgeKit

- **Phase:** `4-feature-iteration` (in_progress)
- Do **not** advance phases without user OK
- Source of truth: `.forgekit/workflow_tracking.json` (backfilled 2026-08-11 from downpress+filepress chats + git: D14–D16, sessions through product site / deploy:www)

### What’s next (likely)

1. Make GitHub repo **public** → tag `v0.1.0` → `npm publish` (`pnpm pack:smoke` first)  
2. Genie **M2** (live inspire + Ollama brief + lede/tagline/logo) — M0+M1 done  
3. M3 Cloudflare Pages + getfilepress.com for `sites/getfilepress`  
4. Polish product-site copy / assets as needed

### Agent prefs (still true)

- pnpm, TypeScript ESM only  
- Commit after substantive work; **no** Co-Authored-By / tool trailers unless asked  
- **Never push unless asked**  
- Lessons gate (`getAntiPatterns` + `searchLessons`) before large multi-file work  

---

## What this is

**FilePress** is a file-based Markdown blog engine. Posts are plain `.md` + YAML frontmatter in git — **no admin UI, no database, no server at runtime**. SvelteKit `adapter-static` produces a fully prerendered site.

**pnpm workspace** = installable npm package **`getfilepress`**:

- `@filepress/core` — content pipeline, components, Essay theme  
- `@filepress/app` — sole SvelteKit app (routes + Genie in **dev only**)  
- `@filepress/import` — crawl/scaffold CLI; Genie reuses theme/stock helpers  
- `sites/demo` — engine fixture (drafts / scheduled / cheatsheet)  
- `sites/getfilepress` — product site (getfilepress.com); real pubs otherwise sibling repos

Docs: `docs/EXTERNAL_SITES.md`, `docs/THEME.md`, `docs/GENIE_MODE_SPEC.md`, `docs/SITE_IMPORT_SPEC.md`.

**Hero flow:** edit `posts/*.md` → push → CI builds/deploys → live.

## Tech stack

- SvelteKit 2 / Svelte 5 (runes) / Vite 8 / `adapter-static`
- TypeScript strict, ESM, **pnpm**
- Content: gray-matter + unified/remark/rehype (GFM, raw HTML, slug, autolink, **highlight.js language allowlist**, rehype-figure)
- Fonts: latin/latin-ext only via `packages/core/src/lib/styles/fonts.css` (not full fontsource index)
- Theme: Essay CSS in core; per-site `theme.css` only (no sass / theme.scss)
- Tests: Vitest on core + import + app genie store
- Deploy target: Cloudflare Pages per site (M3 not wired yet)
- **Comments:** permanent non-goal

## Project structure

```
filepress/                         # repo + folder name
  package.json                     # name: getfilepress; bins: filepress, getfilepress
  scripts/filepress.mjs            # CLI → FILEPRESS_SITE_ROOT → @filepress/app
  scripts/create-site.mjs
  packages/core|app|import/
  sites/demo/                      # engine fixture
  sites/getfilepress/              # product site (homePage + Writing)
  LICENSE                          # MIT
```

Genie (dev): `packages/app/vite-plugin-genie.ts` (`apply: 'serve'`), `src/lib/genie/*`. Not in production/preview builds.

## Data model (post frontmatter)

Required: `title`, `date` (`YYYY-MM-DD`). Optional: `slug`, `description`/`excerpt`, `tags`, `author`, `draft`, `updated`.  
Site identity: `filepress.config.ts` + `defineFilepressConfig` (`title` + `url` required).  
Also: `tagline`, `lede`, `logo`, `ogImage`, `topics`, `newsletter`, `homePage`, `nav`, …

## Key decisions (abbrev.)

D1 gray-matter+remark · D2 adapter-static · D3/D4 core/site + pinned deps · D5 CF Pages + custom domain · D6 top-level `posts/` · D7 drafts unlisted but built · D8 future dates hidden · D9 Essay + Zen Garden overrides · D10 scaffold script · **D13 Genie Mode** (Ollama + Finetuna hint) · no comments ever.

## Critical patterns

- Fail loud, name the file (`ContentError`)
- `entries()` for dynamic routes; drafts included so preview URLs work
- UTC-only date compare/format
- Client barrel `@filepress/core` vs server `@filepress/core/server`
- Core has no `$env`/`$lib`/`$app` — sites inject paths/config
- Genie/import Node code must stay out of client/production bundles

## Current feature state

### Done

- Full content engine + routes + RSS/sitemap/robots + Essay theme + D12 feature batch  
- Option C+D packaging (one app, content-only sites, CLI, external scaffold)  
- Site import CLI (`filepress import`) + inspire/theme/stock/Openverse  
- Genie Mode **M0+M1** (health, versions, steers, stock, upload, activate)  
- Public-prep: MIT, latin fonts, hljs allowlist, publish `files` includes import  
- Rebrand to FilePress / `getfilepress`

### Not done / next

- Genie **M2** (live inspire, Ollama refine, config patches for lede/tagline/logo)  
- Push/tag for `github:Catalyst-Forge-LLC/filepress#…` installs when asked  
- M3 Cloudflare Pages + getfilepress.com (`sites/getfilepress` content ready)  
- M5 polish (404, reading-time, search, …)

## Recent session notes (2026-08-11)

- Zip/symlink lesson: Windows zip follows `link:` into the engine `node_modules` — exclude `node_modules` when sharing sites  
- Bloat review: architecture is fine; fonts were the main deploy win; Genie kept for local dev  
- npm: use **`getfilepress`**, not unscoped `filepress`  
- Rename complete: folder + GitHub `filepress`; remotes + backup mirror updated; sibling sites rewired to `getfilepress` / `filepress.config.ts`  
- Product site scaffolded at `sites/getfilepress` (`homePage: 'home'`, docs pages, Writing posts, `pnpm dev:www` / `build:www`)  


## Verify commands

```bash
pnpm install
pnpm test
pnpm build          # demo → sites/demo/build/
pnpm check
pnpm filepress dev --site demo   # Genie FAB in corner
```
