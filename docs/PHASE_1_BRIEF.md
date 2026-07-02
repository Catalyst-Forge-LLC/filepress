<!-- forgekit-template-mode: shell -->

# Downpress — Phase 1 architecture brief

_Structured capture of planning and architecture before code scaffolding. Goal: Phase 2 (or a new agent/session) can start from this file + `.forgekit/workflow_tracking.json` without re-reading the whole Phase 1 chat._

**Status:** `draft` — derived from `GENESIS.md` (a pre-written build spec); locking is blocked on user answers to the open questions in §9.
**Last updated:** 2026-07-02
**Phase 1 exit:** Do not mark Phase 1 complete in `.forgekit/workflow_tracking.json` until this brief is locked and major commitments are in `decisions[]`.

---

## 1. Problem and outcome

**What we are building:** A personal blog where every post is a Markdown file with YAML frontmatter, stored and edited directly in a GitHub repo (GitHub mobile app, GitHub web editor, or any text editor) — no custom admin UI, no database. A SvelteKit static-site build compiles the Markdown into a fast, prerendered HTML site that auto-deploys on every push to `main`.

Structurally, this is not one blog but a reusable engine (**Downpress core**) plus one or more independently deployable **Sites** built on top of it, so a second blog can be spun up later without re-doing the engine work.

**What "done" looks like for v1:** Push a valid Markdown post to `main` via the GitHub mobile app → within a few minutes the live site shows the new post on the index, its own page, and any tag archive pages, with a working RSS feed and sitemap — no manual deploy step. See full acceptance criteria in `GENESIS.md` §8.

---

## 2. Users and hero flow

**Primary user:** The site owner (you), authoring posts almost entirely from a phone via the GitHub mobile app, occasionally from a desktop text editor.

**Hero flow (v1):** Edit or create a `.md` file with YAML frontmatter in the content directory → commit/push to `main` → CI builds and deploys → live site reflects the change with no manual step.

**Secondary workflows for v1:** Browsing the post index, browsing a tag archive, subscribing via RSS, and (later, per M4) scaffolding a brand-new independent Site from Downpress core.

---

## 3. Constraints

- **Technical:** No database, no server runtime, no authentication system — content trust boundary is "whoever can push to the GitHub repo." Build/dev must run on standard Node.js tooling (edits originate from a phone; build runs in CI on a Linux runner). Each Site's build must be fully isolated — building Site A must never read, write, or affect Site B, even as sibling directories.
- **Business/timeline:** None specified yet.
- **Explicit non-goals for v1:** No custom web editor UI, no database/accounts/auth, no comments system, no image-optimization pipeline beyond a static-folder convention, no multi-author support, no CMS-style admin dashboard, no search, no hosted "create a site for me" service (scaffolding is local/CLI), no cross-site features (each site is independent at runtime; only the build-time engine is shared). Full list in `GENESIS.md` §10.

---

## 4. Stack and tooling

_Proposed by GENESIS.md; not yet explicitly confirmed by user sign-off (see §9 open questions for the gaps)._

