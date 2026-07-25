# Downpress — Project Context Prompt

_Paste into a new chat to resume. Single most important document for session continuity — update at the end of every session. Merged from `docs/PHASE_1_BRIEF.md` (locked 2026-07-04); decisions preserved in `.forgekit/workflow_tracking.json → decisions[]`._

---

## What this is

Downpress is a git-native Markdown blog engine. Every post is a plain `.md` file with YAML frontmatter, committed to a GitHub repo and edited from anywhere (GitHub mobile app, web editor, any text editor) — **no admin UI, no database, no server runtime**. A SvelteKit `adapter-static` build compiles the Markdown into a fast, fully prerendered site that auto-deploys on push.

Structurally it is a **pnpm workspace monorepo**: `@downpress/core` (engine library), `@downpress/app` (the only SvelteKit app — all routes), and **content-only sites** under `sites/*` (`downpress.config.ts` + `posts/` + `static/`). Run via `pnpm downpress <dev|build> --site <name>` (Option C in `docs/SITE_PACKAGING_OPTIONS.md`). Option D (external CLI package) is next.

**Hero flow:** author/edit a `.md` file under a site's `posts/` → push to `main` → CI builds and deploys → live site reflects the change with no manual step.

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5, runes mode) with `@sveltejs/adapter-static` — fully prerendered, no runtime server.
- **Language:** TypeScript (strict), ES modules only.
- **Package manager:** pnpm.
- **Content pipeline:** `gray-matter` (frontmatter) + `unified`/`remark`/`rehype` (Markdown → HTML). Plugins: `remark-gfm`, `remark-rehype` (+`rehype-raw` for raw-HTML passthrough), `rehype-slug`, `rehype-autolink-headings`, `rehype-highlight`, `rehype-stringify`.
- **Content source:** core reads a site's `posts/` from disk with Node `fs` at build time (server-only). A site wires it with `createContent({ contentDir })` in a `*.server.ts` module; `DOWNPRESS_CONTENT_DIR` can override the folder for local experiments.
- **Tests:** Vitest (`pnpm test` → `@downpress/core`) over the pure logic: `parse.ts`, `rehype-figure.ts`, and `config.ts` (`defineDownpressConfig` validation). 31 tests.
- **Styling:** Hand-written CSS in `packages/core/src/lib/styles/theme.css` (no Tailwind), imported via `@downpress/core/theme` (which also loads the fonts). "Essay" theme (D11): quiet, text-first, editorial — self-hosted Newsreader + Inter via `@fontsource-variable`, one accent at three intensities, warm neutrals, light/dark. Tokens are CSS custom properties so per-site themes (D9) stay cheap.
- **Deploy:** Cloudflare Pages, per site, always on a custom domain (served at root, no base path). CI wiring is Roadmap M3 (not built yet).
- **No** database, auth, LLM, analytics, or third-party client scripts.

## Project Structure (pnpm workspace)

```
downpress/
  pnpm-workspace.yaml            # packages/* only (sites are not packages)
  package.json                   # downpress / test / build / create-site scripts
  scripts/downpress.mjs          # CLI: sets DOWNPRESS_SITE_ROOT, runs @downpress/app
  scripts/create-site.mjs        # scaffold content-only site (refuses non-empty dir)
  packages/core/                 # @downpress/core — engine library (unchanged role)
  packages/app/                  # @downpress/app — THE SvelteKit project (all routes)
    vite.config.ts               # $site-config alias, assets + adapter outDir from site root
    src/lib/site.server.ts       # getSiteRoot / getContentDir helpers
    src/lib/content.server.ts    # createContent({ contentDir: getContentDir() })
    src/routes/…                 # index, posts, tags, topics, feeds, pagination
  sites/<name>/                  # CONTENT ONLY (example-site, demo, …)
    downpress.config.ts          # identity (imports defineDownpressConfig from packages/core)
    posts/                       # Markdown
    static/                      # favicon, images
    build/                       # gitignored output of `pnpm downpress build --site <name>`
```

## Data Model

A **Post** is one `.md` file. Validated frontmatter (`PostMeta` in `packages/core/src/lib/content/types.ts`):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | Build fails (naming file) if missing. |
| `date` | `YYYY-MM-DD` | yes | Strict format; real-calendar-date checked; future dates hidden until they arrive. |
| `slug` | string | no | Derived from filename if absent; slugified (unicode letters/numbers, `-`). |
| `description` / `excerpt` | string | no | `description` wins; used for listings + SEO. |
| `tags` | string[] | no | Normalized: trimmed, lowercased, de-duplicated. |
| `draft` | boolean | no (default false) | Excluded from listings/feed/sitemap; page still built for preview (D7). |
| `updated` | `YYYY-MM-DD` | no | Shown if present and different from `date`. |

Plus `author` (optional byline; falls back to site author in views). **Tags** are derived (unique normalized tags across published posts). **Site config** is one object per site in `sites/<name>/downpress.config.ts` via `defineDownpressConfig` (title, url, author, tagline, postsPerPage, topics, newsletter).

