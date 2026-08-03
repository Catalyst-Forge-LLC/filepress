# Spec: Downpress Assistant Mode

**Status:** draft (defaults proposed; open questions in §11 awaiting user lock)  
**Date:** 2026-08-03  
**Phase:** 4-feature-iteration  
**Related:** [THEME.md](./THEME.md) · [SITE_IMPORT_SPEC.md](./SITE_IMPORT_SPEC.md)

---

## 1. Problem / why this exists

Downpress is intentionally simple: **git-native Markdown**, a shared Essay layout, and a Zen Garden `theme.css`. Import already bootstraps a strong first look from source + inspiration + optional Ollama.

What’s missing is a **local loop after import**: authors want to say “try a different background,” “more gold, less navy,” “base this on another site,” or “show me the last three looks” without leaving the browser—or learning the DesignBrief / CSS generator internals.

**Assistant Mode** is that loop: a **dev-only** design cockpit that keeps Downpress simple in production while making authoring dramatically more powerful locally.

### Product thesis

| Keep | Add |
| --- | --- |
| Markdown posts/pages as the source of truth | Local steers for look + limited chrome config |
| `theme.css` + `static/` + `downpress.config.ts` as the baked artifacts | Versioned experiments under `.downpress-assistant/` |
| Static deploy with no runtime CMS | Panel + APIs that **never ship** in `build/` or `preview` |
| Code owns structure; LLM fills slots | Same DesignBrief → `themeCssFromBrief` path as import |

Assistant Mode is **not** WordPress, **not** a hosted theme marketplace, and **not** a visitor-facing chatbot.

---

## 2. Non-goals

- **No production / preview assistant.** Toolbar, routes, and APIs must be absent from `pnpm downpress preview` and adapter-static output.
- **No visitor comments** (permanent Downpress non-goal).
- **No multi-user collab** or hosted sync of versions (v1).
- **No Markdown content editing** in v1 (posts/pages stay hand-edited in git).
- **No freeform model-written CSS/JS** injected into the page. Only validated brief → generator.
- **No permanent fork of Essay HTML.** Zen Garden rules remain: stable public classes from [THEME.md](./THEME.md).

---

## 3. User journeys

### J1 — Change background with direction

1. Author runs `pnpm downpress dev` on a content site.
2. Opens Assistant panel → “New background: dark abstract with warm gold dust.”
3. Engine turns direction into an Openverse query (and/or brief image slots), downloads into a **new version**, previews via activate + HMR.
4. Author keeps or rolls back via the version rail.

### J2 — Style / font / color / layout steers

1. Author uses chips or natural language: “denser,” “Instrument Serif + Outfit,” “wider measure,” “bold hero,” “uppercase nav.”
2. Steers map to DesignBrief fields; generator rewrites `theme.css` for a new snapshot.
3. Live reload shows the change on the real site.

### J3 — Base on a different site

1. Author pastes 1–3 inspiration URLs (same cap as import).
2. Panel reuses the import inspire pipeline (signals → brief blend).
3. New version captures the blended look; prior version remains selectable.

### J4 — Toggle versions, then publish

1. Author flips between versions A/B/C (activate).
2. Favorite is left active (working tree files match).
3. `pnpm downpress build` (and deploy) uses those files—**no assistant code in the artifact**.

### J5 — Offline / no LLM

1. Ollama is down or disabled.
2. Deterministic steers still work: presets, Openverse, inspire crawl, token pickers.
3. Panel shows a clear status: “LLM offline — structured steers only.”

---

## 4. Dev-only runtime contract

| Command | Assistant UI | Assistant APIs | Site files |
| --- | --- | --- | --- |
| `pnpm downpress dev` | Yes (default on when DEV) | Yes (Vite middleware / local-only) | Writable |
| `pnpm downpress preview` | No | No | Read-only serve of `build/` |
| `pnpm downpress build` | No (not bundled) | No | Reads active working-tree theme/config/static |
| Deployed Pages/CDN | No | No | Static only |

**Gates**

- Client: mount panel only when `import.meta.env.DEV` (optional override `DOWNPRESS_ASSISTANT=1` for explicit force-on in dev tooling; never in PROD builds).
- Server/middleware: register only in Vite `configureServer` (dev plugin)—not in adapter-static output.
- Conditional dynamic `import()` so production client bundles tree-shake the panel away.

