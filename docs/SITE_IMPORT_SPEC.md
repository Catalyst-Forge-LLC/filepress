# Spec: `downpress import` — migrate a site with Ollama-assisted restyle

**Status:** v1 implemented (pages + content import + optional Ollama token theme)  
**Date:** 2026-08-02 (updated 2026-08-03)  
**Command:** `downpress import`

### Defaults locked for v1

| Question | Decision |
| --- | --- |
| Static pages routing | Top-level `/[slug]` from `pages/*.md`; reserved: posts, tags, topics, page, feeds |
| URL parity | Clean break to `/posts/<slug>`; remaps listed in `.downpress-import/import-report.md` |
| Home | Posts index; source home bio → config `lede`; long About stays a page |
| Theme | Inspiration-first: extract fonts/palette/atmosphere from `--inspire`, then generate a punchy structural `theme.css` (dark forge, noise, tracked nav, elevated cards). Ollama refines; `--no-llm` still uses extracted inspiration. Source CSS is fallback only when no inspire URLs. |
| Framing | Downpress product feature (`@downpress/import`) |

This document fleshes out an interactive CLI that:

1. Asks a few questions (source site, inspiration sites, identity).
2. Walks the source site and extracts content + structure.
3. Samples inspiration sites (and optionally screenshots) for visual direction.
4. Uses a local Ollama model (`gemma4:12b`, vision-capable) to propose a design brief and a Downpress theme.
5. Scaffolds a **sibling content-only site** (reusing today’s `create-site --external` path) with posts, static pages, assets, config, and `theme.css`.

Reference case studied while drafting:

| Role | URL |
| --- | --- |
| Source (personal / essays) | https://example.com/ |
| Style inspiration (modern marketing) | https://www.catalystforge.com/ |

---

## 1. Why this is interesting

Downpress already has:

- Content-only site scaffold (`scripts/create-site.mjs --external`)
- Essay theme + Zen Garden override (`theme.css` / `theme.scss`)
- Config surface for title, nav, topics, newsletter, lede
- Installable CLI (`downpress` bin)

What’s missing for this story:

- **Static Markdown pages** (`/about`, `/contact`) — called out as a future escape hatch in `docs/SITE_PACKAGING_OPTIONS.md`, not shipped
- An **import / migrate** path that turns an existing site into a Downpress tree
- Any **LLM / Ollama** integration

The product pitch: “Point Downpress at your old site + 1–3 sites you like → walk away with a sibling repo you can `pnpm install && pnpm downpress dev`.”

---

## 2. Feasibility: example.com → Downpress

### Verdict: **high for content; medium for “awesome” without engine work**