## Key Architectural Decisions

_(WHY preserved; full rationale + alternatives in `.forgekit/workflow_tracking.json → decisions[]`.)_

- **D1 — gray-matter + remark/rehype (data-driven), not mdsvex-as-routes.** DECIDED Phase 1. Posts are pure content; avoids mdsvex's layout/frontmatter-context limitation; uniform frontmatter access everywhere.
- **D2 — `adapter-static`, fully prerendered, not SSR.** DECIDED Phase 1. No runtime backend. Tag/post routes use `entries()` generators; feeds/sitemap covered by `prerender.entries: ['*']`.
- **D3 — Core/site split is a first-class goal (M4), not a later bolt-on.** SvelteKit is per-project; core will centralize loader, pipeline, feeds, layout/themes, scaffolding.
- **D4 — Sites depend on core via a pinned dependency**, not `main`-floating. _M4 impl: `workspace:*` inside this pnpm monorepo (source-linked, no build step). Splitting core into its own repo + git-URL+SHA pins is deferred until a second repo is actually needed._
- **D5 — Cloudflare Pages + always a custom domain** → static output at root, no base path.
- **D6 — Content in each site's top-level `posts/`** (outside `src/`) for easy GitHub-mobile browsing. Read from disk via Node `fs` through `createContent({ contentDir })`; `DOWNPRESS_CONTENT_DIR` overrides for local experiments. Site identity is `downpress.config.ts` at the site root (not env).
- **D7 — Drafts:** excluded from index/tags/RSS/sitemap, but built at their URL (unlinked, `noindex`) for phone preview.
- **D8 — Strict `YYYY-MM-DD`; future-dated posts hidden** until their date (build-time `date <= today` in UTC).
- **D9 — Styling is sparse/classic/high-end; per-site themes are variations on the shared core aesthetic.**
- **D10 — Informal core versioning (commit pins); scaffold is a local script** (`scripts/create-site.mjs`), no published CLI in v1.
- **Comments:** permanent hard non-goal — none, ever.

## Critical Patterns for This Stack

- **Fail loud, name the file.** All content validation throws `ContentError` naming the offending file (and both files on slug collisions). Never silently drop a post or crash generically. This is the only validation layer — a phone text box has none.
- **`adapter-static` only prerenders discoverable routes.** Dynamic routes must export an `entries()` generator (or be crawlable). Drafts are built precisely because `posts/[slug]/entries()` includes them even though nothing links to them.
- **Timezone-stable dates.** Format and compare dates from UTC parts only (site is prerendered; no client date logic) to avoid off-by-one-day and SSR/hydration drift.
- **Raw HTML in posts is passed through** (`allowDangerousHtml` + `rehype-raw`) — acceptable because content is owner-authored (trust boundary = repo push access). Revisit if multi-author is ever added.
- **`catch (e: unknown)`**, narrow before use — never `catch (e: any)`.
- **Server/client split is enforced by two barrels.** `@downpress/core` = client-safe (components, config helper, format); `@downpress/core/server` = server-only (`createContent`/`fs`, markdown render, feed builders). A site's `content.server.ts` imports from `/server` and is only used from `+page.server.ts`/`+server.ts`. Pure logic (`parse.ts`, `rehype-figure.ts`, `config.ts`) is safe anywhere and is what the tests target. Parsed posts are cached in production builds but re-read every request in dev.
- **Core is SvelteKit-agnostic.** No `$env`/`$lib`/`$app` inside `packages/core` — sites inject `contentDir` and pass `SiteConfig` to components as props. This is what lets one engine serve many sites.

## Design Philosophy

- **Text first.** Minimal chrome, generous whitespace, one accent, hairline rules. The reading column is the product.
- **Ship almost no client JS.** It's a content site; keep it near-static for the 95+ Lighthouse target.
- **Boring authoring.** The author's only tool may be a phone text box; the build absorbs all the strictness so authoring stays trivial.

## My Preferences

- **Package manager:** pnpm. **Language:** TypeScript, ESM only (no CommonJS).
- **Git:** commit after substantive work with a clear message; no attribution trailers; never push unless asked.
- **Working mode:** plan before multi-file changes; work within the current ForgeKit phase; don't advance phases without confirmation.

## Current Feature State

### Complete (M1 + most of M2 + feature batch + M4 core/site split)

