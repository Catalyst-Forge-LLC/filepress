# filepress demo site

In-repo example content for the engine. Run this when developing filepress itself.
Real publications (What Over How, etc.) live in their own repos and depend on
this package; they are not sites under `sites/`.

```bash
# from the filepress repo root
pnpm install
pnpm filepress dev --site demo
pnpm filepress build --site demo   # → sites/demo/build/
pnpm check                         # type-check against this site
```

| Path | Role |
| --- | --- |
| `filepress.config.ts` | Title, URL, topics |
| `posts/` | Example Markdown (published, draft, scheduled, phone workflow) |
| `theme.css` | Accent override demo (see `docs/THEME.md`) |
| `static/` | Favicon |

Frontmatter fields and conventions: [engine README](../../README.md).