[example.com](https://example.com/) is a small, well-structured **Astro → static HTML** site on Vercel. It is *not* a scrape nightmare. It is also already a polished editorial personal site (Fraunces + Sen, cream/gold palette) — more “migrate into Downpress + restyle” than “rescue from 2012 WordPress.”

### What’s easy

| Signal | Finding |
| --- | --- |
| Size | ~12 sitemap URLs; **5 essays** in RSS |
| Discovery | `robots.txt` → `sitemap-0.xml`; also `/rss.xml` |
| Routes | `/`, `/about/`, `/contact/`, `/writing/`, `/writing/<slug>/`, `/tags/<tag>/` |
| Posts | Semantic `<article class="article">`, title, subtitle, tags, dated meta |
| Feeds | RSS has title, link, description, `pubDate` — enough for frontmatter + excerpt |
| Assets | Favicons + (likely) headshot on home; fonts from Google Fonts today |
| Tone | Personal CPTO / board / AI-native essays — maps cleanly to Downpress “Essay” IA |

### Friction (important)

1. **Static pages are first-class on the source site** (About, Contact, Writing index copy). Downpress today is **posts + generated archives** only. Nav can point at `/about`, but there is no `pages/*.md` route yet. **Import without pages support produces a broken sibling site.**
2. **Home is a bio landing**, not a post index. Downpress index is the post listing (+ optional lede). Import must decide: bio as `pages/home` / special layout, lede-only, or posts-first with About holding the long bio.
3. **URL shape:** source posts live under `/writing/<slug>/`; Downpress uses `/posts/<slug>`. Need redirects plan or config for post base path (open question).
4. **Source is HTML, not Markdown.** Body extraction needs HTML→MD (Turndown / similar) with cleanup; LLM should *not* own the whole conversion for long essays (risk of rewrite/hallucination).
5. **“Essays” nav label vs `/writing` path** — SPA-ish naming; scraper must follow real hrefs / sitemap, not assume `/essays`.
6. **Inspiration site mismatch:** [catalystforge.com](https://www.catalystforge.com/) is a multi-section marketing landing (hero, services, process, CTAs). Blindly cloning that layout onto a personal essay site will fight Downpress’s Essay chrome. Vision/LLM should extract **tokens + typography + motion + density**, not try to reproduce CF’s section inventory.

### Difficulty estimate (for this reference pair)

| Slice | Effort | Notes |
| --- | --- | --- |
| Crawl + inventory from sitemap/RSS | S | Deterministic; no LLM required |
| HTML→MD posts + download images | S–M | Turndown + allowlist; 5 posts is a sweet test |
| Static pages feature in engine | M | Prerequisite for a real About/Contact |
| Interactive CLI + sibling scaffold | S | Extends `create-site --external` |
| Design brief via Ollama (text + screenshots) | M | Schema-validated JSON; human review gate |
| Auto-generated `theme.css` that looks “CF-modern” on Essay HTML | M–L | Hard part; iterate with preview, not one-shot |
| Generic importer for arbitrary WordPress / Wix / JS-heavy apps | L+ | Out of v1 scope |

**Bottom line:** For example.com specifically, a solid v1 is realistic once **static pages** exist. Ollama makes the restyle path fun; it should not be the content pipeline of record.

---

## 3. Goals / non-goals

### Goals (v1)

- Interactive wizard that produces a **sibling content-only site** next to the Downpress engine (same shape as today’s `--external` scaffold).
- Import **published posts** (title, date, tags, description/excerpt, body Markdown, local images).
- Import **static pages** into `pages/*.md` (engine support required).
- Generate `downpress.config.ts` (title, url, author, nav, topics from tags, lede/tagline).
- Generate a **first-pass `theme.css`** from a structured design brief (tokens + a few structural overrides), not a pixel clone.
- Local-first: **Ollama** at `http://localhost:11434`, default model `gemma4:12b`.
- Fail loud: crawl errors, missing Ollama, invalid model JSON, empty site → clear messages (no silent half-sites).
- Emit a **review artifact** (`import-report.md` + `design-brief.json`) before/alongside write.

### Non-goals (v1)

- Pixel-perfect recreation of inspiration sites
- Comments, CMS, or live sync from the old host
- Scraping behind auth / paywalls / heavy bot protection
- Replacing human editorial judgment (tone rewrites of essays)
- Shipping as a cloud SaaS “site factory”
- Supporting every CMS; v1 optimizes for **static / SSG sites with sitemap and/or RSS**
- Auto-deploy to Cloudflare (separate M3 track)

---

## 4. User experience

### Command

```bash
# From the Downpress engine repo (or anywhere if PATH has the bin):
pnpm downpress import
# or:
downpress import --source https://example.com --inspire https://www.catalystforge.com
```

### Wizard questions (proposed)

1. **Source site URL** (required) — e.g. `https://example.com`
2. **Inspiration URLs** (0–3) — e.g. `https://www.catalystforge.com`
3. **New site folder** — default sibling name derived from domain (`../example-site` or prompted)
4. **Site title / author / canonical URL** — prefilled from `<title>` / meta / RSS
5. **What to import** — posts, pages, assets (checkboxes; defaults all on)
6. **Home behavior** — `posts-index` | `bio-as-lede` | `page-as-home` (if we add home page support)
7. **Post URL prefix** — keep Downpress `/posts` vs future alias (v1: `/posts` + note redirects)
8. **Ollama** — host (default localhost), model (default `gemma4:12b`), allow offline/no-LLM theme skip
9. **Write mode** — `dry-run` (report only) → confirm → write files

Flags mirror every prompt for non-interactive use.

### Output tree (sibling)

```text
../example-site/                     # or user-chosen path
  package.json                   # downpress: link:../downpress (or github: pin)
  downpress.config.ts
  theme.css                      # generated first pass
  posts/
    2026-06-15-from-scaling-labor-to-scaling-trust.md
    …
  pages/                         # NEW engine capability
    about.md
    contact.md
  static/
    images/…                     # downloaded, rewritten links
    favicon-64.png
  .downpress-import/
    design-brief.json
    import-report.md
    crawl-cache/                 # optional, gitignored
```

After write:

```bash
cd ../example-site && pnpm install && pnpm downpress dev
```

---

## 5. Pipeline architecture

Hard rule (ForgeKit lesson): **code owns structure; the model fills typed slots.**

```text
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ 1. Discover │ →  │ 2. Extract   │ →  │ 3. Normalize    │
│ sitemap/RSS │    │ HTML→MD+meta │    │ SiteIR schema   │
│ + BFS links │    │ + assets     │    │ (validated)     │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                 │
┌─────────────┐    ┌──────────────┐    ┌─────────▼───────┐
│ 6. Write    │ ←  │ 5. Theme gen │ ←  │ 4. Design brief │
│ scaffold +  │    │ CSS from     │    │ Ollama (+vision │
│ files       │    │ brief+tokens │    │ screenshots)    │
└─────────────┘    └──────────────┘    └─────────────────┘
```

### Stage 1 — Discover (deterministic)

1. Fetch origin; parse `robots.txt` for sitemap.
2. Fetch sitemap(s); union with RSS/Atom if present.
3. Classify URLs: `home` | `post` | `page` | `tag` | `feed` | `other`.
4. Cap crawl (e.g. 200 pages) with clear “truncated” warning.
5. Prefer RSS for post inventory when available (example-site: perfect).

### Stage 2 — Extract (deterministic + libraries)

- Posts: main content selector heuristics (`article`, `[role=main]`, largest text block); strip nav/footer.
- HTML→Markdown via Turndown (or equivalent); preserve headings, lists, blockquotes, links, images.
- Frontmatter fields: `title`, `date` (from RSS/`<time>`/URL), `description`, `tags`, `slug`.
- Pages: same pipeline with `title` + body; slug from path (`about`, `contact`).
- Assets: download same-origin images referenced by imported content; rewrite to `/images/...`.
- Capture **computed style samples** (optional later): colors/fonts from CSS variables in `<style>` — example-site already exposes a rich `:root` token set in HTML.

### Stage 3 — SiteIR (validated JSON)

Internal intermediate representation, e.g.:

```ts
type SiteIR = {
  source: { url: string; generator?: string };
  identity: { title: string; description: string; author: string };
  posts: Array<{ slug: string; title: string; date: string; tags: string[]; description?: string; markdown: string; images: string[] }>;
  pages: Array<{ slug: string; title: string; markdown: string }>;
  nav: Array<{ label: string; href: string }>; // mapped into Downpress routes
  topics: Array<{ label: string; tag: string }>;
};
```

Validate with Zod (or similar) before any write. LLM never emits raw filesystem trees.

### Stage 4 — Design brief (Ollama)

Inputs:

- Compressed SiteIR identity + IA (not full essay bodies)
- Inspiration page text summaries (headings, nav, palette guesses from CSS)
- Optional **screenshots** (source home + writing; inspiration home) for vision model
- Downpress public theme contract (`docs/THEME.md` tokens + classes) — **injected by code into the prompt**

Output (JSON schema enforced; retry once on parse failure):

```ts
type DesignBrief = {
  mood: string;                 // short prose
  do: string[];                 // design moves to apply
  dont: string[];               // e.g. "don't add marketing section cards"
  tokens: {
    accent: string;
    accentStrong: string;
    bg?: string;
    text?: string;
    // …only keys that exist in Essay theme
  };
  typography: {
    displayHint?: string;       // e.g. "high-contrast sans, tight tracking"
    bodyHint?: string;
    // v1 may keep self-hosted Essay fonts; hints drive CSS letter-spacing/size
  };
  density: 'sparse' | 'balanced' | 'dense';
  cssNotes: string[];           // freeform tips for the CSS generator pass
};
```

If Ollama is down: skip to **token scrape from source CSS** + Essay defaults, still import content.

### Stage 5 — Theme generation

Two sub-modes (pick in open questions):

- **A (safer):** template `theme.css` filled only with `DesignBrief.tokens` + a few density rules.
- **B (ambitious):** second LLM pass that writes CSS constrained to selectors listed in `THEME.md`; reject unknown selectors / `@import` of remote CSS.

Recommend **A for v1**, B as experiment flag `--theme-llm`.

### Stage 6 — Write

1. Call existing scaffold logic (`create-site --external`).
2. Write posts/pages/static/theme/config.
3. Write `.downpress-import/import-report.md` (what was imported, skipped, URL mapping, manual follow-ups).
4. Optionally run `pnpm downpress build` in the sibling and report success/fail.

---

## 6. Engine prerequisite: static pages

Without this, the example-site case loses About/Contact and any home-as-page story.

### Proposed v1 pages model

- Site folder: `pages/**/*.md` (flat slugs: `about.md` → `/about`)
- Frontmatter: `title` (required), `description?`, `draft?`, `order?` (nav sort)
- Shared route: `packages/app/src/routes/[slug]/+page` **or** reserved `pages/[slug]` — must not collide with `posts`, `topics`, `tags`, `page`, feeds
- Sitemap + optional nav auto-include
- Index stays posts listing unless config `homePage: 'about'` (phase 2)

Exact routing design is an open question (§9); the import CLI should block or warn if pages are requested and the engine build doesn’t support them yet.

---

## 7. Ollama / vision details

| Item | Proposal |
| --- | --- |
| Endpoint | `OLLAMA_HOST` or `--ollama http://127.0.0.1:11434` |
| Default model | `gemma4:12b` |
| Vision | Screenshot key pages (Playwright or similar) → `/api/chat` with images |
| Temperature | Low (0.2–0.4) for JSON briefs |
| Timeouts | Generous; show spinner; never hang without message |
| Privacy | All local; document that page HTML/screenshots leave the machine only into Ollama |
| Fallback | `--no-llm` uses source CSS variables + Essay defaults |

Screenshot capture is optional but high leverage for “make it feel like CF, not paste CF’s copy.”

---

## 8. Suggested milestones

### M0 — Spike (1–2 days)

- Script: given `https://example.com`, emit SiteIR JSON (posts + pages markdown) to disk; no theme.
- Manual `create-site --external` + drop files; see what’s missing (pages!).

### M1 — Engine: `pages/*.md`

- Routes, sitemap, nav helpers, tests, docs.

### M2 — `downpress import` content path

- Wizard + discover/extract/write; dry-run; no LLM required.

### M3 — Design brief + theme.css

- Ollama integration; vision optional; token theme A; import-report.

### M4 — Polish

- Redirect map file for old `/writing/*` URLs; better home modes; `--theme-llm` experiment; fixture tests with recorded HTML (no live net in CI).

---

## 9. Open questions

### Product / scope

1. **Is this a general product feature or a Catalyst Forge “site rescue” tool that happens to live in Downpress?** Affects naming, docs tone, and how weird source sites we promise to support.
2. **Must the friend keep URL parity** (`/writing/...`, `/tags/...`) or is a clean break to Downpress URLs OK with a redirect map for Cloudflare?
3. **Home page model:** posts-first (Downpress default), bio landing, or configurable `homePage`?
4. **How “awesome” is success?** Ship a tasteful restyle + working content, or chase CF-level marketing motion on a personal site?

### Engine

5. **Static pages routing:** top-level `/[slug]` vs `/pages/[slug]`? Collision policy with reserved paths?
6. **Do we need MDX / custom components on pages**, or Markdown-only for v1?
7. **Post path prefix:** hardcode `/posts` forever, or make it configurable (`/writing`)?

### Import / crawl

8. **Respect `robots.txt` Disallow?** (Default yes for courtesy; source site may allow all.)
9. **Max pages / max bytes** defaults?
10. **Off-origin images** (CDN portraits): download, hotlink, or skip?
11. **Tag pages:** recreate via Downpress tags only (yes for v1)?

### LLM / design

12. **Inspiration sites: scrape text+CSS only, or always screenshot for vision?**
13. **May we fetch inspiration HTML at all?** (ToS / ethics — CF is ours; third-party inspiration may need “user attests they have rights / public pages only.”)
14. **Font strategy:** keep Downpress self-hosted Essay fonts, download inspiration fonts (licensing!), or only adjust size/weight/tracking?
15. **Theme pass A vs B** for v1?
16. **Human approval gate:** always show brief + sample CSS in terminal/pager before write?

### CLI / packaging

17. **Where does import code live?** `scripts/import/` in engine vs `@downpress/import` package?
18. **Sibling default location:** always `../<slug>` next to engine, or next to cwd?
19. **Node APIs:** keep CLI as plain `.mjs` or move import pipeline to TypeScript in `packages/`?
20. **CI:** offline fixtures only — agree we never call live Ollama or the public internet in default tests?

### Reference-site specific

21. **example-site already looks intentional** — is the friend unhappy with visual design, with the Astro/Vercel workflow, or with maintenance? (If workflow-only, import+theme can be lighter.)
22. **Contact page:** static content only, or expect a form endpoint? (Downpress won’t host form backends; link to Formspree/etc.)
23. **Newsletter / podcast links** on source — map into `newsletter` config or leave as page prose?

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| LLM rewrites essays | HTML→MD in code; LLM never sees full bodies in v1 brief pass |
| LLM emits broken CSS | Token template (A); selector allowlist; build must pass |
| Hallucinated pages/posts | Only write URLs discovered in crawl/RSS |
| Inspiration clone looks like a consulting landing page | Brief `dont[]`; personal-site system prompt |
| Scope explosion (WordPress plugin soup) | Explicit “SSG/static + sitemap/RSS” support matrix |
| Pages feature slips | Gate import of pages; or ship M1 first |
| Ollama flaky / slow | Timeouts, retries, `--no-llm` path |

---

## 11. Success criteria (reference case)

For a dry run against https://example.com/ with inspiration https://www.catalystforge.com/:

1. SiteIR contains **5 posts** with plausible dates/tags and Markdown bodies that preserve headings and links.
2. **About** and **Contact** land as pages (once M1 ships).
3. Config nav roughly: Home / About / Writing(or Posts) / Contact; topics from the three tags.
4. `theme.css` changes accent/background/type density enough that a side-by-side screenshot is visibly different from stock Essay — without copying CF marketing sections.
5. `pnpm downpress build` in the sibling exits 0.
6. Import report lists URL remaps and manual TODOs (redirects, contact form, photo crop).

---

## 12. Recommendation

**Do it — in layers — with pages first.**

1. Agree on open questions **5, 2, 3, 15, 1** (pages routing, URL parity, home, theme safety, product framing).
2. Spike M0 on example.com to prove extract quality in a day.
3. Implement **static pages** (M1) so the friend’s real IA fits.
4. Ship **content import** without LLM (still very useful).
5. Add Ollama design brief + token theme as the “delight” layer.

The idea is sound. The scrape for this particular source site is unusually favorable (sitemap + RSS + semantic articles + tiny corpus). The hard product work is **IA mapping (home + pages)** and **tasteful constrained theming**, not “can we download the HTML.”
