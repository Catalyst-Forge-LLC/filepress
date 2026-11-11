---
format_version: 0.1.0
id: session-installed-dev-xfacts-20261111
kind: session
title: Fix filepress dev for installed sites that show an xFacts label
record_status: active
created_at: 2026-11-11T16:45:00.000Z
updated_at: 2026-11-11T16:45:00.000Z
recorded_by:
  id: cursor
  type: agent
visibility: internal
relations: []
claims: []
data:
  session_id: session-installed-dev-xfacts-20261111
  accomplished:
    - "packages/app/vite.config.ts adds the real directories of the font, Popper, and Tippy packages to server.fs.allow. As an installed dependency they sit outside the allow list SvelteKit builds, and the xFacts label's fonts returned 403."
    - "getfilepress and @filepress/core are excluded from dependency pre-bundling. Their installed path contains node_modules, so Vite tried to pre-bundle them and failed on the ?url imports in XFactsRail.svelte; client chunks returned 504 and the page did not hydrate."
    - "Installed mode was checked on ClaimCheck with the same diff applied as a pnpm patch to 0.1.58: 114 requests with no failures, label fonts loaded, tooltip bound, clean server log. Engine mode was checked on sites/getfilepress: 108 requests with no failures. 24 app tests pass. The type check reports the same eight existing errors, none in the changed file."
  left_off: "Local main is ahead of origin. No version bump, publication, push, or phase transition. Installed sites keep the defect until they take a release with this change."
  next_steps:
    - Owner publishes getfilepress through the established release workflow when ready.
    - ClaimCheck removes site/patches/getfilepress@0.1.58.patch and its patchedDependencies entry after upgrading.
    - "Consider a dev-server step in pack:smoke. It only runs filepress build today, so nothing exercises filepress dev from an installed package."
---

The defect needs three things together: an installed package, an xFacts label on the home page, and a browser load. Server rendering succeeds, so a request without a browser returns 200 and looks healthy.

The global 0.1.57 install shows the same errors. Other installed sites with a label are likely affected; none were checked in this session.
