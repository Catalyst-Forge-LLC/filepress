---
title: Genie Mode
description: Dev-only design cockpit for theme and limited config — never ships in production.
order: 3
---

**Genie Mode** is a floating design cockpit that appears when you run `filepress dev`. Open the **Genie** FAB (bottom-right). The drawer uses **side tabs**:

| Tab | Use it for |
| --- | --- |
| **Refine** | Main loop — pick an Ollama model, describe the look, refine & activate |
| **Look** | Instant steers (accent / presets), no LLM |
| **Images** | Openverse stock or local upload (logo also patches config) |
| **Inspire** | Crawl 1–3 URLs into a blended look |
| **Config** | Patch `lede` / `tagline` / `logo` |
| **History** | Activate earlier versions or `baseline` |

Flow: try a look → it activates (page reloads) → when happy, commit baked files. Undo from **History**.

## Rules of the road

- **Dev only.** Genie mounts when `import.meta.env.DEV` (optional `FILEPRESS_GENIE=1`). It is absent from `filepress preview`, `filepress build`, and adapter-static output.
- **Markdown stays sacred.** Genie does not become a CMS. Posts remain plain files in git.
- **Bake to commit.** Experiments live in gitignored `.filepress-genie/`. What you commit is the active `theme.css`, `static/`, and `filepress.config.ts`.


## Local models

Genie and import share the same Ollama hooks:

| Env | Role |
| --- | --- |
| `FILEPRESS_OLLAMA_MODEL` | Default model (Genie also offers a picker when Ollama is up) |
| `OLLAMA_HOST` | Remote Ollama if not local |

If Ollama is down, deterministic steers / inspire / stock still work. When Ollama is up but untuned, Genie points at [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna). Finetuna is companion tooling — not a hard dependency.

Spec: [`docs/GENIE_MODE_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/GENIE_MODE_SPEC.md).
