# Downpress — Site packaging options

**Status:** draft for decision (2026-07-25)  
**Context:** After M4 (pnpm monorepo + `@downpress/core`), each site is still a full SvelteKit app. Route and shell files are duplicated verbatim across sites. This doc compares options against the goal: **link Downpress, configure the bare minimum, deploy static build output.**

Related: `GENESIS.md` §2.6 (core vs site), D3/D4/D5/D10 in `.forgekit/workflow_tracking.json`, current layout in `CONTEXT_PROMPT.md`.

---

## 1. Problem

### What a site owns today

| Layer | Where it lives | Site-specific? |
| --- | --- | --- |
| Identity | `downpress.config.ts` | Yes |
| Content | `posts/*.md` | Yes |
| Assets | `static/` | Mostly yes (favicon, images) |
| Content wiring | `src/lib/content.server.ts` | No (same pattern every site) |
| Routes | `src/routes/**` (~20 files) | **No — identical between example-site and demo** |
| App shell | `app.html`, `app.d.ts`, `+layout.*` | Effectively no |
| Tooling | `package.json`, `vite.config.ts`, `tsconfig.json` | Mostly no (only package `name` differs) |

Empirically: `diff -rq sites/example-site/src sites/demo/src` is empty. The “thin site” is still ~20 route files + Vite/Kit boilerplate copied by the scaffold. Every engine change that touches a route must be replayed into every site (or regenerating the scaffold and re-diffing).

That conflicts with the original intent in GENESIS §2.6 / §3:

> Site-specific code should be minimal: content, a small config file … and thin wiring that pulls in core.

### Deploy goal (unchanged)

- Build produces a **static folder** (`adapter-static`).
- Cloudflare Pages (or any static host) serves that folder.
- Push → build → live. No Node runtime on the edge for v1.
- Custom domain at site root (no base path).

Deploy always consumes **built HTML**, not the SvelteKit source tree. The packaging question is only: *where does the SvelteKit app live, and what must a site author check in?*

### Hard constraint (still true)

SvelteKit’s router and Vite root are **per project**. You cannot share one `src/routes` tree across two independent SvelteKit apps without either:

1. Duplicating those files into each app, or  
2. Making the **engine** the only SvelteKit app and treating sites as **content + config** inputs to that app.

There is no clean “import routes from `node_modules`” first-class API. Approaches below either accept duplication, generate it, or move the Kit app into Downpress.

---

## 2. Goals and non-goals

### Goals

1. **Minimal site surface:** a new site should be roughly `downpress.config.ts` + `posts/` + optional `static/` (+ dependency / one-line scripts).
2. **Single place for routes:** index, posts, tags, topics, feeds, pagination live in one package; engine updates propagate without copying files.
3. **Independent deploy:** each site builds to its own static output; building A never mutates B.
4. **Phone-friendly content:** posts stay plain Markdown at a top-level `posts/` (D6).
5. **Pinable engine:** sites can pin a Downpress version (git SHA / tag / workspace) so core bumps are deliberate (D4/D10).
6. **Static deploy:** CF Pages (or equivalent) gets a directory of files — no SSR requirement.

### Non-goals (for this decision)

- Multi-tenant runtime (one deploy serving many domains).
- Publishing to public npm (scoped private/git dep is fine).
- Per-site custom route trees as a first-class v1 feature (escape hatch can exist later).
- Theme marketplace; theme *selection* may come later (D9) but is orthogonal.

---

## 3. Options

### Option A — Status quo: thin SvelteKit app per site (current)

**Shape**

```
packages/core/          # content API, components, theme, feeds
sites/<name>/           # full SvelteKit app
  downpress.config.ts
  posts/
  src/routes/…          # duplicated boilerplate
  vite.config.ts
  package.json          # depends on @downpress/core
```

**Site author edits:** config, posts, static; theoretically routes, but they shouldn’t.

**Deploy:** CF Pages root = monorepo; build `pnpm --filter <site> build`; output `sites/<site>/build`.

| Benefits | Tradeoffs |
| --- | --- |
| Works today; Kit-native mental model | Route/shell duplication across every site |
| Easy per-site escape hatch (edit a route) | Engine route changes require multi-site sync or re-scaffold |
| Clear “each site is a package” | Site looks like an app, not “content + config” |
| `workspace:*` DX in monorepo | Independent site repo still needs ~20 files of Kit glue |

**Fit to “bare minimum”:** Poor. Scaffold hides creation cost; maintenance cost remains.

---

### Option B — Generated routes (scaffold-owned, not hand-maintained)

**Shape:** Same as A, but sites treat `src/routes` as **generated** (like lockfile / `.svelte-kit`). Scaffold or `downpress sync` overwrites them from a template in core. Site repo may gitignore routes, or commit them as “vendored” output.

| Benefits | Tradeoffs |
| --- | --- |
| Sites stay deployable Kit apps | Still many files on disk (noise in PRs / GitHub mobile) |
| Sync command can refresh all sites | Conflict if someone hand-edits a route |
| Smaller conceptual jump from A | Doesn’t shrink “what you link”; still a Kit project per site |