| Area | Choice | Status | Notes / WHY |
| --- | --- | --- | --- |
| Framework | SvelteKit | proposed | Required per project brief; static output via `adapter-static`. |
| Content pipeline | gray-matter + remark/rehype (data-driven), **not** mdsvex-as-routes | proposed | Posts are pure data, not templates; avoids mdsvex's known layout/frontmatter-context limitation; keeps frontmatter access uniform across listings, post pages, RSS, sitemap. |
| Language | Not yet specified (TS recommended for consistency with rest of tooling) | open | Confirm TypeScript vs JavaScript. |
| DB / backend | None (static site, no runtime server) | confirmed | Explicit non-goal. |
| Auth / storage | None (GitHub's own access control is the trust boundary) | confirmed | |
| Styling | Not yet decided | open | See §9 open question 6. |
| Deploy / CI | GitHub Actions (or a host with native git integration); target host (GitHub Pages / Cloudflare Pages / Netlify / Vercel) undecided | open | See §9 open question 2 — determines exact CI workflow and adapter base-path config. |
| Package manager | pnpm (per user's global convention) | proposed | |
| Site dependency mechanism | Git URL dependency on Downpress core (`github:user/downpress-core#tag-or-commit`), pinned by default, not floating on `main` | proposed | Avoids needing to publish to npm; an explicit version bump is required to pull in core updates. |

---

## 5. Data model (sketch)

**Core entities:**
- **Post** — one Markdown file + YAML frontmatter. Fields: `title` (string, required), `date` (ISO date, required), `slug` (string, optional — derived from filename if absent), `description`/`excerpt` (string, optional), `tags` (string array, optional), `draft` (boolean, optional, default `false`), `updated` (ISO date, optional). Body = Markdown content after frontmatter, compiled to HTML at build time.
- **Tag** — derived, not authored directly: the set of unique tag strings across all non-draft posts; each gets an archive page.
- **Site config** (`downpress.config.js` or equivalent) — one per Site: title, base URL, theme choice, nav links.

**Relationships:** A Post has zero or more Tags (many-to-many, derived). A Site has many Posts (its own content directory only) and exactly one config.

**Existing data / migration:** None — greenfield project, no existing posts to migrate.

---

## 6. Integrations and external systems

None for v1. No LLM-generated content, no payments, no email, no analytics/tracking/third-party scripts by default (explicit non-functional requirement).

## 6a. Content-generation pattern

Not applicable — all post content is hand-authored by the site owner, not LLM-produced.

---

## 7. Hardest problems and risks

1. **Frontmatter/YAML robustness against phone-keyboard input** — smart quotes, tabs vs spaces, trailing invisible characters after the closing `---` can silently break naive parsing. Must use a tolerant parser and fail loudly (naming the file) rather than crash opaquely or silently drop a post.
2. **`adapter-static`'s crawl-based prerendering** — tag/pagination routes not linked from a discoverable page won't be generated unless explicitly listed in `config.kit.prerender.entries`; easy to silently miss archive pages.
3. **Core/site split done right from the start** — SvelteKit's per-project routing/build is a hard framework constraint (no way to share one SvelteKit install across two site configs), so the core/site boundary and the scaffold command need to be designed correctly in M4 rather than bolted on after M1–M3 accumulate site-specific assumptions.

---

## 8. Architectural decisions (numbered)

**D1. Use gray-matter + remark/rehype (data-driven) instead of mdsvex-as-routes.**
Rationale: posts are pure content, not interactive Svelte templates; avoids mdsvex's known limitation where a `+layout.svelte` can't directly read a child `.md` file's frontmatter; keeps frontmatter access simple and uniform everywhere (listings, post pages, RSS, sitemap) via one loader function.
Alternatives considered: mdsvex-as-routes (rejected — forces awkward per-post folder structures under SvelteKit's routing, and the layout/frontmatter-context limitation is a real, long-standing gap); rodneylab/sveltekit-blog-mdx and similar MDX-flavored starters (rejected — more machinery than needed, no embedded interactive components required for v1).

**D2. Static prerendering via `adapter-static`, not SSR.**
Rationale: no runtime backend is needed or wanted; output is a plain folder of static HTML/CSS/JS deployable to any static host. Tag/pagination routes must be kept crawlable or explicitly listed in `config.kit.prerender.entries` since the adapter only prerenders what it can discover.
Alternatives considered: default SvelteKit SSR (rejected — unnecessary server process for a content-only site with no per-request dynamic data).

**D3. Core/site split is a first-class requirement, not a later refactor.**
Rationale: SvelteKit's routing/build system is inherently per-project (hard framework constraint, not a design preference) — every Site must be its own SvelteKit project. Downpress core centralizes the content loader, markdown pipeline, feed/sitemap generators, shared layout/theme components, and the scaffolding tool; Sites stay thin (content + one config file + wiring).
Alternatives considered: single monolithic project handling multiple blogs via config (rejected — not possible under SvelteKit's per-project routing/build model); copy-pasting the engine per site (rejected — explicitly called out as painful rework the spec wants to avoid).

**D4. Sites depend on Downpress core via a pinned git dependency, not `main`-floating or npm.**
Rationale: avoids needing to publish/maintain a public npm package while still allowing `npm install`/`pnpm install` to pull the shared engine; pinning to a tag/commit means a core change never silently changes a site's next build — an explicit version bump is required.
Alternatives considered: publish core to npm under a scoped name (deferred — not needed for v1, no intent to publish publicly yet); floating dependency on `main` (rejected — defeats the "explicit, deliberate update" requirement in edge case 16).

---

## 9. Open questions (must resolve before locking this brief)

_Carried over verbatim from `GENESIS.md` §9 — these are the concrete things to reply with._

| # | Question | Notes |
| - | -------- | ----- |
| 1 | **Drafts:** fully excluded from build output, or built at a hidden/unlinked URL for phone preview? | Affects build pipeline and edge case 6.2 handling. |
| 2 | **Deploy target:** GitHub Pages, Cloudflare Pages, Netlify, or Vercel? | Determines exact CI workflow and `adapter-static` config (GitHub Pages needs a base path unless using a custom domain). |
| 3 | **Content directory location:** `src/content/posts/` vs. a top-level `/posts/` outside `src/`? | Top-level may be easier to find/edit via the GitHub mobile app's file browser. |
| 4 | **Date format policy:** strictly ISO `YYYY-MM-DD` only, or also accept full ISO datetime strings? | Recommend picking one and rejecting the other. |
| 5 | **Future-dated posts:** include immediately on build, or hide until the date arrives? | Requires a build-time "is this in the past" check tied to the CI run's date if hidden. |
| 6 | **Styling ambition:** bare-minimum readable typography, or a specific visual direction (font pairing, dark mode, reference site)? | |
| 7 | **Comments/interactivity:** confirmed out of scope for v1? | If wanted later: Giscus via GitHub Discussions, not v1. |
| 8 | **Custom domain:** from day one, or default host subdomain? | Affects `adapter-static` base-path config, mainly for GitHub Pages. |
| 9 | **Theme sharing across sites:** one shared default theme, or multiple selectable themes/layouts per site from the start? | Affects how much lives in core vs. per-site. |
| 10 | **Core versioning scheme:** informal (pin to commit SHAs as needed), or real semver-tagged releases from the start? | |
| 11 | **Scaffold command location:** a local script run from the core repo (`node scripts/create-site.js`), or a published CLI (`npx downpress create ...`)? | The latter needs a separate npm-publish decision. |

---

## 10. Explicitly out of scope (v1)

- No custom web-based editor UI — editing happens via the GitHub mobile app / GitHub.com / any text editor.
- No database, no user accounts, no authentication.
- No comments system (v1).
- No image optimization pipeline beyond a static-folder convention.
- No multi-author support.
- No CMS-style admin dashboard.
- No search functionality in v1.
- No hosted/managed "create a site for me" web service — scaffolding is a local/CLI operation.
- No cross-site features (no shared search or unified dashboard across sites) — only the build-time engine is shared.

---

## 11. First feature batch (post-scaffold)

Milestones from `GENESIS.md` §7 (full detail there):

1. **M1 — Minimum usable version:** SvelteKit + `adapter-static` scaffold; content loader (gray-matter, remark/rehype); index page (non-draft posts, date-descending); individual post page; build fails loudly on missing `title`/`date` or malformed frontmatter; `pnpm run build` + `pnpm run preview` work locally. Core/site split not required yet.
2. **M2 — Publishing-ready:** Tag archive pages; RSS/Atom feed + `sitemap.xml`; drafts excluded from listing/feed/sitemap; duplicate-slug detection; remaining frontmatter edge cases (smart quotes, invisible whitespace, Unicode/emoji slugs, tag-name normalization); image convention documented; SEO meta tags.
3. **M3 — Deployed and automated:** CI builds and deploys on push to `main`; `robots.txt` + sitemap wired together; basic responsive styling.
4. **M4 — Core/site split & scaffolding:** Extract content loader, markdown pipeline, feed/sitemap generators, and shared layout/theme components into Downpress core; rebuild the original site as "Site A" depending on core via pinned git dependency; build the scaffold command; prove isolation building Site A and Site B independently.
5. **M5 — Polish (optional):** Pagination, draft-preview-by-direct-URL (if decided in §9), 404 page, reading time / prev-next links, tooling for bumping a Site's pinned core version.

---

## 12. Handoff checklist (before leaving Phase 1)

- [ ] User has confirmed stack, folder shape, data sketch, hero flow, and v1 boundaries
- [ ] All 11 open questions in §9 are answered (or explicitly deferred with a documented default)
- [ ] This brief is marked **locked** (status line above updated from `draft`)
- [ ] `.forgekit/workflow_tracking.json` updated: `decisions[]` for each D#; `phases["1-architecture"]` notes summarize sign-off
- [ ] Phase 2 opener will read this file + `.forgekit/workflow_tracking.json` first
