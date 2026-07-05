# @downpress/core

The reusable Downpress engine. Sites under [`../../sites`](../../sites) depend on
it (via `workspace:*` in this monorepo) and provide their own SvelteKit routes,
content, and `downpress.config.ts`.

## Entry points

- `@downpress/core` — client-safe: `PostCard`, `PostIndex`, `Newsletter`,
  `SiteHeader`, `SiteFooter`, `defineDownpressConfig`, `absoluteUrl`,
  `formatDate`, and shared types.
- `@downpress/core/server` — server-only (filesystem access): `createContent`,
  `renderMarkdown`, `buildRssXml` / `buildSitemapXml` / `buildRobotsTxt`, and the
  content-parsing primitives. Import only from `+page.server.ts`, `+server.ts`,
  or `*.server.ts` modules.
- `@downpress/core/theme` — self-hosted fonts + the Essay theme CSS. Import once
  from a site's root layout.

## Why routes live in the site

SvelteKit's router is per-project, so each site owns its `src/routes/`. Those
route files stay thin: they call `createContent(...)` + core builders and render
core components. `scripts/create-site.mjs` scaffolds them.

## Testing

`pnpm --filter @downpress/core test` runs the unit tests over the pure parsing
and figure-transform logic. Type-checking of the whole library happens through
each site's `svelte-check`.
