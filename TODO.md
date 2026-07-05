# Downpress — Feature Backlog

_Flat backlog seeded from `docs/PHASE_1_BRIEF.md` §11 (milestones M1–M5). Reorganize by brand pillars later (Phase 6). `[x]` = done, `[ ]` = planned._

---

## M1 — Minimum usable version ✅ (done in Phase 2)

- [x] SvelteKit + `adapter-static` project (TS, pnpm), config in `vite.config.ts`
- [x] Content loader: read `/posts/*.md`, parse frontmatter, compile Markdown → HTML
- [x] Index page: non-draft posts, newest first, empty state
- [x] Individual post page: title, date, updated, body
- [x] Fail loud on missing `title`/`date` or malformed frontmatter (file named)
- [x] `pnpm build` + `pnpm preview` produce a working static site

## M2 — Publishing-ready (mostly done in Phase 2)

- [x] Tag archive pages + tag index; tags shown on listings and post pages
- [x] RSS feed + `sitemap.xml`
- [x] Drafts excluded from listing/feed/sitemap (built unlinked for preview, D7)
- [x] Duplicate-slug detection (names both files)
- [x] Frontmatter edge cases: trailing whitespace, unicode/emoji slugs, tag normalization, strict dates
- [x] SEO meta tags (title, description, canonical, Open Graph basics) on post pages
- [ ] Document the image convention in a visible place (README done; consider a sample post with an image)
- [ ] Decide/verify smart-quote handling on a real phone-authored title (edge case: apostrophes)

## Feature batch + Essay restyle ✅ (2026-07-05, D11/D12)

- [x] "Essay" theme: self-hosted Newsreader + Inter (`@fontsource-variable`), three-tier accent, warm neutrals, light+dark
- [x] Optional per-post `author` byline (frontmatter + `parse.ts` + tests)
- [x] Excerpt post cards + "Read more →" (shared `PostCard` component)
- [x] Featured latest post on the index
- [x] Index pagination via `/page/[n]` (+ `handleUnseenRoutes` guard for small sites)
- [x] Prev/next post links on articles
- [x] Config-driven Topics/Explore view (`site.topics`, falls back to all tags)
- [x] Config-driven external newsletter CTA (`site.newsletter`)
- [x] Image-only paragraphs → `<figure>` + `<figcaption>` (`rehype-figure` + tests)
- [x] `SiteConfig` extended (tagline, postsPerPage, topics, newsletter) + `.env.example`; sitemap covers `/topics` + paginated pages

## M3 — Deployed and automated

- [ ] Cloudflare Pages project wired to the repo (build `pnpm build`, output `build/`)
- [ ] Confirm push-to-`main` → live deploy with no manual step
- [ ] Custom domain attached; verify site serves at root (no base path)
- [ ] `robots.txt` + `sitemap.xml` verified live and cross-referenced
- [ ] Responsive styling pass on real mobile + desktop
- [ ] Lighthouse: confirm 95+ performance on a typical post page

## M4 — Core/site split & scaffolding

- [ ] Extract content loader, markdown pipeline, feed/sitemap generators, and shared layout/theme into a `downpress-core` package/repo _(content-dir + identity env seam already in place)_
- [ ] Rebuild this site as "Site A" depending on core via a pinned git dependency
- [ ] Promote **example-site.example** to a real Site repo (its own `/posts/`, `downpress.config`, CI) once the core split lands — currently run locally via `DOWNPRESS_CONTENT_DIR` + a gitignored `.env`
- [ ] `defineDownpressConfig()` helper consumed by a site's config
- [ ] Local scaffold script (`node scripts/create-site.js <name>`): new SvelteKit site wired to core, empty `/posts/`, starter `downpress.config`, CI workflow; refuse to overwrite a non-empty dir (edge case 18)
- [ ] Prove isolation: build Site A and Site B independently in either order, no cross-contamination
- [ ] Site config validation: fail (or documented fallback) if required config field missing (edge case 19)

## M5 — Polish (optional)

- [x] Pagination for the index once post count grows _(`/page/[n]`)_
- [x] Prev/next post links _(done in the feature batch)_
- [ ] Custom 404 page styling
- [ ] Per-site theme selection (variations on the Essay aesthetic, D9) — tokens are in place; needs a theme-switch seam
- [ ] Reading-time estimate (deferred; not in this batch)
- [ ] Client-side search (deferred; needs JS + build-time index)
- [ ] Tooling to bump a Site's pinned core version deliberately

## Foundation

### Robustness & Code Quality

- [x] Extract pure parse/validate logic to `parse.ts`; add Vitest unit tests for slugify, tag normalization, date validation, missing fields, and duplicate detection _(20 tests, `pnpm test`)_
- [x] Make content directory (`DOWNPRESS_CONTENT_DIR`) and site identity (`PUBLIC_SITE_*`) env-configurable — the seam for the M4 core/site split; verified by running as example-site.example
- [ ] Add a couple of integration tests over the fs loader (fixtures dir → published/draft/future filtering, dedupe error)

### Documentation

- [ ] `TECHNICAL_REFERENCE.md` once the core/site API surface exists (M4)