**Fit to “bare minimum”:** Medium for authors who never open `src/`; poor for repo cleanliness.

**Verdict:** Temporary mitigation, not the end state if the goal is a content-only site.

---

### Option C — Content sites + one SvelteKit app in the monorepo (recommended for this repo)

**Shape**

```
packages/core/          # library (content, components, theme, feeds)
packages/app/           # THE SvelteKit project (all routes live here once)
sites/<name>/           # NOT a SvelteKit package
  downpress.config.ts
  posts/
  static/               # optional
```

**Build / dev**

```bash
pnpm downpress dev  --site example-site
pnpm downpress build --site example-site
# → writes sites/example-site/build/  (or dist/<site>/)
```

Implementation sketch:

- `packages/app` is the only Kit app.
- CLI (or root scripts) sets `DOWNPRESS_SITE_ROOT` / `DOWNPRESS_CONFIG` to `sites/<name>`, points `createContent({ contentDir })` at that site’s `posts/`, aliases `$site-config` to that site’s `downpress.config.ts`, and merges or copies `static/` into the build.
- Vite root stays `packages/app`; site content is outside the app via absolute paths / env (already close to today’s `DOWNPRESS_CONTENT_DIR` seam).

**Deploy (monorepo, per site):** same host story as today — one CF Pages project per site, build command selects `--site`, output directory is that site’s `build/`.

| Benefits | Tradeoffs |
| --- | --- |
| Routes exist once; zero per-site route drift | Sites are no longer standalone packages |
| Site surface ≈ config + posts + static | Local “cd into site and pnpm dev” needs a wrapper script |
| Matches “configure bare minimum” inside this repo | Custom per-site routes need an explicit escape hatch later |
| Deploy still static folder per site | CF must build from monorepo root (already true) |
| Reuses existing core DI (`createContent`, `defineDownpressConfig`) | Need a small CLI/`--site` convention and tests for path resolution |

**Fit to “bare minimum”:** Strong **inside the monorepo**.

**Independent site repo later:** either keep using Option D’s CLI against a content-only repo, or vendor a one-line `package.json` that only calls the CLI (see D).

---

### Option D — Downpress as an app/CLI dependency (Astro / VitePress-like)

**Shape of a site (ideal end state, including external repos)**

```
my-blog/
  package.json          # "downpress": "github:…/downpress#v0.x" or workspace
  downpress.config.ts
  posts/
  static/
```

```json
{
  "scripts": {
    "dev": "downpress dev",
    "build": "downpress build"
  },
  "devDependencies": {
    "downpress": "…"
  }
}
```

The published (or git-linked) package embeds:

- `@downpress/core` (engine)
- The SvelteKit app (`packages/app`)
- A `downpress` bin that runs Vite/Kit with `cwd` = the site root

**Deploy**

| Setting | Value |
| --- | --- |
| Build command | `pnpm install && pnpm build` (i.e. `downpress build`) |
| Output directory | `build` (at site root) |
| Env vars | None required if config + posts are in-repo |
| Runtime | Static files only |

| Benefits | Tradeoffs |
| --- | --- |
| True “link Downpress + config + posts” | Must solve: resolve site root, load TS config, map `static/`, HMR for out-of-package `posts/` |
| External site repos stay tiny | Packaging complexity (bin, peer deps on Svelte/Vite, Windows paths) |
| Engine upgrades = bump dependency | Debugging “my site” means stepping into `node_modules/downpress` |
| Aligns with GENESIS scaffold story (`create-site` emits content-only tree) | Harder to customize routes without fork/plugin API |
| Deploy story is simplest possible | Version pinning discipline becomes mandatory (D4) |

**Fit to “bare minimum”:** Best match to the stated ideal.

**Relationship to C:** C is the in-monorepo form of the same architecture; D is the packaging/distribution form. Implement C first, then expose the same app via a `downpress` binary for D.

---

### Option E — Symlink / patch routes from core into each site

Copy or symlink `src/routes` from `packages/core` or `packages/app` into each site at install time.

| Benefits | Tradeoffs |
| --- | --- |
| Keeps per-site Kit projects | Symlinks are fragile on Windows; pnpm/`file:` quirks |
| | Still looks like a full app per site |
| | Worse DX than C/D for little gain |

**Verdict:** Reject for primary path.

---

### Option F — Single deploy, multi-site runtime switch

One Cloudflare project; host header or path selects content. Contradicts D5 (custom domain per site, independent deploy) and “building A doesn’t touch B” as separate products.

**Verdict:** Out of scope / reject for v1.

---

## 4. Comparison matrix

