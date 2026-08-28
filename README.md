# FilePress

Markdown blogs from git. No CMS. No database. A static `build/` folder.

Written **FilePress**. npm **`getfilepress`**. CLI **`filepress`** (same script as `getfilepress`).

**Site:** [getfilepress.com](https://getfilepress.com) · **Docs:** [getfilepress.com/docs](https://getfilepress.com/docs)

## Start a site

From a clone of this repo:

```bash
pnpm install
pnpm create-site my-blog --external ../my-blog --title "My Blog" --url https://my.blog
cd ../my-blog && pnpm install && pnpm dev
```

`filepress new "Title"` stamps `posts/YYYY-MM-DD-slug.md`. Config, frontmatter, images, and commands: [Docs](https://getfilepress.com/docs).

Pin CI on npm (`getfilepress` current is `0.1.19`) or a git SHA / existing tag. `link:` is local only.

## Import

```bash
pnpm filepress import --source https://example.com --yes
pnpm filepress import --source https://example.com --dry-run --no-llm
```

Crawls a public site (sitemap/RSS preferred) into a sibling content tree. Optional `--inspire` URLs (up to three) and Ollama. `--no-llm` stays deterministic. [Import](https://getfilepress.com/import) · [spec](docs/SITE_IMPORT_SPEC.md).

## Docs

| Topic | Where |
| --- | --- |
| Scaffold, config, posts | [Docs](https://getfilepress.com/docs) · [getting started](https://getfilepress.com/docs/getting-started) |
| Theme tokens and presets | [docs/THEME.md](docs/THEME.md) |
| Genie (dev only) | [Genie](https://getfilepress.com/genie) · [spec](docs/GENIE_MODE_SPEC.md) |
| Deploy | [Deploy](https://getfilepress.com/deploy) · [docs/DEPLOY.md](docs/DEPLOY.md) |
| Sibling / external sites | [docs/EXTERNAL_SITES.md](docs/EXTERNAL_SITES.md) |
| Local ports | [docs/LOCALBERTH.md](docs/LOCALBERTH.md) |
| Agent skill page | [Skill page](https://getfilepress.com/skill-page) · [docs/SKILL_PAGE.md](docs/SKILL_PAGE.md) |

## In this repo

- `sites/demo` — engine fixture (drafts, scheduled posts, image convention)
- `sites/getfilepress` — getfilepress.com

```bash
pnpm install
pnpm test
pnpm dev        # demo
pnpm dev:www    # product site
pnpm ship       # build getfilepress + Wrangler Pages
```

## Not a CMS

No admin UI. No visitor comments — permanent. Genie is `filepress dev` only; `preview` and `build/` do not include it. Production is files.

<!-- xfacts-nutrition-label -->

## Nutrition label

- **AppFacts:** [viewer](https://appfacts.dev/v#af1.eNptkkGLGzEMhf-K0dnZoVefygZKt01KYbK9lKUotjLxxmMZWzNhCPnvxZNk9tAebX9Pen7SBUYwnzRE7AkMHHyglKkU0CBTqlc9R86UGDQUQRkKGEArfiTQELylWCq2fdndCHsCc4GAsRuwqy-7KVFrs0-iVTtSENLqG474uFu3rVZfd9sNaMhDFD87-cGOnt6rj0PGns6cT2Dgpv_uBTTsh-gCZTDwywvNzafgYwcG1m0LGo5c5H4OPLhDwEzqJ3ZU4KrBUSpgfl8ggoHPZS78XprTXDtVEWdSZ9qrDwNXfcNv9J17fVGW-8SRovyHHf1CPg8-OCXMQWF0ytGoCuWR8gLLkKPjc1wsxJGyzOkoYbXFfJqfH_wQ_cGTezi5nZTlKNVMymypFB87lXyi4CMtysAWw56yHO_iLUbsSCXOogJhoaIOnNXMVasUOPUUBa5vGspol-z-CVdDHUorKN6q-xCql9G7-tW3OjofXF2ThPaEHf3p5-ZVlmLq6_JRkSXolT2SrYlCXcTihfMEBo4iqZim6bwch_2T5b5Zo2CYiqy-cO5otdmsm4-Vvv4FzW_8rQ) · [raw](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/APP_FACTS.md)

## License

MIT. Copyright Catalyst Forge LLC.
