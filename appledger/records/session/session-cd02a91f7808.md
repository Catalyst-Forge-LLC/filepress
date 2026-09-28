---
format_version: 0.1.0
id: session-cd02a91f7808
kind: session
title: Stage 2 (M4 core/site split) DONE, as a pnpm workspace monorepo (user
  chose mono
record_status: active
created_at: 2026-07-05T00:00:00Z
updated_at: 2026-07-05T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
data:
  session_id: session-cd02a91f7808
  accomplished:
    - "Stage 2 (M4 core/site split) DONE, as a pnpm workspace monorepo (user
      chose monorepo + confirmed flipping currentPhase to 4-feature-iteration).
      Extracted the whole engine into @filepress/core (packages/core,
      source-linked Svelte lib): content loader, remark/rehype pipeline (incl.
      rehype-figure), feed/sitemap/robots builders, format, Essay theme
      (styles/theme.css + font imports via @filepress/core/theme), and
      prop-driven components (PostCard, PostIndex, Newsletter, SiteHeader,
      SiteFooter). Redesigned for DI to remove SvelteKit-only deps ($env/$lib):
      createContent({contentDir}) factory (server-only), defineFilepressConfig()
      that validates title/url + fills defaults, and a strict client-barrel
      (index.ts) vs server-barrel (server.ts) split. Rebuilt the app as
      sites/example-site (real site; example-post.md; own filepress.config.ts +
      content.server.ts + thin routes). Wrote scripts/create-site.mjs (templates
      from example-site, refuses non-empty dir, edge case 18) and used it to
      generate sites/demo, then restored the original demo posts (drafts +
      future-dated) into it. Deleted the old root SvelteKit app; root
      package.json is now a workspace manifest with pnpm -r scripts.
      Verification: @filepress/core tests = 31 pass (added config.test.ts
      covering defineFilepressConfig validation, edge case 19); pnpm -r check =
      0 errors; example-site and demo each build cleanly and independently to
      their own build/ (isolation proven). Deferred (until a second repo is
      actually needed, D4): splitting core into its own git repo with URL+SHA
      pins + a CI workflow template in the scaffold. Next milestone: M3
      (Cloudflare Pages deploy wiring, per site)."
  left_off: "Stage 2 (M4 core/site split) DONE, as a pnpm workspace monorepo (user
    chose monorepo + confirmed flipping currentPhase to 4-feature-iteration).
    Extracted the whole engine into @filepress/core (packages/core,
    source-linked Svelte lib): content loader, remark/rehype pipeline (incl.
    rehype-figure), feed/sitemap/robots builders, format, Essay theme
    (styles/theme.css + font imports via @filepress/core/theme), and prop-driven
    components (PostCard, PostIndex, Newsletter, SiteHeader, SiteFooter).
    Redesigned for DI to remove SvelteKit-only deps ($env/$lib):
    createContent({contentDir}) factory (server-only), defineFilepressConfig()
    that validates title/url + fills defaults, and a strict client-barrel
    (index.ts) vs server-barrel (server.ts) split. Rebuilt the app as
    sites/example-site (real site; example-post.md; own filepress.config.ts +
    content.server.ts + thin routes). Wrote scripts/create-site.mjs (templates
    from example-site, refuses non-empty dir, edge case 18) and used it to
    generate sites/demo, then restored the original demo posts (drafts +
    future-dated) into it. Deleted the old root SvelteKit app; root package.json
    is now a workspace manifest with pnpm -r scripts. Verification:
    @filepress/core tests = 31 pass (added config.test.ts covering
    defineFilepressConfig validation, edge case 19); pnpm -r check = 0 errors;
    example-site and demo each build cleanly and independently to their own
    build/ (isolation proven). Deferred (until a second repo is actually needed,
    D4): splitting core into its own git repo with URL+SHA pins + a CI workflow
    template in the scaffold. Next milestone: M3 (Cloudflare Pages deploy
    wiring, per site)."
  next_steps: []
---