**Port / process**

- Assistant rides the same Vite dev server as the site (no second public port required for v1).
- All mutating endpoints are localhost-bound and refuse non-dev.

---

## 5. Data model

### 5.1 DesignBrief (shared with import)

Assistant Mode **extends and reuses** the import `DesignBrief` (see `@downpress/import` / `packages/import/src/ir.ts`). Code owns generation via `themeCssFromBrief` (and successors). The LLM may only propose JSON that validates against the brief schema.

v1 steerable slots (non-exhaustive):

| Slot | Examples |
| --- | --- |
| `tokens.*` | accent, bg, ink, surface, rules |
| `paletteMode` | `dark` / `light` |
| `fonts` | serif / sans / mono + optional Google href |
| `density` | sparse / balanced / dense |
| `hero` | editorial / bold |
| `atmosphere` | none / noise |
| `navStyle` | soft / uppercase-tracked |
| `elevatedCards` | boolean |
| `images` | background / header / hero / logo / portrait paths |
| `mood`, `do`, `dont`, `cssNotes` | guidance for LLM + report |

**Portraits are never CSS covers** (lesson from import). Atmosphere covers prefer Openverse CC0, not inspiration-site marketing photos.

### 5.2 Config patch (limited)

v1 may propose a **config patch** (not a full rewrite of `downpress.config.ts`):

| Key | v1 default |
| --- | --- |
| `lede` | yes |
| `tagline` | yes |
| `logo` | yes (path only) |
| `nav` | labels/order only; no arbitrary new routes inventing pages |
| `topics` | labels only; tags must already exist in content unless author confirms |
| `newsletter` | defer (open question) |
| `title` / `url` / `author` | **no** auto-change without explicit confirm |

Patches are stored per version; activate merges into `downpress.config.ts` through a code-owned printer (not LLM-authored TS).

### 5.3 Version snapshots

Site-local store (recommended path):

```text
.downpress-assistant/
  active.json
  versions/
    <versionId>/
      meta.json
      design-brief.json
      theme.css
      config-patch.json      # may be {}
      images/                # chrome assets for this version
      attribution.md         # Openverse / stock credits
```

**`active.json`**

```json
{
  "versionId": "2026-08-03T14-22-01Z-a1b2",
  "activatedAt": "2026-08-03T14:25:00.000Z"
}
```

**`meta.json`**

```json
{
  "id": "2026-08-03T14-22-01Z-a1b2",
  "createdAt": "2026-08-03T14:22:01.000Z",
  "parentId": "2026-08-03T14-10-00Z-9c0d",
  "label": "Dark gold · abstract particles",
  "starred": false,
  "prompt": "More gold, softer background texture",
  "steers": [{ "type": "stock_background", "query": "abstract dark gold texture" }],
  "inspireUrls": [],
  "llm": { "used": true, "model": "gemma4:12b", "host": "http://127.0.0.1:11434" }
}
```

**Version id:** UTC timestamp + short random suffix (filesystem-safe).

**Lineage:** `parentId` enables a simple history DAG (linear UI is enough for v1).

### 5.4 Working tree vs snapshot

| Layer | Role |
| --- | --- |
| Snapshot under `.downpress-assistant/versions/*` | Immutable-ish experiment (may allow delete) |
| Site root `theme.css`, `static/images/*`, `downpress.config.ts` | **Active** look the Vite app and `build` consume |

**Activate** copies snapshot → working tree (theme + images + config merge). Dev HMR / reload shows the result.  
**Build** does not read the version store unless activate already synced—keeps today’s mental model: “what’s in the site folder is what publishes.”

---

## 6. UI surface

### 6.1 Information architecture (v1)

**Recommended default:** floating control (bottom-right or bottom-left) → **drawer/panel** over the live site. The site remains the canvas; the panel is chrome.

Alternative (open question): dedicated local-only route `/__assistant`—rejected as default because it breaks “edit what you see.”

**Panel regions**

1. **Composer** — free-text prompt + Send; optional “Apply as new version.”
2. **Steers** — chips/forms bound to brief slots (palette, density, hero, measure hint, atmosphere, accent swatch, “New background…”, “Inspire URL…”).
3. **Version rail** — list with label, relative time, star, Activate, Duplicate, Delete; parent hint.
4. **Status** — Ollama reachability, last error (verbose), stock attribution link for active version.

