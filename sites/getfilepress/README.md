# FilePress (product site)

In-repo product / marketing site for [getfilepress.com](https://getfilepress.com).
Built with FilePress (`homePage: 'home'`, Writing at `/writing`).

`sites/demo` remains the engine fixture (drafts, scheduled posts, cheatsheet).

```bash
# from the engine repo root
pnpm install
pnpm dev:www                 # or: pnpm filepress dev --site getfilepress
pnpm build:www               # → sites/getfilepress/build/
pnpm filepress check --site getfilepress
```

| Path | Role |
| --- | --- |
| `filepress.config.ts` | Identity, `homePage`, nav, topics |
| `pages/` | Home + docs (getting started, import, genie, about) |
| `posts/` | Writing essays |
| `theme.css` | Product accent / surface tokens |
| `static/` | Logo + favicon |

Deploy wiring (Cloudflare Pages + custom domain) is roadmap M3 — content builds locally today.
