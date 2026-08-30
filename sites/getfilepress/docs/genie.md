---
title: Genie
---

**Genie** is a floating design cockpit in `filepress dev`. Open the **Genie** FAB (bottom-right). Side tabs:

| Tab | Use |
| --- | --- |
| **Refine** | Ollama server (optional scan) and model; describe the look; refine and activate |
| **Look** | Instant steers (accent / presets), no LLM |
| **Images** | Openverse stock or local upload (logo also patches config) |
| **Inspire** | Crawl 1–3 URLs into a blended look |
| **Config** | Patch `lede` / `tagline` / `logo` |
| **History** | Activate earlier versions or `baseline` |

Try a look → it activates (page reload) → commit the baked files when it is right. Undo from **History**.

## What Genie will not do

- **Dev only.** Genie mounts in the browser during `filepress dev`. Absent from `filepress preview`, `filepress build`, and the static `build/`.
- **Not a CMS.** Posts stay files in git.
- **Bake to commit.** Experiments live in gitignored `.filepress-genie/`. What gets committed is the active `theme.css`, `static/`, and `filepress.config.ts`.

## Local models

Genie and import share the same Ollama hooks. Default is local (`OLLAMA_HOST`). For another box on Tailscale, LAN, or a listed IP, click **Scan network** (check **Include LAN** for a TCP sweep of local /24s) or run `filepress import --scan` / `--lan`. Discovery uses [ollanet](https://ollanet.dev).

| Env | Role |
| --- | --- |
| `FILEPRESS_OLLAMA_MODEL` | Default model (Genie also offers a picker when a server is up) |
| `OLLAMA_HOST` | Default Ollama if no scanned server is picked |
| `FILEPRESS_OLLAMA_TIMEOUT_MS` | Wait for `/api/chat` (default 600000 = 10 minutes) |
| `OLLANET_HOSTS` | Extra hosts/IPs for the optional scan |

A first refine after `ollama pull` can sit on “loading” while weights enter VRAM. The panel shows elapsed time; the `filepress dev` terminal prints `still generating…` every 15 seconds, then the raw JSON. The same dump is written to `.filepress-genie/last-ollama.json` (gitignored). Retry after a timeout — a warm model is faster.

Refine follows the written palette. Light, ice, snow, or Antarctica means a bright page. Import still keeps dark inspiration dark. If a previous dark version is active, activate **baseline** in History first so the seed is not a black brief.

If Ollama is down, deterministic steers, inspire, and stock still work. When Ollama is up but untuned, Genie points at [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna). Companion tooling, not a hard dependency.

Agent spec: [`docs/GENIE_MODE_SPEC.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/GENIE_MODE_SPEC.md).
