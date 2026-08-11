# @filepress/core

The reusable filepress engine. Sites under [`../../sites`](../../sites) depend on
it (via `workspace:*` in this monorepo) and provide their own SvelteKit routes,
content, and `filepress.config.ts`.

## Entry points

- `@filepress/core` — client-safe: `PostCard`, `PostIndex`, `Newsletter`,
  `SiteHeader`, `SiteFooter`, `defineFilepressConfig`, `absoluteUrl`,
  `formatDate`, and shared types.
- `@filepress/core/server` — server-only (filesystem access): `createContent`,
  `renderMarkdown`, `buildRssXml` / `buildSitemapXml` / `buildRobotsTxt`, and the
  content-parsing primitives. Import only from `+page.server.ts`, `+server.ts`,
  or `*.server.ts` modules.
- `@filepress/core/theme` — self-hosted fonts + the Essay theme CSS. Import once
  from a site's root layout.

## Why routes live in the site

SvelteKit's router is per-project, so each site owns its `src/routes/`. Those
route files stay thin: they call `createContent(...)` + core builders and render
core components. `scripts/create-site.mjs` scaffolds them.

## Testing

`pnpm --filter @filepress/core test` runs the unit tests over the pure parsing
and figure-transform logic. Type-checking of the whole library happens through
each site's `svelte-check`.
