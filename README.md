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
| Local ports | [docs/LOCALSLIP.md](docs/LOCALSLIP.md) |
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

- **AppFacts:** [viewer](https://appfacts.dev/v#af1.eNptktFr2zAQxv8VoWenZq952giMdU27QUIpjDJU-eyoPeuEdHJqQv_3nRzHa6FPxt_9dPfdJ530oNdfKu1ND3qtW4cQIqSkK81jKFJPniIEEiWx4ZxEM5bdAKKgs-BTwW6v92fCvuj1SaPxXTZdqeylz85GF7hSuwGQoVI_zWAu2ma3q9SP_e1Wzsfs2U1O7qiBq-fio43i7UhR-urz-RvH06wRne9ElQ7y_5QdNvJ377hYO1DiuYyUmxZNBPVbLJWeFt2Hbd8q3UCQ1f6ctJfK1zQNek71yzQrlCCM8-q_mbfqjJ7JmWkjeQbffMINbqEmp4qJcKlyjr6ho5-JEoey5AeIyZFfsNYkXr32uAomJogz_SBwEcq6F_IY5QZwQWQ7pLEHzx_nZu9aB81M2ck9qxDJSixTv0dJerBLMp-EGUW-pH3p-wvR9GYuIlmD6tu1glewmaeFHpcLO-kgj0Z6_e2Nl085EXzoyxOExEvEK3sAW_LU5TkmxxTHMpk5pHVdd44P-enKUl9vDBscJanvFDtYbbeb-t1V_wOMmPsr) · [raw](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/APP_FACTS.md)

## License

MIT. Copyright Catalyst Forge LLC.
