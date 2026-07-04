# Downpress — Project Context Prompt

_Paste into a new chat to resume. Single most important document for session continuity — update at the end of every session. Merged from `docs/PHASE_1_BRIEF.md` (locked 2026-07-04); decisions preserved in `.forgekit/workflow_tracking.json → decisions[]`._

---

## What this is

Downpress is a git-native Markdown blog engine. Every post is a plain `.md` file with YAML frontmatter, committed to a GitHub repo and edited from anywhere (GitHub mobile app, web editor, any text editor) — **no admin UI, no database, no server runtime**. A SvelteKit `adapter-static` build compiles the Markdown into a fast, fully prerendered site that auto-deploys on push.

Structurally it is designed to become a reusable **core engine** plus independently deployable **Sites** (see Roadmap M4), though for now it is a single project.

**Hero flow:** author/edit a `.md` file under `/posts/` → push to `main` → CI builds and deploys → live site reflects the change with no manual step.

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5, runes mode) with `@sveltejs/adapter-static` — fully prerendered, no runtime server.
- **Language:** TypeScript (strict), ES modules only.
- **Package manager:** pnpm.
- **Content pipeline:** `gray-matter` (frontmatter) + `unified`/`remark`/`rehype` (Markdown → HTML). Plugins: `remark-gfm`, `remark-rehype` (+`rehype-raw` for raw-HTML passthrough), `rehype-slug`, `rehype-autolink-headings`, `rehype-highlight`, `rehype-stringify`.
- **Styling:** Hand-written CSS in `src/app.css` (no Tailwind). One "Classic" theme: sparse, sharp, editorial — serif reading column, one accent, hairline rules, light/dark via `prefers-color-scheme`.
- **Deploy:** Cloudflare Pages, always on a custom domain (site served at root, no base path). CI wiring is Roadmap M3 (not built yet).
- **No** database, auth, LLM, analytics, or third-party client scripts.

## Project Structure

```
downpress/
  posts/                         # top-level content dir (D6) — the .md files you author
  src/
    app.css                      # global "Classic" theme
    lib/
      config.ts                  # per-site config (title, url, description, nav) + absoluteUrl()
      format.ts                  # UTC-stable date formatting
      content/
        types.ts                 # PostMeta / PostSource / RenderedPost
        markdown.ts              # unified remark/rehype pipeline
        posts.ts                 # loader: parse, validate, slug, drafts, future-date, dedupe, tags
    routes/
      +layout.ts                 # prerender = true (whole site static)
      +layout.svelte             # header/nav/footer + app.css import
      +page.(ts|svelte)          # index listing (published posts, empty state)
      posts/[slug]/+page.(ts|svelte)   # post page (entries() builds published + drafts)
      tags/+page.(ts|svelte)           # tag index
      tags/[tag]/+page.(ts|svelte)     # per-tag archive
      rss.xml/+server.ts               # RSS feed (prerendered)
      sitemap.xml/+server.ts           # sitemap (prerendered)
      robots.txt/+server.ts            # robots (references sitemap)
  vite.config.ts                 # adapter-static + prerender config (no svelte.config.js in this Kit version)
```

## Data Model

A **Post** is one `.md` file. Validated frontmatter (`PostMeta` in `src/lib/content/types.ts`):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | Build fails (naming file) if missing. |
| `date` | `YYYY-MM-DD` | yes | Strict format; real-calendar-date checked; future dates hidden until they arrive. |
| `slug` | string | no | Derived from filename if absent; slugified (unicode letters/numbers, `-`). |
| `description` / `excerpt` | string | no | `description` wins; used for listings + SEO. |
| `tags` | string[] | no | Normalized: trimmed, lowercased, de-duplicated. |
| `draft` | boolean | no (default false) | Excluded from listings/feed/sitemap; page still built for preview (D7). |
| `updated` | `YYYY-MM-DD` | no | Shown if present and different from `date`. |

**Tags** are derived (unique normalized tags across published posts). **Site config** is one object in `src/lib/config.ts`.

## Key Architectural Decisions

_(WHY preserved; full rationale + alternatives in `.forgekit/workflow_tracking.json → decisions[]`.)_

