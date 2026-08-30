# FilePress — Project Context Prompt

_Paste into a new chat to resume. Single most important document for session continuity — update at the end of every session. Decisions live in `.forgetrail/workflow_tracking.json`._

---

## HANDOFF (2026-08-29) — Genie must not ship in production

TemperPass (`temperpass.dev`) shipped the Genie FAB because the static build hydrated (`csr: true`) and prerendered `GeniePanel`. The JSON error was `/__filepress/genie` returning HTML. Gate is now Vite `DEV` + `browser` (no `FILEPRESS_GENIE` force-on). `filepress build` fails if Genie leaks into `build/`. Sites on an older pin need a getfilepress bump + rebuild. Do **not** publish unless asked.

---

## HANDOFF (2026-08-28) — /writing listing + /docs mount

`/writing` is the posts listing (the “Moved to /posts” stub is gone). Exact `/writing` → `/posts` redirect dropped so the nav URL stays. `/writing/<slug>` still remaps. Product docs are `sites/getfilepress/docs` → `/docs` (`pnpm docs:www` before `dev:www` / `build:www`). Repo-root `docs/` stays operator specs. Do **not** publish unless asked.

---

## HANDOFF (2026-08-28) — sibling scan + in-repo sites

Sibling dashboard / LocalHelm FilePress plugin now list **in-repo** `sites/*` (getfilepress, demo) plus optional **Scan folder → Add**. Extras live in `.filepress-siblings/extras.json`. In-repo pin is `engine` — Sync must not rewrite the engine `package.json`. Do **not** publish unless asked.

---

## HANDOFF (2026-08-28) — README slim + site accuracy / aiBreze spray

Root `README.md` is short (start, import, docs table, not-a-CMS, nutrition). Config / frontmatter / theme / deploy live on getfilepress.com + `docs/*`. Public pins are npm `^0.1.19`. Do **not** invent `v0.1.19` git tags (only `v0.1.0` / `v0.1.1` exist). Git-connected Pages is Cloudflare settings, not a FilePress feature. Product pages speak as FilePress / it. Do **not** publish unless asked.

---

## HANDOFF (2026-08-28) — missing favicon.png must not fail prerender

Layout always links `/favicon.png` then `/favicon.svg`. adapter-static prerender 404s a missing PNG (`404 /favicon.png (linked from /)`). `handleHttpError` now ignores those two paths. Sites can still drop a PNG. Do **not** publish unless asked.

---

## HANDOFF (2026-08-28) — Vite allowedHosts for Tailscale names

`packages/app/vite.config.ts` sets `server`/`preview` `allowedHosts: true` so a phone on `*.ts.net` is not Vite-403’d. IPs were already allowed. Sites pick this up after they use this engine and restart `filepress dev`. Do **not** publish unless asked.

---

## HANDOFF (2026-08-27) — favicon.png then favicon.svg

`+layout.svelte` links `/favicon.png` first, `/favicon.svg` as fallback. Sites can drop a small PNG next to the SVG. Bump is **0.1.16**. User publishes.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-27) — Genie History: no Activate on the active row

The active version already has an Active badge. Hide Activate there. Delete still uses `confirm()` and stays disabled on the active / baseline rows. Bump is **0.1.15**. User publishes.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-27) — default masthead logo

Omitted `logo` now defaults to `/logo.png` (`static/logo.png`). Blank or `null` is a text-only masthead. A missing file is hidden, not a broken image. Bump is **0.1.14**. User publishes.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-27) — Genie versions show what they did

History rows were label + timestamp only. Health now sends `did` (from `design-brief.json`) and the original `prompt`. Click the prompt to copy. Bump is **0.1.13**; sites stay on npm (do not link). User publishes.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-27) — first paint is the site theme

Essay CSS was flashing before `theme.css`: Vite injects core `:root` after the inlined critical tokens (same specificity). Critical now inlines the whole site sheet (minus `@import`) in `@layer site`, and both sheets are layered (`filepress`, then `site`). Authors still write `:root`.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-26) — Genie refine visibility

Refine was aborting at 180s (`AbortSignal.timeout`) while `gemma4:12b` still loaded. Chat now streams, default wait is 10 minutes (`FILEPRESS_OLLAMA_TIMEOUT_MS`), terminal logs `still generating…` every 15s, panel shows elapsed time, timeout errors tell you to retry warm.

