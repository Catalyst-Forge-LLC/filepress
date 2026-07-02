# Build Spec: Downpress — Git-Native Markdown Blog (SvelteKit)

https://claude.ai/share/1bc9859e-dca2-48ca-a69a-b1550e6fcabd

## 0. Summary

**Downpress** is a personal blog where every post is a Markdown file with YAML frontmatter, stored in a GitHub repo. Editing happens directly in the repo (GitHub mobile app, GitHub web editor, or any text editor) — there is no custom admin UI or database. A SvelteKit static site build compiles the Markdown into a fast, prerendered HTML site, which auto-deploys on every push.

The problem this solves: existing blogging platforms (Wordpress, Ghost, Medium, etc.) bring accounts, databases, plugin ecosystems, and hosting complexity for something that should be a folder of text files. The current workaround — nothing formalized yet — is "figure it out each time via ad hoc tutorials." This spec exists so the actual build is a one-shot, complete implementation instead of a half-finished tutorial project.

**Naming note for the builder:** the project is called Downpress. An unrelated, unmaintained npm package and GitHub org from ~2014 previously used this name for a similar concept (a "simple, fast, lightweight static website generator") — that project's site and GitHub org are now dead (site unreachable, GitHub org page 404s, ~56 weekly npm downloads that are almost certainly automated mirror/scanner traffic, no activity in 12 years). This project is an independent implementation with no relationship to that one. Since there's no intent to publish to the public npm registry, the name collision there is a non-issue; if that ever changes, publish under a scoped package name (e.g. `@yourusername/downpress`) rather than contesting the unscoped name.

---

## 1. Prior Art Research

Before specifying anything new, here's what already exists, so the builder isn't reinventing a wheel:

