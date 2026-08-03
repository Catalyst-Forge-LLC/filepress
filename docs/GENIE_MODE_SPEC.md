# Spec: Downpress Genie Mode

**Status:** locked — M0/M1 implemented (2026-08-03)  
**Date:** 2026-08-03  
**Phase:** 4-feature-iteration  
**Related:** [THEME.md](./THEME.md) · [SITE_IMPORT_SPEC.md](./SITE_IMPORT_SPEC.md)  
**Former working title:** Assistant Mode (see [ASSISTANT_MODE_SPEC.md](./ASSISTANT_MODE_SPEC.md) redirect)

**M0/M1 surface:** floating Genie drawer in `pnpm downpress dev`; APIs under `/__downpress/genie/*` via Vite plugin (`apply: 'serve'` only); versions in `.downpress-genie/`.

---

## 0. Locked decisions

| # | Decision |
| --- | --- |
| Q1 Mutation scope | **Theme + limited config** (no Markdown posts/pages in v1) |
| Q2 Brain | **Ollama + deterministic fallbacks** (steers/stock/inspire work offline) |
| Q3 Version store in git | **Gitignore** `.downpress-genie/` (local scratch; bake files are what you commit) |
| Q4 Activate | **Overwrite working tree** on activate (`theme.css` / images / config patch) |
| Q5 Panel IA | **Floating button + drawer** over the live site |
| Q6 Inspire | **Live URL crawl** from the panel (1–3 URLs, reuse import pipeline) |
| Q7 Images | **Openverse directed search + local upload** into a version |
| Q8 Config / chrome keys | **`lede`, `tagline`, `logo`** in config; **hero background** as a first-class image/theme slot |
| Q9 Multi-site | State always under **content site root** (including external siblings) |
| Q10 Name | **Genie Mode** (UI: “Genie”) |

---

## 1. Problem / why this exists

Downpress is intentionally simple: **git-native Markdown**, a shared Essay layout, and a Zen Garden `theme.css`. Import already bootstraps a strong first look from source + inspiration + optional Ollama.

What’s missing is a **local loop after import**: authors want to say “try a different background,” “more gold, less navy,” “base this on another site,” or “show me the last three looks” without leaving the browser—or learning the DesignBrief / CSS generator internals.

**Genie Mode** is that loop: a **dev-only** design cockpit that keeps Downpress simple in production while making authoring dramatically more powerful locally.

### Product thesis

| Keep | Add |
| --- | --- |
| Markdown posts/pages as the source of truth | Local steers for look + limited chrome config |
| `theme.css` + `static/` + `downpress.config.ts` as the baked artifacts | Versioned experiments under `.downpress-genie/` |
| Static deploy with no runtime CMS | Panel + APIs that **never ship** in `build/` or `preview` |
| Code owns structure; LLM fills slots | Same DesignBrief → `themeCssFromBrief` path as import |

Genie Mode is **not** WordPress, **not** a hosted theme marketplace, and **not** a visitor-facing chatbot.

---

## 2. Non-goals

- **No production / preview Genie.** Toolbar, routes, and APIs must be absent from `pnpm downpress preview` and adapter-static output.
- **No visitor comments** (permanent Downpress non-goal).
- **No multi-user collab** or hosted sync of versions (v1).
- **No Markdown content editing** in v1 (posts/pages stay hand-edited in git).
- **No freeform model-written CSS/JS** injected into the page. Only validated brief → generator.
- **No permanent fork of Essay HTML.** Zen Garden rules remain: stable public classes from [THEME.md](./THEME.md).

---

## 3. Prerequisites: Ollama + Finetuna