- **D1 — gray-matter + remark/rehype (data-driven), not mdsvex-as-routes.** DECIDED Phase 1. Posts are pure content; avoids mdsvex's layout/frontmatter-context limitation; uniform frontmatter access everywhere.
- **D2 — `adapter-static`, fully prerendered, not SSR.** DECIDED Phase 1. No runtime backend. Tag/post routes use `entries()` generators; feeds/sitemap covered by `prerender.entries: ['*']`.
- **D3 — Core/site split is a first-class goal (M4), not a later bolt-on.** SvelteKit is per-project; core will centralize loader, pipeline, feeds, layout/themes, scaffolding.
- **D4 — Sites depend on core via a pinned git dependency**, not npm or `main`-floating.
- **D5 — Cloudflare Pages + always a custom domain** → static output at root, no base path.
- **D6 — Content in top-level `/posts/`** (outside `src/`) for easy GitHub-mobile browsing. Loaded via `import.meta.glob('/posts/*.md', { query: '?raw', eager: true })`.
- **D7 — Drafts:** excluded from index/tags/RSS/sitemap, but built at their URL (unlinked, `noindex`) for phone preview.
- **D8 — Strict `YYYY-MM-DD`; future-dated posts hidden** until their date (build-time `date <= today` in UTC).
- **D9 — Styling is sparse/classic/high-end; per-site themes are variations on the shared core aesthetic.**
- **D10 — Informal core versioning (commit pins); scaffold is a local script**, no published CLI in v1.
- **Comments:** permanent hard non-goal — none, ever.

## Critical Patterns for This Stack

- **Fail loud, name the file.** All content validation throws `ContentError` naming the offending file (and both files on slug collisions). Never silently drop a post or crash generically. This is the only validation layer — a phone text box has none.
- **`adapter-static` only prerenders discoverable routes.** Dynamic routes must export an `entries()` generator (or be crawlable). Drafts are built precisely because `posts/[slug]/entries()` includes them even though nothing links to them.
- **Timezone-stable dates.** Format and compare dates from UTC parts only (site is prerendered; no client date logic) to avoid off-by-one-day and SSR/hydration drift.
- **Raw HTML in posts is passed through** (`allowDangerousHtml` + `rehype-raw`) — acceptable because content is owner-authored (trust boundary = repo push access). Revisit if multi-author is ever added.
- **`catch (e: unknown)`**, narrow before use — never `catch (e: any)`.

## Design Philosophy

- **Text first.** Minimal chrome, generous whitespace, one accent, hairline rules. The reading column is the product.
- **Ship almost no client JS.** It's a content site; keep it near-static for the 95+ Lighthouse target.
- **Boring authoring.** The author's only tool may be a phone text box; the build absorbs all the strictness so authoring stays trivial.

## My Preferences

- **Package manager:** pnpm. **Language:** TypeScript, ESM only (no CommonJS).
- **Git:** commit after substantive work with a clear message; no attribution trailers; never push unless asked.
- **Working mode:** plan before multi-file changes; work within the current ForgeKit phase; don't advance phases without confirmation.

## Current Feature State

### Complete (Phase 2 spine, M1 + most of M2)

- Content loader with full edge-case handling (missing/malformed frontmatter, strict dates, duplicate slugs, unicode slugs, tag normalization, drafts, future-dating). Fails loud, names files.
- Index listing (published, newest-first, empty state), post pages (SEO meta, updated date, draft-preview banner), tag index + per-tag archives.
- RSS feed, sitemap, robots.txt (all prerendered).
- "Classic" theme in `app.css`; light/dark.
- `pnpm build` produces a working static site; verified draft/future/dedupe behavior in output.

### Not Started

- **M3:** Cloudflare Pages CI deploy wiring; live-domain verification.
- **M4:** core/site split + scaffold script + isolation proof.
- **M5:** pagination, 404 polish, reading time, prev/next, per-site theme selection.
- Image convention doc (edge case 10), OG image, more SEO polish.

## Recent Changes

### Session 2026-07-04 (Phase 2 scaffolding)

- Confirmed all 11 open questions; locked the brief; advanced to Phase 2.
- Scaffolded SvelteKit (Svelte 5 / Kit 2.69 / Vite 8 — config lives in `vite.config.ts`, no `svelte.config.js`) at repo root via a temp dir to avoid the `sv create` non-empty-dir hang.
- Built the content engine, all routes, feeds, and the Classic theme. Build verified: draft builds but is unlisted; future-dated post excluded entirely; slug dedupe and missing-field failures confirmed loud.