**Starter templates (closest matches):**
- **josh-collinsworth/sveltekit-blog-starter** — the most complete, actively maintained option. SvelteKit 2 + Svelte 5, markdown posts in `src/lib/posts`, auto-generated category pages, pagination, RSS feed, static adapter prerendering, zero-config preloading. Adding a post is "drop a `.md` file in a folder." This is close enough that forking it is a legitimate alternative to building from scratch — but it bundles opinionated styling/Sass and a specific folder convention that may not match what's wanted here.
- **matfantinel/sveltekit-static-blog-template** — similar shape, uses MDsveX, recommends the VS Code "Front Matter" extension as a quasi-CMS for editing (not applicable here since editing target is the GitHub mobile app, not VS Code).
- **rodneylab/sveltekit-blog-mdx** — MDX-flavored variant, adds PWA scaffolding — more machinery than needed.
- **edde746/sveltekit-markdown-blog** — simpler but uses a non-standard, custom (non-YAML) frontmatter format, less flexible.
- Various single-article tutorials (joyofcode.xyz, This Dot Labs, Jason Yuan's blog writeup) — all converge on the same core pattern: `mdsvex` or `gray-matter` + `import.meta.glob` + `adapter-static`. No tutorial covers a phone-only git-based editing workflow specifically, or handles the edge cases (drafts, malformed frontmatter, slug collisions) rigorously.

**Git-backed CMS tools** (Decap CMS / TinaCMS) exist for people who want a web-based editing UI that commits to git — not needed here since the GitHub mobile app already fills that role directly.

**Gap this spec fills:** no existing starter is documented with explicit edge-case handling (malformed frontmatter, empty repo, duplicate slugs, mobile-editing quirks like trailing whitespace or smart quotes from phone keyboards) or acceptance criteria a builder can be held to. This spec is the missing "hardened, complete" version of a well-known pattern — not a novel idea.

---

## 2. Required Background: How the Pieces Actually Work

The builder needs to understand this before writing code — these are non-obvious behaviors that cause real bugs.

### 2.1 Markdown + YAML frontmatter format
- Frontmatter is YAML delimited by `---` on its own line at the very start of the file and `---` closing it. Example:
  ```
  ---
  title: "My Post"
  date: 2026-07-01
  tags: [notes, sveltekit]
  draft: false
  ---
  Body content here.
  ```
- YAML is whitespace-sensitive. Common failure modes from mobile editing: smart quotes (`"` `"`) substituted by phone keyboards breaking string values, tabs instead of spaces in list indentation, trailing invisible characters after the closing `---`.
- Frontmatter parsing libraries (`gray-matter`, or mdsvex's built-in YAML frontmatter support) will throw on malformed YAML — this must be caught, not allowed to crash the whole build.

### 2.2 mdsvex vs. a plain markdown pipeline
Two viable approaches exist; pick one and be consistent:
- **mdsvex**: a Svelte preprocessor that treats `.md`/`.svx` files as Svelte components. Supports YAML frontmatter natively, lets you embed live Svelte components inside markdown, integrates with remark/rehype plugins for things like heading anchors and syntax highlighting. Frontmatter becomes exported metadata from the compiled component. Caveat: frontmatter is attached to the component module, not automatically available to parent layouts — there's a known, long-standing limitation where a `+layout.svelte` cannot directly read a child `.md` file's frontmatter without an explicit data-loading step (`+page.ts` reading metadata separately). Do not rely on layout-level context passing for frontmatter.
- **gray-matter + unified/remark/rehype pipeline**: parse frontmatter and markdown body manually as plain data (not Svelte components), then render the resulting HTML string into a generic post template. Simpler mental model, avoids the mdsvex layout-context limitation, and treats posts as pure data — recommended default for this project since it doesn't need embedded interactive Svelte components inside post bodies.

**Recommendation for this spec: use gray-matter + remark/rehype (data-driven), not mdsvex-as-routes.** Reasons: posts are just content, not templates; this avoids SvelteKit's routing requirement that every route needs a `+page.svelte` (which forces awkward per-post folder structures under mdsvex-as-routing); and it keeps frontmatter access simple and uniform everywhere (listings, individual post pages, RSS, sitemap) via one loader function.

### 2.3 Vite's `import.meta.glob`
- Used to load all markdown files at build time: `import.meta.glob('/src/content/posts/*.md', { query: '?raw', import: 'default', eager: true })`.
- `eager: true` inlines all file contents at build time — correct for a static site of blog-post scale (fine up to low thousands of posts). Do not lazy-load for a build-time static site; that pattern is for SSR apps loading content at request time, which is irrelevant here since there's no server.

### 2.4 `adapter-static` behavior and its sharp edges
- SvelteKit is server-rendered/dynamic by default. Static prerendering is opt-in via `export const prerender = true` in the root `+layout.js` (or per-route).
- The static adapter crawls links from your entry points to discover what to prerender — any route not linked from a discoverable page will not be generated unless explicitly listed in `config.kit.prerender.entries`. This matters for tag/category archive pages and paginated pages if their links aren't rendered somewhere crawlable.
- Routes using form actions or other purely-dynamic server behavior cannot be prerendered — irrelevant here since there is no runtime backend, but worth the builder knowing so they don't accidentally introduce a `+page.server.ts` with actions.
- Output is a folder of static HTML/CSS/JS deployable to GitHub Pages, Cloudflare Pages, Netlify, or Vercel — no server process needed at runtime.

### 2.5 Git / GitHub mobile app as the editing surface
- The GitHub mobile app supports creating and editing files with a plain text editor and committing directly to a branch (including `main`). It does **not** provide markdown preview, YAML validation, or frontmatter-aware forms — it's a plain text box.
- Implication: the build pipeline is the only validation layer. Bad frontmatter or malformed markdown will get committed as-is; the site build must handle it gracefully (see Edge Cases) rather than assuming clean input.
- Auto-deploy on push requires CI (GitHub Actions) wired to a static host, or a host with native git integration (Cloudflare Pages / Vercel / Netlify watching the repo). This is a deployment/config detail, not a core build feature, but the spec's acceptance criteria assume "push to `main` → live site updates" as the working definition of "done."

### 2.6 Multi-site architecture: core engine vs. individual sites
This project is not a single blog — it's a reusable engine (**Downpress core**) that multiple independent site repos build on top of. This has real implications for how the project must be structured; get this wrong early and every site will need painful rework later.

- **SvelteKit's routing/build system is inherently per-project.** There is no way for a single shared SvelteKit installation to serve two unrelated `svelte.config.js` projects at once — each site (Site A, Site B, ...) must be its own SvelteKit project with its own `svelte.config.js`, its own `package.json`, and its own build output. This is a hard constraint of the framework, not a design choice.
- **What *can* be centralized in Downpress core:** the content loader (frontmatter parsing, markdown-to-HTML pipeline, slug derivation, validation and edge-case handling), the RSS/sitemap/robots.txt generators, shared layout/theme components, and any shared SvelteKit config helpers (e.g., a preconfigured `defineDownpressConfig()` that a site's `svelte.config.js` imports and extends). Site-specific code should be minimal: content, a small config file (site title, URL, theme choice), and thin wiring that pulls in core.
- **Dependency mechanism, since core won't be published to npm:** a site's `package.json` can depend on the Downpress core repo directly via a git URL (e.g. `"downpress-core": "github:youruser/downpress#main"` or pinned to a tag/commit) or a local `file:` path for local development. This avoids needing to publish/maintain a public npm package while still letting `npm install` pull in the shared engine. Pinning to a tag or commit (rather than always tracking `main`) is recommended once the core stabilizes, so that a change to core doesn't silently break every site's next build — an explicit version bump should be required to pull in core updates.
- **Scaffolding a new site is a first-class feature of the core repo**, not a manual copy-paste process (see Functional Requirements 4.8). Running a scaffold command from the Downpress repo should produce a new, ready-to-deploy site folder/repo with the git dependency on core already wired in, a starter config file, an empty content directory, and CI already configured.
- **Each site's build is fully independent.** Running the build inside Site A's folder only touches Site A's output; Site B is untouched. There is no shared build step or shared output directory across sites.

---

## 3. Core Domain Concepts

- **Post**: a single Markdown file with YAML frontmatter representing one blog entry. Identified by a **slug** (URL path segment).
- **Frontmatter fields** (v1 required/optional set):
  - `title` (string, required)
  - `date` (ISO date, required) — publish date, used for sorting
  - `slug` (string, optional — derived from filename if absent)
  - `description` / `excerpt` (string, optional — used for SEO meta and listing previews)
  - `tags` (array of strings, optional)
  - `draft` (boolean, optional, default `false`)
  - `updated` (ISO date, optional — last-modified date, shown if present)
- **Body**: the Markdown content after frontmatter, compiled to HTML at build time.
- **Listing (index) page**: reverse-chronological list of published (non-draft) posts.
- **Tag archive**: list of posts filtered by a given tag.
- **Post page**: full rendered content of a single post.
- **Draft**: a post with `draft: true` — excluded from the listing, tag pages, RSS, and sitemap, but still buildable/viewable directly by URL for preview purposes (v1 optional — see open questions).
- **Downpress core**: the shared engine repo — content loader, markdown pipeline, feed/sitemap generators, shared layout/theme components, and the scaffolding tool. Not itself a deployable website.
- **Site**: an independent repo (e.g. Site A, Site B) representing one deployable blog. Contains its own content directory, a `downpress.config.js` (or equivalent) with site-specific settings (title, URL, theme choice), a thin SvelteKit project wired to depend on Downpress core, and its own CI/deploy configuration. Builds and deploys entirely independently of any other site.
- **Scaffold**: the output of running the "create a new site" command from Downpress core — a ready-to-use Site folder/repo with the core dependency, starter config, empty content directory, and CI already wired in.

---

## 4. Functional Requirements

### 4.1 Content loading & parsing
1.1. The system reads all `.md` files from a single designated content directory (e.g. `src/content/posts/`) at build time.
1.2. Each file's YAML frontmatter is parsed and separated from the Markdown body.
1.3. If a file's slug is not explicitly set in frontmatter, it is derived from the filename (kebab-case, extension stripped).
1.4. Markdown body is compiled to HTML using a standard pipeline (remark → rehype → HTML), supporting: headings, lists, code blocks with syntax highlighting, links, images, blockquotes, tables, and inline formatting.
1.5. Heading elements in compiled output get stable `id` attributes (slugified from heading text) to support anchor links.

### 4.2 Post listing
2.1. The home/index page lists all non-draft posts, sorted by `date` descending.
2.2. Each listing entry shows: title, formatted date, description/excerpt (if present), and tags (if present).
2.3. Listing links to the individual post page via its slug-based URL.
2.4. If the content directory is empty or has zero non-draft posts, the listing page renders a clear "no posts yet" state rather than erroring.

### 4.3 Individual post page
3.1. Each post is rendered at a predictable URL derived from its slug (e.g. `/posts/my-post-slug`).
3.2. Post page displays: title, formatted publish date, updated date (if present and different from publish date), tags (if present), and the rendered HTML body.
3.3. Post page sets page `<title>` and meta description tags from frontmatter (`title`, `description`) for SEO/social sharing.
3.4. If two posts resolve to the same slug (see Edge Cases), the build must fail loudly rather than silently overwriting one.

### 4.4 Tags
4.1. Each unique tag across all non-draft posts gets an archive page listing posts carrying that tag, sorted by date descending.
4.2. Tag pages are reachable/discoverable via links from post pages and/or a tag index, so `adapter-static`'s crawler can find and prerender them.

### 4.5 Feeds & discoverability
5.1. An RSS or Atom feed is generated at build time covering non-draft posts, sorted newest-first.
5.2. A `sitemap.xml` is generated covering the index, all post pages, and all tag pages.
5.3. A `robots.txt` is included, referencing the sitemap.

### 4.6 Drafts
6.1. Posts with `draft: true` are excluded from: the main listing, tag pages, RSS feed, and sitemap.
6.2. (Open question — see Section 8 — whether drafts should still be buildable at a direct URL for private preview, or excluded from the build entirely.)

### 4.7 Build & deploy
7.1. `npm run build` (or equivalent) produces a fully static output folder with no required runtime server.
7.2. The build must fail with a clear, actionable error message (naming the offending file) if a post's frontmatter is unparseable or missing a required field — not fail with a generic stack trace, and not silently drop the post.
7.3. A CI workflow (e.g., GitHub Actions) builds and deploys the static output on every push to `main`, with no manual deploy step required.

### 4.8 Core/site architecture & scaffolding
8.1. Downpress core is structured so that content loading, markdown compilation, feed/sitemap generation, and shared layout/theme components can be consumed by a separate Site repo as a dependency — not copy-pasted per site.
8.2. Downpress core exposes a scaffold command (e.g. `npx downpress create <site-name>`, or a documented script run from the core repo) that generates a new, independent Site folder containing: a minimal SvelteKit project wired to depend on Downpress core, an empty content directory, a starter `downpress.config.js` with placeholder site title/URL, and a working CI deploy workflow file.
8.3. A freshly scaffolded site must build and deploy successfully with zero content (see edge case 4.4) — "create a site, push it, get a live (if empty) blog" must work with no manual patching required after scaffolding.
8.4. Each Site's build command only builds that site; running a build in Site A's folder must not read, write, or otherwise affect Site B's folder or output, even if both are checked out as sibling directories on the same machine.
8.5. A Site's dependency on Downpress core is version-pinned (e.g. to a git tag or commit) by default at scaffold time, not floating against core's `main` branch, so that ongoing changes to core don't silently change a site's next build without an explicit, deliberate update.
8.6. Site-specific configuration (site title, base URL, theme/color choice, nav links, etc.) lives in one config file per site, separate from content, so a builder or future-you can find "the settings for this specific site" in one place.

---

## 5. Non-Functional Requirements

- **Performance**: Lighthouse performance score of 95+ on the built site for a typical text-heavy post page; total JS shipped to the client should be minimal (this is a mostly-static content site — avoid client-side frameworks/hydration for content that doesn't need interactivity).
- **Platform**: build and dev environment must run on standard Node.js tooling (no OS-specific dependencies), since edits originate from a phone but the build runs in CI (Linux runner).
- **Privacy**: no analytics, tracking, or third-party scripts included by default. No environment secrets required for the core build (secrets, if any, are deploy-target-specific, e.g. a Cloudflare/Vercel token in CI, not part of the app itself).
- **Resilience**: a malformed post must not take down the entire site build silently; failures must be loud and attributable to a specific file (see 7.2).
- **No database, no server runtime, no authentication system** — content trust boundary is "whoever can push to the GitHub repo," which is already handled by GitHub's own access control.
- **Scale target**: comfortably handle low hundreds to low thousands of posts without build times becoming unreasonable (a few minutes at most) or requiring pagination-breaking hacks.
- **Site isolation**: no shared mutable state or shared build/output directories between sites; a bug or bad content in one site's repo must never be able to break another site's build.

---

## 6. Edge Cases the Builder Must Handle

This is the section most naive tutorial-based implementations skip. Be exhaustive:

1. **Malformed YAML frontmatter** (e.g., unescaped colon in a title, smart quotes from a phone keyboard breaking a quoted string, mismatched list indentation). Build must fail with a message identifying the file and line, not crash the whole process opaquely.
2. **Missing required frontmatter fields** (no `title`, no `date`). Build must fail loudly, naming the file and the missing field — not silently render a post titled "undefined."
3. **Duplicate slugs** — two files that resolve to the same slug (either both explicitly set the same `slug:` value, or two filenames kebab-case to the same string). Build must fail with both filenames named in the error.
4. **Empty content directory** — zero posts. Listing, RSS, and sitemap must all handle this without erroring (see 2.4).
5. **All posts are drafts** — non-empty directory but nothing publishable. Same handling as above.
6. **Invalid or missing `date`** (e.g., a phone-typed date like `07/01/2026` instead of ISO `2026-07-01`, or the field omitted). Decide and document a single accepted date format; reject/flag anything else with a clear error rather than silently mis-sorting.
7. **Future-dated posts** (`date` is after today's build date). Decide explicit behavior: either include them (simplest for a personal blog, since you control what you push) or exclude until their date arrives — document the choice; don't leave it as accidental/undefined behavior.
8. **Trailing whitespace / invisible characters** introduced by mobile keyboards after the closing `---` frontmatter delimiter, which can break naive frontmatter-boundary detection (e.g., a regex expecting `---\n` exactly). Use a frontmatter parser tolerant of trailing whitespace, not a brittle manual string split.
9. **Markdown containing raw HTML** (some mobile markdown workflows produce stray HTML paste-in). Decide and document whether raw HTML passthrough is allowed or stripped/escaped — this is a security-relevant choice since it's your own content, but still worth being explicit about, especially if any future contributor other than you is added.
10. **Images referenced in post body** — where do image assets live, and how are relative paths resolved when authored from a phone (no local filesystem to browse for correct relative paths)? Recommend a fixed convention (e.g., all post images live in `static/images/posts/<slug>/` and are referenced by absolute path `/images/posts/<slug>/foo.jpg`) so mobile authors don't need to compute relative paths at all.
11. **Very long posts / code blocks** — ensure syntax highlighting and rendering don't choke or produce pathological build times on large files.
12. **Unicode/emoji in titles and slugs** — slugification must handle non-ASCII characters gracefully (either transliterate or safely encode) rather than producing broken URLs.
13. **Tag name inconsistency** (e.g., `SvelteKit` vs `sveltekit` used as separate tags across posts). Decide and document a normalization rule (e.g., always lowercase, trim) applied consistently when grouping tags.
14. **Concurrent/rapid commits from mobile** (e.g., saving a half-finished post, then fixing it in a follow-up commit) — not a build concern per se, but confirms why CI must always build from the latest `main` state rather than any cached intermediate state.
15. **Renaming or deleting a post file** — the old URL simply stops being generated (404 on next deploy). Confirm this is acceptable (personal blog, no redirect system in v1) rather than assumed.
16. **Core update breaks a site** — a change pushed to Downpress core (e.g. a bug fix, a breaking API change to the content loader) must not automatically propagate to every site's next build, given version pinning (see 8.5). Confirm the update flow: how does a site holder deliberately pull in a newer core version, and what happens if that update introduces a build error — is there a clear rollback path (revert the pinned version)?
17. **Two sites with colliding local dependency setups** — if using a `file:` path dependency for local development, confirm this doesn't leak into what actually gets committed/deployed (a site's committed `package.json` should reference the pinned git dependency, not a local filesystem path that won't exist in CI).
18. **Scaffolding into an existing non-empty directory** — the scaffold command must refuse or clearly warn rather than silently overwrite files if run somewhere content already exists.
19. **Site config missing or malformed** (e.g. no site title/URL set in `downpress.config.js` after scaffolding but before the placeholder values are edited) — build should either use sensible fallbacks or fail with a clear message naming the missing config field, not silently deploy a site titled "undefined" with a broken RSS feed URL.

---

## 7. Suggested Milestones

**M1 — Minimum usable version (single site, core/site split not yet required)**
- SvelteKit project scaffolded with `adapter-static`.
- Content loader: reads `.md` files from one directory, parses frontmatter with gray-matter (or equivalent), compiles body to HTML.
- Index page listing all non-draft posts by date, descending.
- Individual post page rendering title + date + body.
- Build fails loudly on missing `title`/`date` or malformed frontmatter (edge cases 1–2 handled).
- `npm run build` produces a working static site locally (`npm run preview` confirms it).
- It's fine for this milestone to live as one undifferentiated project — the core/site split happens in M2.

**M2 — Publishing-ready**
- Tags: per-tag archive pages, tags shown on listing and post pages.
- RSS/Atom feed and sitemap.xml generation.
- Drafts excluded from listing/feed/sitemap.
- Duplicate-slug detection (edge case 3) and remaining frontmatter edge cases (6, 8, 12, 13) handled.
- Image convention established and documented (edge case 10).
- SEO meta tags (title, description, Open Graph basics) on post pages.

**M3 — Deployed and automated**
- CI workflow builds and deploys on push to `main`.
- Live URL confirmed working end-to-end: edit a post via the GitHub mobile app → commit → site updates within a few minutes with no manual steps.
- robots.txt + sitemap wired together.
- Basic responsive styling — readable on both mobile (since you'll sometimes preview from your phone) and desktop.

**M4 — Core/site split & scaffolding**
- Refactor M1–M3's single project into the Downpress core / Site architecture described in Section 2.6: extract content loader, markdown pipeline, feed/sitemap generators, and shared layout/theme components into the core repo.
- Rebuild the original site as "Site A," now depending on Downpress core via a pinned git dependency, to prove the split actually works end-to-end (not just in theory).
- Build the scaffold command (4.8): running it produces a new, empty, deployable Site B from scratch.
- Confirm isolation: building Site A and Site B independently, in either order, on the same machine, produces two independent outputs with no cross-contamination (edge case 16–19, acceptance criteria below).

**M5 — Polish (optional, only if wanted)**
- Pagination for the index page once post count grows.
- Draft-preview-by-direct-URL if decided in open questions.
- 404 page.
- Reading time estimate, "previous/next post" links, or other nice-to-haves — explicitly out of scope for v1 unless requested.
- Tooling for bumping a Site's pinned core version deliberately (e.g. a documented `npm update downpress-core` step plus a changelog in core to know what changed).

---

## 8. Acceptance Criteria

- Given a markdown file with valid frontmatter (`title`, `date`) placed in the content directory, when the site is built, then a post page is generated at the expected slug URL containing the rendered title, date, and body content.
- Given a markdown file missing the `title` field, when the site is built, then the build fails with an error message that names the specific file and the missing field.
- Given two markdown files that resolve to the same slug, when the site is built, then the build fails with an error naming both files.
- Given a post with `draft: true`, when the site is built, then that post does not appear in the index listing, any tag archive page, the RSS feed, or the sitemap.
- Given zero posts in the content directory, when the site is built, then the index page builds successfully and displays an empty-state message rather than erroring.
- Given a post with three tags, when the site is built, then each of those three tags has an archive page listing that post, and the post page itself displays all three tags as links to their archive pages.
- Given a fresh commit pushed to `main` (e.g., via the GitHub mobile app) that adds a new valid post, when CI runs, then the live site reflects the new post without any manual deployment step.
- Given a post title containing an apostrophe typed as a smart quote by a mobile keyboard, when the site is built, then the build either succeeds with the character rendered correctly, or fails with a clear, specific error pointing at that file — not a generic crash.
- Given the built site, when measured with Lighthouse on a typical post page, then the performance score is 95 or above.
- Given the Downpress core repo's scaffold command run with a new site name, when it completes, then a new folder/repo exists containing a working SvelteKit project, an empty content directory, a starter config file, and a CI deploy workflow — and running that site's build command with zero content immediately succeeds and produces a valid (if empty) static site.
- Given two independently scaffolded sites (Site A and Site B) checked out as sibling folders, when Site A's build is run, then Site B's folder and any prior Site B build output are completely untouched.
- Given a Site whose `package.json` pins Downpress core to a specific tag/commit, when Downpress core is updated on its `main` branch, then that Site's next build (without a deliberate dependency bump) is unaffected by the core change.
- Given a Site's `downpress.config.js` is missing a required field (e.g. site title), when that Site is built, then the build fails with a clear error naming the missing field, or falls back to a documented sensible default — not a silent "undefined" appearing on the live site.

---

## 9. Open Questions (confirm before/during build)

1. **Drafts**: should `draft: true` posts be fully excluded from the build output, or built at a hidden/unlinked URL for preview purposes? (Fully excluding is simpler; hidden-URL preview is more useful if you want to check formatting on your phone before flipping `draft: false`.)
2. **Deploy target**: which static host — GitHub Pages, Cloudflare Pages, Netlify, or Vercel? This determines the exact CI workflow and adapter configuration (GitHub Pages needs `adapter-static` with a base path if not using a custom domain; the others are more permissive).
3. **Content directory location**: `src/content/posts/` vs. a top-level `/posts/` folder outside `src/` — top-level is arguably easier to find/edit via the GitHub mobile app's file browser since it's not nested inside app source.
4. **Date format policy**: strictly ISO `YYYY-MM-DD` only, or also accept full ISO datetime strings? Recommend picking one and rejecting the other to avoid silent inconsistency.
5. **Future-dated posts**: include immediately on build, or hide until the date arrives (requires a "is this post's date in the past" check at build time, tied to the CI run's date)?
6. **Styling ambition**: bare-minimum readable typography (fastest to ship), or a specific visual direction (e.g., a particular font pairing, dark mode, a design reference site)?
7. **Comments/interactivity**: confirmed out of scope for v1 — correct? (Static site with no backend means no native comments system; if wanted later, it'd be a third-party embed like Giscus, using GitHub Discussions — notably fitting the "already have GitHub" theme, but explicitly not in v1 unless flagged here.)
8. **Custom domain**: is this going on a custom domain from day one, or the default subdomain of whichever host is chosen? Affects `adapter-static` base-path config (relevant mainly for GitHub Pages).
9. **Theme sharing across sites**: should all sites share one visual theme by default (only content differs), or should Downpress core support multiple selectable themes/layouts per site from the start? Affects how much lives in core vs. per-site.
10. **Core versioning scheme**: informal (pin to commit SHAs as needed) or a real semver-tagged release process for Downpress core from the start? Informal is faster to start; real tags make "what changed" easier to track once there are several sites depending on core.
11. **Where does the scaffold command live and run from**: a script inside the Downpress core repo you run locally (`node scripts/create-site.js my-new-blog`), or a proper CLI published for convenience (`npx downpress create ...`, which would need an npm publish decision separate from the core package itself)?

---

## 10. Explicit Non-Goals (v1)

- No custom web-based editor UI — editing happens via the GitHub mobile app / GitHub.com / any text editor, directly against the markdown files.
- No database, no user accounts, no authentication.
- No comments system.
- No image optimization pipeline beyond "put images in a static folder" (can be added later).
- No multi-author support.
- No CMS-style admin dashboard.
- No search functionality in v1 (can be added later as a client-side index if the post count grows).
- No hosted/managed "create a site for me" web service — scaffolding is a local/CLI operation run by you, not a product with its own users or accounts.
- No cross-site features (no shared search across sites, no unified dashboard listing all your sites) in v1 — each site is fully independent at runtime; only the build-time engine is shared.