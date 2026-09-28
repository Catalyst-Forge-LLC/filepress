---
format_version: 0.1.0
id: lesson-1f84efa3a4a7
kind: lesson
title: Site theme.css can FOUC to Essay defaults before the site override loads;
  critic
record_status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
data:
  context: Imported from workflow tracking gotchas[].
  problem: Site theme.css can FOUC to Essay defaults before the site override
    loads; critical-theme virtual module also 500'd in dev when out of sync.
  resolution: Inject critical site tokens on first paint via
    vite-plugin-critical-theme writing
    site/.filepress/critical-theme.generated.ts (gitignored); fix module wiring
    for dev.
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


