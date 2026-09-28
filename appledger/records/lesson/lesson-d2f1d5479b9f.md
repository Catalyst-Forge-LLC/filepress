---
format_version: 0.1.0
id: lesson-d2f1d5479b9f
kind: lesson
title: Reading content via Node fs makes the loader server-only. If imported
  from a uni
record_status: active
created_at: 2026-07-04T00:00:00Z
updated_at: 2026-07-04T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
data:
  context: Imported from workflow tracking gotchas[].
  problem: Reading content via Node fs makes the loader server-only. If imported
    from a universal +page.ts it would be bundled for the client and break.
  resolution: posts.ts uses $env/dynamic/private + node:fs (server-only by
    construction); content routes are +page.server.ts. Pure logic is isolated in
    parse.ts for safe importing/testing. Requires @types/node for svelte-check.
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