**Palette:** import prompt still says “keep dark inspiration.” Genie Refine uses a separate **steer** prompt. Icy/Antarctica/bright → light page; code floors a black `bg` if the model ignores that. Raw JSON is printed in the terminal and written to `.filepress-genie/last-ollama.json`.

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-25) — engine polish (visitor / authoring / chrome)

Solidify what already ships. **Deferred** (new product surfaces): client search, satori OG images, full-content RSS, git-connected Pages, core-repo split, Genie split-pane/vision/theme packs, Playwright vision import.

Shipped in this pass:

- Styled 404 (`packages/app/src/routes/+error.svelte`); demo image-convention post + SVG; mobile type/nav/logo tighten
- `_redirects` module + build merge; import writes `static/_redirects` + long-bio `pages/home.md` / `homePage`
- `filepress new "Title"` (`scripts/new-post.ts`)
- Named presets `theme: 'essay' | 'ink' | 'folio'`; `PostMeta.readingMinutes` (~228 wpm)
- getfilepress `static/_redirects` for `/writing` → `/posts`

Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-25) — sibling M2 + Genie M3

- Sibling dashboard M2: each row shows git **ahead/behind vs origin** from the same `git status --porcelain -b` used for dirty. No extra spawn. Live `HEAD` header probe after ship is still later.
- Genie M3: History rail can **star / rename / duplicate / delete** (baseline + active stay locked). Store + plugin routes: `POST /star`, `/label`, `/duplicate`. Tests cover those plus baseline rollback. Plugin stays `apply: 'serve'`.
- Dashboard: `pnpm siblings` → http://127.0.0.1:5198
- Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

---

## HANDOFF (2026-08-12) — ollanet + Genie host picker

- **ollanet** (`^0.4.0`) is a FilePress dependency. Genie **Scan network** and `filepress import --scan` / `--lan` discover other Ollama servers (localhost, `~/.ollanet/config.json`, `OLLANET_HOSTS`, Tailscale). **LAN TCP scan is opt-in** — never on `/health`.
- Import `scanNetwork` from `ollanet` (library entry since 0.4.0). Wrapper: `packages/import/src/ollanet-scan.ts`. Vite: `ssr.external` + `optimizeDeps.exclude` for `ollanet`.
- Genie refine/inspire accept `host` + `model`. Default remains `OLLAMA_HOST` / `FILEPRESS_OLLAMA_MODEL`.
- Do **not** advance ForgeTrail phases without user OK. **Never push / npm-publish unless asked.**

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

- npm latest: **`getfilepress@0.1.1`** (also `0.1.0` + stake `0.0.0`). Git tag **`v0.1.1`** → `fecbd27`.
- Publish shape: root hoists real deps (no `workspace:*`); CLI invokes vite/sirv/tsx; `prepack`/`postpack`; postinstall + CLI link `@filepress/*`; `pnpm pack:smoke`.
- Bare `filepress` is **not** available on npm.

### ForgeTrail

- **Phase:** `4-feature-iteration` (in_progress)
- Do **not** advance phases without user OK
- Source of truth: `.forgetrail/workflow_tracking.json` (backfilled 2026-08-11 from downpress+filepress chats + git: D14–D16, sessions through product site / deploy:www)

### What’s next (likely)

1. Sibling live `HEAD` check after ship (HSTS/CSP) — M2 leftover  
2. Genie smoke in `filepress dev` (History rail)  
3. Import leftovers / product-site git-connected Pages / Lighthouse

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
- Genie Mode **M0–M2** (health, versions, steers, stock, upload, activate, inspire, Ollama refine, config patches, optional ollanet host scan)  
- Public-prep: MIT, latin fonts, hljs allowlist, publish `files` includes import  
- Rebrand to FilePress / `getfilepress`

### Not done / next

- Push/tag for `github:Catalyst-Forge-LLC/filepress#…` installs when asked  
- Live `HEAD` security-header probe after sibling dashboard ship  
- Lighthouse 95+ confirmation on a warm post page (don’t guess a score)  
- Deferred surfaces: search, OG image gen, full-content RSS, Playwright vision import

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
