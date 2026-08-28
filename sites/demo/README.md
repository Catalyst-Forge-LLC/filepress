# FilePress demo site

In-repo **engine fixture** (frontmatter edge cases, drafts, scheduled posts, theme
override). Use this when developing FilePress itself. Root `pnpm check` / `pnpm build`
target this site.

The product / marketing site is [`sites/getfilepress`](../getfilepress) (`pnpm dev:www`).
Sibling publications live in their own repos and depend on the `getfilepress` package.

```bash
# from the engine repo root
pnpm install
pnpm filepress dev --site demo
pnpm filepress build --site demo   # → sites/demo/build/
pnpm check                         # type-check against this site
```

| Path | Role |
| --- | --- |
| `filepress.config.ts` | Title, URL, topics |
| `posts/` | Example Markdown (published, draft, scheduled, phone workflow, image figure) |
| `theme.css` | Accent override demo (see `docs/THEME.md`) |
| `static/` | Favicon + `images/posts/images-in-posts/` |

Frontmatter, images, and config: [Getting started](https://getfilepress.com/getting-started). Theme tokens: [`docs/THEME.md`](../../docs/THEME.md).
