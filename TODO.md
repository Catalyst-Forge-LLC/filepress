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

## Architecture — site packaging

- [x] **Option C** ([`docs/SITE_PACKAGING_OPTIONS.md`](docs/SITE_PACKAGING_OPTIONS.md)): `packages/app` owns all routes; `sites/*` are content-only; `scripts/downpress.mjs --site` builds to `sites/<name>/build/`
- [x] **Option D:** installable `downpress` bin; sibling sites use `link:../downpress`; scaffold `--external`; docs for git pin `github:Catalyst-Forge-LLC/downpress#…` ([`docs/EXTERNAL_SITES.md`](docs/EXTERNAL_SITES.md))
- [x] Push engine to `Catalyst-Forge-LLC/downpress` _(main pushed; tag when ready for CF git-dep installs)_

## M3 — Deployed and automated

- [ ] Cloudflare Pages project wired to the repo (build command + output path depend on packaging choice — see SITE_PACKAGING_OPTIONS §6)
- [ ] Confirm push-to-`main` → live deploy with no manual step
- [ ] Custom domain attached; verify site serves at root (no base path)
- [ ] `robots.txt` + `sitemap.xml` verified live and cross-referenced
- [ ] Responsive styling pass on real mobile + desktop
- [ ] Lighthouse: confirm 95+ performance on a typical post page

## M4 — Core/site split & scaffolding ✅ (2026-07-05, pnpm workspace monorepo)

- [x] Extract content loader, markdown pipeline, feed/sitemap builders, config helper, theme, and shared components into `@downpress/core` (`packages/core`, source-linked Svelte library)
- [x] Rebuild sites as SvelteKit apps depending on core via `workspace:*` (thin per-site routes; routes stay per-project by SvelteKit constraint)
- [x] Promote **example-site.example** to a real site (`sites/example-site`, own `posts/` + `downpress.config.ts`)
- [x] `defineDownpressConfig()` helper consumed by each site's `downpress.config.ts` (site root)
- [x] Local scaffold script (`node scripts/create-site.mjs <name>`): wires a new site to core, starter `downpress.config`, starter post; refuses a non-empty dir (edge case 18)
- [x] Prove isolation: `example-site` and `demo` build independently to their own `build/` (verified)
- [x] Site config validation: `defineDownpressConfig` fails loudly on missing `title`/`url` (edge case 19, unit-tested)
- [ ] _(deferred to when a second repo is actually needed)_ Split core into its own repo + pin sites via git URL+SHA (D4); add a CI workflow template to the scaffold

## Site import + static pages (2026-08)

- [x] Static pages: `pages/*.md` → `/[slug]` (reserved slug guard, sitemap, demo About)
- [x] `downpress import` CLI (`@downpress/import`): discover → extract → sibling scaffold
- [x] Optional Ollama design brief → token `theme.css` (pass A); `--no-llm` fallback
- [ ] Vision screenshots in brief prompt (Playwright); richer home-as-page mode
- [ ] Cloudflare `_redirects` emitter for old `/writing/*` paths
- [ ] Offline HTML fixtures for import integration tests (no live net in CI)

## M5 — Polish (optional)

- [x] Pagination for the index once post count grows _(`/page/[n]`)_
- [x] Prev/next post links _(done in the feature batch)_
- [ ] Custom 404 page styling
- [x] Per-site theme override — optional `theme.css` / `theme.scss` at site root (Zen Garden); tokens + class API in `docs/THEME.md`
- [ ] Optional named theme presets in core (still possible; site file remains the escape hatch)
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