Collapsed by default so Essay reading isn’t dominated by tooling.

### 6.2 Compare / toggle

v1: **fast activate toggle** between versions (A → B → A). Good enough for taste decisions.  
v2 stretch: split-pane or screenshot diff—out of scope until v1 ships.

### 6.3 Tone

Sparse, high-trust, local-tooling—not a marketing chatbot. Prefer concrete steers over chatty filler. Errors quote the underlying failure (Ollama connection refused, Openverse 429, brief validation path).

---

## 7. Agent loop

### 7.1 Principle

**Code owns structure; the model fills slots.** Same anti-pattern avoidance as import and ForgeKit lesson on structured documents.

```text
User prompt / steers
    → (optional) Ollama: propose DesignBrief delta + stock query + config patch
    → validate / merge into brief
    → deterministic tools: fetch_stock | sample_inspire | generate_theme | write_snapshot
    → optional auto-activate or “Preview” then Activate
```

### 7.2 Deterministic tools (always available)

| Tool | Purpose |
| --- | --- |
| `update_brief` | Merge validated partial brief into current |
| `fetch_stock` | Openverse CC covers from a query; write images + attribution |
| `sample_inspire` | Crawl 1–3 URLs → inspiration signals → brief blend (reuse import) |
| `generate_theme` | `themeCssFromBrief` → `theme.css` bytes |
| `write_snapshot` | Persist version directory + meta |
| `activate_version` | Sync snapshot → working tree |
| `list_versions` / `get_version` | Panel data |

### 7.3 LLM role (Ollama)

- Input: site identity summary, current brief, user prompt, allowed slot schema.
- Output: JSON brief delta only (parse + validate; reject unknown keys / invalid colors).
- On failure: fall back to deterministic interpretation of steers; show error in panel.
- Default model/host: align with import (`OLLAMA_HOST`, `DOWNPRESS_OLLAMA_MODEL`).

### 7.4 Shared package shape

Prefer extracting shared design primitives so CLI import and Assistant don’t diverge:

- Keep generators in `@downpress/import` **or** promote a thin `@downpress/design` used by both.
- App depends on that module only from **dev middleware** / assistant server code paths—not from prerendered pages.

---

## 8. Bake / git workflow

```text
dev: prompt → snapshot → activate → working tree → HMR
git: author commits theme.css / static / config when happy
build: unchanged pipeline reads site root files → static build (no assistant)
```

**Recommended defaults**

- **Activate overwrites** working-tree `theme.css` and relevant `static/images/{background,header,hero,logo}.*` immediately (simple, matches “what I see is what I build”).
- Before first assistant write, copy current `theme.css` into a version labeled `baseline` so undo is one activate away.
- `.downpress-assistant/` **gitignored by default** (local scratch); authors commit baked files. (Open question if experiments should be shareable.)

**Explicit “Use for build” gate** is unnecessary if activate already syncs the working tree; avoids two sources of truth.

---

## 9. Security & trust boundaries

| Risk | Mitigation |
| --- | --- |
| Assistant ships to production | DEV-only mount + Vite-dev middleware only; verify absent from `build/` in acceptance tests |
| Prompt injection → arbitrary file write | Tools may write only under site root allowlist: `theme.css`, `downpress.config.ts`, `static/images/`, `.downpress-assistant/` |
| SSRF via inspire URL | Reuse import fetch constraints (http/https, timeouts, size caps); no `file:` |
| Malicious CSS/JS from model | No raw CSS from model; generator emits from typed brief |
| Stock license surprises | Prefer CC0/PDM; write `attribution.md` per version; surface in panel |
| Local API abuse | Bind to loopback; no auth v1 (trust local machine); refuse if `import.meta.env.PROD` |

---

## 10. Milestones

### M0 — Spike (½–1 day)

- Dev-only floating stub panel that reads site title.
- Vite plugin stub endpoint `GET /__downpress/assistant/health`.
- Prove panel absent from a production client build (grep / bundle check).

### M1 — Versions + activate (no LLM)

- Snapshot current theme as `baseline`.
- Steers: palette tokens, density, hero, atmosphere, measure via brief → generator.
- Openverse “new background” with query box.
- Version rail + activate → working tree + HMR.
- Attribution file per version.

### M2 — Inspire + Ollama

