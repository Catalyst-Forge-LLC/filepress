---
title: Genie Mode
description: Dev-only design cockpit for theme and limited config. Never ships in production.
order: 3
---

**Genie Mode** is a floating design cockpit that appears when you run `filepress dev`. Open the **Genie** FAB (bottom-right). The drawer uses **side tabs**:

| Tab | Use it for |
| --- | --- |
| **Refine** | Main loop: pick an Ollama **server** (optional network scan) and model, describe the look, refine and activate |
| **Look** | Instant steers (accent / presets), no LLM |
| **Images** | Openverse stock or local upload (logo also patches config) |
| **Inspire** | Crawl 1–3 URLs into a blended look |
| **Config** | Patch `lede` / `tagline` / `logo` |
| **History** | Activate earlier versions or `baseline` |

Flow: try a look → it activates (page reloads) → when happy, commit baked files. Undo from **History**.

## What Genie will not do

- **Dev only.** Genie mounts when `import.meta.env.DEV` (optional `FILEPRESS_GENIE=1`). It is absent from `filepress preview`, `filepress build`, and adapter-static output.
- **Not a CMS.** Posts stay plain files in git.
- **Bake to commit.** Experiments live in gitignored `.filepress-genie/`. What you commit is the active `theme.css`, `static/`, and `filepress.config.ts`.

## Local models

Genie and import share the same Ollama hooks. Default is still local (`OLLAMA_HOST`). To use another box on Tailscale, LAN, or a listed IP, click **Scan network** in Genie (check **Include LAN** for a TCP sweep of local /24s) or run `filepress import --scan` / `--lan`. Discovery uses [ollanet](https://ollanet.dev) (`OLLANET_HOSTS`, `~/.ollanet/config.json`, Tailscale CLI when present).

| Env | Role |
| --- | --- |
| `FILEPRESS_OLLAMA_MODEL` | Default model (Genie also offers a picker when a server is up) |
| `OLLAMA_HOST` | Default Ollama if you do not pick a scanned server |
| `FILEPRESS_OLLAMA_TIMEOUT_MS` | How long Refine/import will wait for `/api/chat` (default 600000 = 10 minutes) |
| `OLLANET_HOSTS` | Extra hosts/IPs for the optional scan |

A first refine after `ollama pull` can sit on “loading” for several minutes while the weights enter VRAM. The Genie panel shows elapsed time; the `filepress dev` terminal prints `still generating…` every 15 seconds. If you see a timeout, retry — a warm `gemma4:12b` is much faster.

If Ollama is down, deterministic steers / inspire / stock still work. When Ollama is up but untuned, Genie points at [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna). Finetuna is companion tooling, not a hard dependency.

Spec: [`docs/GENIE_MODE_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/GENIE_MODE_SPEC.md).