| Criterion | A Current | B Generate | C App + content sites | D CLI package |
| --- | --- | --- | --- | --- |
| Site files author cares about | Config, posts, *plus ignore src* | Config, posts | Config, posts, static | Config, posts, static, tiny package.json |
| Route duplication | High | High on disk, low intent | None | None |
| Engine update cost | Sync N sites | Run sync | Rebuild | Bump dep + rebuild |
| Per-site route escape hatch | Easy | Hard (regen fights you) | Needs design | Needs plugin/fork |
| Monorepo DX | OK | OK | Best | Good (sites call CLI) |
| External site repo DX | Heavy scaffold | Heavy scaffold | N/A alone | Best |
| CF Pages complexity | Filter + deep output path | Same as A | `--site` + output path | Trivial (`build` → `build/`) |
| Implementation effort from today | — | Small | Medium | Medium–high (after C) |
| Risk | Drift (already felt) | Accidental edits | Path/config wiring bugs | Packaging + Windows |

---

## 5. Recommendation

**Target architecture: C now, D as the distribution shape.**

1. **Promote routes into `packages/app`** — one SvelteKit application owned by Downpress.
2. **Demote `sites/*` to content packages** — only `downpress.config.ts`, `posts/`, `static/`, and maybe a one-line README. Remove per-site `src/routes`, `vite.config.ts`, and site-local Kit deps.
3. **Add a thin CLI / root scripts** — `downpress dev|build --site <name>` (monorepo) that injects site root into the app (config alias, content dir, static assets, output dir).
4. **Keep `@downpress/core` as the library** — app depends on core; sites do not need to import core directly.
5. **Later (D):** publish or git-depend the CLI so an external repo is only config + posts + `package.json` scripts. Scaffold (`create-site`) emits that minimal tree.
6. **Deploy remains “built static folder”** — never deploy source; CF Pages output dir = that folder. Document per-site CF project settings once the CLI stabilizes.

### Why not stay on A

Duplication is already complete between two sites. A third site multiplies dead weight. The user’s ideal (“link Downpress and configure the bare minimum”) is Option D; A cannot get there without pretending `src/routes` doesn’t exist.

### Why not jump straight to D

D’s hard parts (bin entry, resolving consumer `cwd`, TS config load, static merge, CI matrix) are the same as C’s, plus packaging. Land the app/content split in-repo first, prove `example-site` and `demo` builds, then wrap the binary.

### Escape hatch (record as future)

If a site needs a custom page (e.g. `/about` with bespoke layout):

- **v1:** optional `sites/<name>/pages/*.md` or a reserved content type, still rendered by shared routes; or  
- **later:** `sites/<name>/overrides/routes` merged by the CLI (explicit, opt-in), not forked copies of the whole tree.

Do not preserve full Kit apps per site just for this hypothetical.

---

## 6. Deploy implications (all viable options)

| Concern | Guidance |
| --- | --- |
| What CF hosts | Only `build/` (static). No server. |
| What `downpress.config.ts` must have | Correct canonical `url` (feeds/sitemap/SEO). Not CF credentials. |
| Secrets | None required for standard sites. |
| Monorepo (A/B/C) | Root directory `/`; build selects site; output `sites/<name>/build`. |
| Content-only + CLI (D) | Root = site repo; `pnpm build` → `build/`. |
| Preview vs production | CF preview deployments fine; production custom domain must match `url`. |

No packaging option changes the **runtime** model — only **who owns the SvelteKit project** and **how small the site git tree is**.

---

## 7. Migration sketch (A → C)

1. Create `packages/app` by lifting routes/shell from `sites/example-site`.
2. Wire site injection: `DOWNPRESS_SITE_ROOT` → config path, `posts/`, `static/`, output dir.
3. Root scripts: `dev:nth`, `build:nth` call the app with `--site`.
4. Delete `sites/*/src`, site `vite.config.ts`, site Kit dependencies; leave config + posts + static.
5. Update `create-site.mjs` to emit content-only sites.
6. Update README / CONTEXT_PROMPT / CF deploy notes.
7. Verify: both sites build independently; demo still hides drafts/future posts; typecheck + core tests green.
8. (Follow-up) CLI bin + document external-repo layout (D).

Do **not** advance ForgeKit phase solely for this; treat as an architecture iteration under current phase, with an explicit user go-ahead before large moves.

---

## 8. Decision checklist

When choosing, confirm:

- [ ] Accept that sites are **not** SvelteKit apps (C/D), OR accept ongoing route duplication (A/B).
- [ ] Monorepo-only for now (C) vs need external content-only repos soon (prioritize D packaging).
- [ ] Whether any site needs custom routes in the next 1–2 sites (drives escape-hatch urgency).
- [ ] CF Pages: keep one project per site with filter/output paths (C) vs simplify to site-root `build/` (D / split repos).

**Proposed default if no strong constraints:** proceed with **Option C**, keep **Option D** as the documented end-state for “link and configure.”

---

## 9. Lessons applied while drafting

- Plan before multi-file refactors (this doc is that plan gate).
- Prefer one structural owner for templates/routes (avoid N-way sync) — same lesson as “code owns structure.”
- After any chosen migration: build both sites and smoke-test feeds/drafts, not only `svelte-check`.
- Keep site identity validation loud (`defineDownpressConfig`) regardless of packaging.
