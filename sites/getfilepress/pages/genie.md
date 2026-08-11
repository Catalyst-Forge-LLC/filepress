---
title: Genie Mode
description: Dev-only design cockpit for theme and limited config — never ships in production.
order: 3
---

**Genie Mode** is a floating design cockpit that appears when you run `filepress dev`. Open the **Genie** FAB (bottom-right), try looks, activate a version, then commit the baked files.

## Rules of the road

- **Dev only.** Genie mounts when `import.meta.env.DEV` (optional `FILEPRESS_GENIE=1`). It is absent from `filepress preview`, `filepress build`, and adapter-static output.
- **Markdown stays sacred.** Genie does not become a CMS. Posts remain plain files in git.
- **Bake to commit.** Experiments live in gitignored `.filepress-genie/`. What you commit is the active `theme.css`, `static/`, and `filepress.config.ts`.

## What you can do

| Action | What happens |
| --- | --- |
| Steers / presets | Accent, density, dark punchy / light editorial chips → new version |
| Openverse query | Stock background into `static/images/` + theme |
| Upload | Hero or page background (or logo → config `logo`) |
| Inspire URLs | Paste 1–3 sites; live crawl blends a DesignBrief (optional Ollama refine) |
| Config | Patch `lede`, `tagline`, and `logo` on activate |
| Versions | Activate / roll back (including `baseline`) |

## Local models

Genie and import share the same Ollama hooks:

| Env | Role |
| --- | --- |
| `FILEPRESS_OLLAMA_MODEL` | Default model (Genie also offers a picker when Ollama is up) |
| `OLLAMA_HOST` | Remote Ollama if not local |

If Ollama is down, deterministic steers / inspire / stock still work. When Ollama is up but untuned, Genie points at [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna). Finetuna is companion tooling — not a hard dependency.

Spec: [`docs/GENIE_MODE_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/GENIE_MODE_SPEC.md).
