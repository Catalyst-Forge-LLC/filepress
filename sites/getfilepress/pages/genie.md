---
title: Genie Mode
description: Dev-only design cockpit for theme and limited config — never ships in production.
order: 3
---

**Genie Mode** is a floating design cockpit that appears when you run `filepress dev`. It helps you steer Essay tokens, try stock or uploaded backgrounds, and activate versioned experiments under `.filepress-genie/` — then bake the winners into `theme.css`, `static/`, and `filepress.config.ts`.

## Rules of the road

- **Dev only.** Genie mounts when `import.meta.env.DEV` (optional `FILEPRESS_GENIE=1`). It is absent from `filepress preview`, `filepress build`, and adapter-static output.
- **Markdown stays sacred.** Genie does not become a CMS. Posts remain plain files in git.
- **Bake to commit.** Experiments live in gitignored `.filepress-genie/`. What you commit is the active theme/config/static tree.

## Local models

Genie and import share the same Ollama hooks:

| Env | Role |
| --- | --- |
| `FILEPRESS_OLLAMA_MODEL` | Model name (e.g. a Finetuna-tuned tag) |
| `OLLAMA_HOST` | Remote Ollama if not local |

If Ollama is reachable but no suitable model is present, Genie suggests pulling a default and points at [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna) for tuned local models. Finetuna is companion tooling — not a hard dependency of FilePress.

## What Genie mutates today

Theme tokens and limited config surfaces (lede, tagline, logo, hero background) via steers, Openverse stock, and local upload. Live inspire crawl + richer Ollama refine are on the roadmap (Genie M2).

Spec: [`docs/GENIE_MODE_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/GENIE_MODE_SPEC.md).