- “Base on URL” → import inspire blend → new version.
- Ollama brief refinement with deterministic fallback.
- Config patch for lede / tagline / logo.

### M3 — Polish + harden

- Star/label/duplicate; baseline restore; verbose errors.
- Acceptance tests (dev-only gating, allowlisted writes).
- Docs in README / THEME; create-site note that Assistant is local-only.

---

## 11. Open questions (answer to lock before implementation)

Recommended defaults are marked **(rec)**. Confirm or override.

| # | Question | Options | Rec |
| --- | --- | --- | --- |
| Q1 | **Mutation scope** | A theme-only · B theme + limited config · C full Markdown | **B** |
| Q2 | **Brain** | A Ollama-only · B Ollama + deterministic fallbacks · C deterministic-first, LLM later | **B** |
| Q3 | **Version store in git** | A gitignore `.downpress-assistant/` · B commit-friendly experiments | **A** |
| Q4 | **Activate semantics** | A overwrite working tree on activate · B keep `theme.css` as published until explicit bake | **A** |
| Q5 | **Panel IA** | A floating button + drawer · B dedicated `/__assistant` route | **A** |
| Q6 | **Inspire from panel** | A live URL crawl · B only reuse last import signals | **A** |
| Q7 | **Image direction** | A free-text → Openverse only · B also local upload into a version | **A** for v1; **B** soon after |
| Q8 | **Config keys in scope** | Which of: lede, tagline, logo, nav, topics, newsletter? | **lede, tagline, logo**; nav/topics later; newsletter out |
| Q9 | **Multi-site state location** | Always under content site root (incl. external siblings)? | **Yes** |
| Q10 | **Name** | Assistant Mode · Design Mode · Studio | **Assistant Mode** (UI label can say “Design”) |

Reply with e.g. `Q1=B, Q2=B, …` or “all recs” to lock.

---

## 12. Acceptance criteria

1. **Dev-only:** With `pnpm downpress dev`, panel can open; with `pnpm downpress preview` after build, no panel, no `/__downpress/assistant/*` handlers, no assistant strings in client bundles (automated check).
2. **Steer loop:** Changing accent (or equivalent steer) creates a new version and, on activate, updates on-page styles without restarting Vite.
3. **Stock background:** Prompt/steer for a new background yields a local file under `static/images/` (or version images synced on activate) plus attribution; not an inspiration-site hotlink.
4. **Inspire:** Providing a URL produces a visibly different brief/theme version without copying multi-section marketing HTML into the index.
5. **Rollback:** Activating `baseline` (or prior version) restores the previous look.
6. **Build purity:** `pnpm downpress build` exits 0; output contains baked CSS/assets only; comments remain impossible.
7. **Failure UX:** Stopping Ollama mid-prompt shows a human-readable error and still allows deterministic steers.
8. **Simplicity preserved:** Authors can ignore Assistant Mode entirely and keep editing `theme.css` by hand; hand edits become the next `baseline` when the panel first opens (or on explicit “Snapshot current”).

---

## 13. Possibilities beyond v1 (parked)

These are intentionally **not** committed—useful north stars that must not dilute v1:

- Split-pane or screenshot compare between versions.
- Cloud OpenAI-compatible providers as opt-in.
- Local image upload / crop for portrait vs cover roles.
- “Seasonal” scheduled looks (still baked files, not runtime).
- Export a version as a portable `theme.css` pack for another Downpress site.
- Vision model: “make it more like this screenshot” (Ollama vision).
- Constrained layout presets beyond today’s structural flags (e.g. measure-wide presets library).
- Git integration: optional “commit active look” helper (message only; no force).
- Content-aware steers that **suggest** Markdown changes but require explicit apply (still not auto-CMS).

---

## 14. Recommendation

**Build it—in layers—with M0 gating proof first.**

Assistant Mode is the natural second act after import: import gets you 80% of a look; Assistant Mode is the taste loop that makes Downpress feel like a product, not a compiler. The constraint that keeps the brand honest is the same as import: **structured briefs, code-owned CSS, git-native bake, zero production runtime.**

1. Lock §11 open questions (or accept all recs).
2. Ship M0 (dev-only proof).
3. Ship M1 (versions + stock + steers, no LLM required).
4. Ship M2 (inspire + Ollama).
5. Harden with M3 acceptance checks before calling the feature “done.”