Genie Mode’s LLM path expects a **local [Ollama](https://ollama.com)** install. Deterministic steers (presets, Openverse, uploads, inspire crawl) still work when Ollama is missing; the panel must say so clearly.

### 3.1 Detect and guide

On Genie open / first LLM action, Downpress should:

1. Probe `OLLAMA_HOST` (default `http://127.0.0.1:11434`) — e.g. `GET /api/tags`.
2. If unreachable: show a verbose panel message with install link and retry.
3. If reachable but no suitable model: list tags and suggest pulling a default (align with import: `DOWNPRESS_OLLAMA_MODEL`, e.g. `gemma4:12b`).
4. **Suggest [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna)** (Catalyst Forge) to create a GPU-tuned, named Ollama variant with a remembered Modelfile — better context/batch fit for repeated Genie / import sessions than stock defaults alone.

Example panel copy (normative intent, not final UI strings):

> Ollama is running, but a tuned model will feel snappier for Genie. Try [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna) (`pnpm start` → create e.g. `gemma4-ctx32k`), then set `DOWNPRESS_OLLAMA_MODEL` to that name.

### 3.2 Env knobs

| Variable | Role | Default |
| --- | --- | --- |
| `OLLAMA_HOST` | Ollama HTTP API | `http://127.0.0.1:11434` |
| `DOWNPRESS_OLLAMA_MODEL` | Model name for Genie + import | `gemma4:12b` (or site/engine default) |
| `DOWNPRESS_GENIE` | Force Genie on in dev tooling | unset (on when `import.meta.env.DEV`) |

Import CLI should share the same detection/suggestion language when `--no-llm` is not set (one helper, two call sites).

### 3.3 Finetuna relationship

- Finetuna is **recommended companion tooling**, not a hard dependency of Downpress.
- Downpress must not vendor or auto-run Finetuna; link + short why is enough.
- After Finetuna creates a model, authors point Downpress at it via `DOWNPRESS_OLLAMA_MODEL` / Genie model picker (M2+).

---

## 4. User journeys

### J1 — Change background with direction

1. Author runs `pnpm downpress dev` on a content site.
2. Opens Genie → “New background: dark abstract with warm gold dust,” **or** uploads a local image as hero/page background.
3. Engine turns direction into an Openverse query and/or stores the upload into a **new version**, previews via activate + HMR.
4. Author keeps or rolls back via the version rail.

### J2 — Style / font / color / layout steers

1. Chips or natural language: “denser,” “Instrument Serif + Outfit,” “wider measure,” “bold hero,” “uppercase nav.”
2. Steers map to DesignBrief fields; generator rewrites `theme.css` for a new snapshot.
3. Live reload shows the change on the real site.

### J3 — Base on a different site

1. Author pastes 1–3 inspiration URLs (same cap as import).
2. Panel live-crawls via the import inspire pipeline (signals → brief blend).
3. New version captures the blended look; prior version remains selectable.

### J4 — Toggle versions, then publish

1. Author flips between versions A/B/C (activate).
2. Favorite is left active (working tree files match).
3. `pnpm downpress build` uses those files—**no Genie code in the artifact**.

### J5 — Offline / no LLM

1. Ollama is down or disabled.
2. Deterministic steers still work: presets, Openverse, **local upload**, inspire crawl, token pickers.
3. Panel status: “LLM offline — structured steers only,” plus Ollama/Finetuna hints when relevant.

---

## 5. Dev-only runtime contract

| Command | Genie UI | Genie APIs | Site files |
| --- | --- | --- | --- |
| `pnpm downpress dev` | Yes (default on when DEV) | Yes (Vite middleware / local-only) | Writable |
| `pnpm downpress preview` | No | No | Read-only serve of `build/` |
| `pnpm downpress build` | No (not bundled) | No | Reads active working-tree theme/config/static |
| Deployed Pages/CDN | No | No | Static only |

**Gates**

- Client: mount panel only when `import.meta.env.DEV` (optional `DOWNPRESS_GENIE=1` for explicit force-on in dev; never in PROD builds).
- Server/middleware: register only in Vite `configureServer`—not in adapter-static output.
- Conditional dynamic `import()` so production client bundles tree-shake the panel away.

---

## 6. Data model

### 6.1 DesignBrief (shared with import)

Genie Mode **extends and reuses** the import `DesignBrief`. Code owns generation via `themeCssFromBrief`. The LLM may only propose JSON that validates against the brief schema.

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
| `images` | **hero** (hero background), header, background, logo, portrait |
| `mood`, `do`, `dont`, `cssNotes` | guidance for LLM + report |

**Portraits are never CSS covers.** Atmosphere / hero backgrounds prefer Openverse CC0 or **author uploads**, not inspiration-site marketing hotlinks.

### 6.2 Config patch + chrome image keys (locked)

| Key | Surface | v1 |
| --- | --- | --- |
| `lede` | `downpress.config.ts` | yes |
| `tagline` | `downpress.config.ts` | yes |
| `logo` | `downpress.config.ts` (path) | yes |
| **Hero background** | brief `images.hero` → `theme.css` + `static/images/` | yes (first-class Genie steer) |
| Page background | brief `images.background` | yes (stock/upload) |
| `nav` / `topics` | config | later |
| `newsletter` | config | out of v1 |
| `title` / `url` / `author` | config | no auto-change without explicit confirm |

Patches are stored per version; activate merges config through a code-owned printer (not LLM-authored TypeScript).

### 6.3 Version snapshots

```text
.downpress-genie/
  active.json
  versions/
    <versionId>/
      meta.json
      design-brief.json
      theme.css
      config-patch.json
      images/                # includes uploads + fetched stock
      attribution.md
```

**`active.json`**

```json
{
  "versionId": "2026-08-03T14-22-01Z-a1b2",
  "activatedAt": "2026-08-03T14:25:00.000Z"
}
```

**`meta.json`** (illustrative)

```json
{
  "id": "2026-08-03T14-22-01Z-a1b2",
  "createdAt": "2026-08-03T14:22:01.000Z",
  "parentId": "2026-08-03T14-10-00Z-9c0d",
  "label": "Dark gold · uploaded hero",
  "starred": false,
  "prompt": "Use my photo as hero background, softer gold",
  "steers": [
    { "type": "upload_hero", "filename": "hero.jpg" },
    { "type": "token", "key": "accent", "value": "#f0c040" }
  ],
  "inspireUrls": [],
  "llm": { "used": true, "model": "gemma4-ctx32k", "host": "http://127.0.0.1:11434" }
}
```

**Git:** `.downpress-genie/` is **gitignored**. Authors commit baked `theme.css`, `static/`, and `downpress.config.ts`.

### 6.4 Working tree vs snapshot

| Layer | Role |
| --- | --- |
| `.downpress-genie/versions/*` | Local experiments |
| Site root `theme.css`, `static/images/*`, `downpress.config.ts` | **Active** look Vite + `build` consume |

**Activate** copies snapshot → working tree. **Build** reads the working tree only.

---

## 7. UI surface

### 7.1 IA (locked)

Floating **Genie** control → **drawer** over the live site (collapsed by default).

**Panel regions**

1. **Composer** — free-text + Send.
2. **Steers** — palette, density, hero style, measure, atmosphere, accent; **hero background** (Openverse query or **file upload**); inspire URL(s).
3. **Version rail** — label, time, star, Activate, Duplicate, Delete.
4. **Status** — Ollama reachability, Finetuna tip when relevant, last verbose error, attribution for active stock images.

### 7.2 Compare

v1: fast activate toggle between versions. Split-pane later.

---

## 8. Agent loop

### 8.1 Principle

**Code owns structure; the model fills slots.**

```text
User prompt / steers / upload
    → (optional) Ollama: DesignBrief delta + stock query + config patch
    → validate / merge
    → tools: update_brief | fetch_stock | receive_upload | sample_inspire | generate_theme | write_snapshot | activate_version
```

### 8.2 Deterministic tools

| Tool | Purpose |
| --- | --- |
| `update_brief` | Merge validated partial brief |
| `fetch_stock` | Openverse CC covers from a query |
| `receive_upload` | Accept local image into version `images/` + brief slot (hero/background/header/logo) |
| `sample_inspire` | Live-crawl 1–3 URLs → inspire blend |
| `generate_theme` | `themeCssFromBrief` |
| `write_snapshot` / `activate_version` | Persist + sync working tree |
| `check_ollama` | Health + model list; surface Finetuna suggestion |

### 8.3 LLM

- JSON brief delta only; reject unknown keys / invalid colors.
- On failure: deterministic path + human-readable error.
- Prefer Finetuna-tuned model names when configured.

---

## 9. Bake / git workflow

```text
dev: prompt → snapshot → activate → working tree → HMR
git: commit theme.css / static / config when happy (.downpress-genie/ ignored)
build: site root files → static artifact (no Genie)
```

Before first Genie write, snapshot current look as `baseline`.

---

## 10. Security & trust boundaries

| Risk | Mitigation |
| --- | --- |
| Genie ships to production | DEV-only mount + Vite-dev middleware; acceptance grep on `build/` |
| Arbitrary file write | Allowlist: `theme.css`, `downpress.config.ts`, `static/images/`, `.downpress-genie/` |
| Upload abuse | Size/type caps (e.g. images only, max MB); no path traversal |
| SSRF via inspire | http(s) only, timeouts, size caps |
| Model CSS/JS | Generator-only emission |
| Stock licenses | Prefer CC0/PDM; per-version `attribution.md` |
| Local API | Loopback; refuse outside DEV |

---

## 11. Milestones

### M0 — Spike

- Dev-only floating Genie stub + `GET /__downpress/genie/health`.
- `check_ollama` stub with install + Finetuna link when down/missing models.
- Prove absent from production client build.

### M1 — Versions + activate (no LLM required)

- `baseline` snapshot; token/structure steers; Openverse background; **local upload for hero background**.
- Version rail + activate → working tree + HMR.
- `.downpress-genie/` gitignored in create-site / external scaffold.

### M2 — Inspire + Ollama

- Live inspire URLs; Ollama brief refine + fallbacks.
- Config patch: lede / tagline / logo.
- Model picker respecting `DOWNPRESS_OLLAMA_MODEL`; Finetuna tip in status.

### M3 — Polish + harden

- Star/label/duplicate; verbose errors; acceptance tests; README/THEME docs.

---

## 12. Open questions — resolved

See §0. No further product forks required before M0.

---

## 13. Acceptance criteria

1. **Dev-only:** Genie in `dev`; absent from `preview` / `build` bundles and routes.
2. **Steer loop:** Accent (or equivalent) → new version → activate updates live styles.
3. **Hero background:** Openverse query **or** local upload lands in version images, syncs on activate, attribution when stock.
4. **Inspire:** Live URL produces a new version without copying marketing HTML into the index.
5. **Rollback:** Activating `baseline` restores prior look.
6. **Build purity:** Baked files only; no Genie runtime; comments still impossible.
7. **Ollama UX:** Missing Ollama → clear install guidance + Finetuna suggestion; deterministic steers still work.
8. **Simplicity:** Ignoring Genie and editing `theme.css` by hand remains supported.

---

## 14. Possibilities beyond v1 (parked)

- Split-pane compare; cloud OpenAI-compatible providers; vision “match this screenshot”; portable theme packs; optional “commit active look” git helper; suggested Markdown edits with explicit apply.

---

## 15. Recommendation

**Build Genie Mode in layers—M0 gating proof first.**

1. ~~Lock open questions~~ **done (2026-08-03).**
2. Ship M0 (dev-only + Ollama/Finetuna health copy).
3. Ship M1 (versions + stock + **upload** + steers).
4. Ship M2 (inspire + Ollama).
5. Harden with M3 before calling the feature done.