- Content loader with full edge-case handling (missing/malformed frontmatter, strict dates, duplicate slugs, unicode slugs, tag normalization, drafts, future-dating). Fails loud, names files.
- Index listing (published, newest-first, empty state), post pages (SEO meta, updated date, draft-preview banner), tag index + per-tag archives.
- RSS feed, sitemap (covers `/topics` + paginated pages), robots.txt (all prerendered).
- **"Essay" theme** (D11) in `packages/core/src/lib/styles/theme.css`, loaded via `@downpress/core/theme` (fonts + CSS): self-hosted Newsreader + Inter, three-tier accent (`--accent` / `--rule` / `--accent-wash`), warm neutrals, light/dark. CSS custom properties for cheap per-site variants.
- **Feature batch (D12):** excerpt post cards + featured hero + index pagination (`/page/[n]`, guarded by `handleUnseenRoutes`); optional per-post `author` byline; prev/next links; config-driven Topics/Explore (`site.topics`); config-driven external newsletter CTA (`site.newsletter`); image-only paragraphs → `<figure>`+`<figcaption>` (`rehype-figure`). Components are prop-driven in `packages/core/src/lib/components`.
- **M4 + Option C (DONE):** `@downpress/core` engine + `@downpress/app` (single SvelteKit app for all routes) + content-only `sites/*`. `pnpm downpress <cmd> --site <name>` injects config/posts/static and writes `sites/<name>/build/`. Scaffold emits content-only sites. **example-site** and **demo** build independently.
- 31 Vitest unit tests over `parse.ts`, `rehype-figure.ts`, `config.ts` (`pnpm test`). Both sites pass `check` and `build`.

### Not Started

- **Option D:** expose `downpress` as an installable CLI/package for external content-only site repos (see `docs/SITE_PACKAGING_OPTIONS.md`). Needs user decisions on distribution (git dep vs npm) and timing.
- **M3:** Cloudflare Pages CI deploy wiring (per site); build `pnpm downpress build --site <name>`, output `sites/<name>/build`.
- **M5:** 404 polish, reading-time, client-side search, per-site theme selection (tokens ready), core version-bump tooling.
- Split core into its own repo + git-URL+SHA pins + CI workflow template (deferred; see D4).
- A couple of integration tests over the fs loader; `TECHNICAL_REFERENCE.md` for the core API. Sample post with an image (edge case 10), OG image.

## Recent Changes

### Session 2026-07-04 (Phase 2 scaffolding)

- Confirmed all 11 open questions; locked the brief; advanced to Phase 2.
- Scaffolded SvelteKit (Svelte 5 / Kit 2.69 / Vite 8 — config lives in `vite.config.ts`, no `svelte.config.js`) at repo root via a temp dir to avoid the `sv create` non-empty-dir hang.
- Built the content engine, all routes, feeds, and the Classic theme. Build verified: draft builds but is unlisted; future-dated post excluded entirely; slug dedupe and missing-field failures confirmed loud.

### Session 2026-07-04 (early hardening + first real site)

- Extracted pure parse/validate logic into `parse.ts`; added Vitest with 20 unit tests (slugify, tag normalization, strict/impossible dates, missing fields, dedupe). Added `@types/node`.
- Reworked content loading to read the filesystem from `DOWNPRESS_CONTENT_DIR` (default `posts/`) instead of `import.meta.glob`, and made site identity come from `PUBLIC_SITE_*` env. Content routes moved to `+page.server.ts` (loader is server-only). This is the seam M4's core/site split will build on.
- Proved it on real content: built and ran the engine locally as **example-site.example**, pointing at the article in `../example-site/artifacts` (added frontmatter to that file in place). Article, tags, RSS, sitemap all render correctly under the site's identity.
- Note: the `.env` and the example-site content are NOT part of the engine repo (gitignored / external folder). Only the engine hardening was committed.

### Session 2026-07-05 (feature batch + Essay restyle, then M4 core/site split)

- **Stage 1** on the single project: self-hosted Newsreader + Inter; Essay theme; `author` frontmatter (+tests); extended site config (tagline/postsPerPage/topics/newsletter); `rehype-figure` (+tests); excerpt cards + featured hero + pagination; prev/next; `/topics`; newsletter CTA. Recorded D11/D12.
- **Stage 2 (M4):** converted the repo to a **pnpm workspace monorepo**. Extracted everything into `@downpress/core` (`packages/core`), redesigned for DI (no `$env`/`$lib`): `createContent({contentDir})`, prop-driven components, client vs `/server` barrels, `defineDownpressConfig`. Rebuilt the app as `sites/example-site` (real site, `example-post.md`). Wrote `scripts/create-site.mjs` and used it to generate `sites/demo` (restored the old demo posts). Deleted the old root SvelteKit app.
- **Verified:** `pnpm --filter @downpress/core test` = 31 pass; `pnpm -r check` = 0 errors; `example-site` and `demo` each `build` cleanly and independently to their own `build/`.
- Phase advanced to **4-feature-iteration** (user-confirmed). Gotcha logged: `/page/[n]` must be allowed in `handleUnseenRoutes` (one page of posts = route never crawled).

### Session 2026-07-25 (Option C: content-only sites)

- Migrated to Option C from `docs/SITE_PACKAGING_OPTIONS.md`: created `packages/app` (sole SvelteKit app), demoted `sites/*` to config + posts + static, added `scripts/downpress.mjs` (`DOWNPRESS_SITE_ROOT` injection; build → `sites/<name>/build/`). Scaffold emits content-only sites. Verified check + both site builds + 31 core tests. Option D next (needs distribution decisions from user).
