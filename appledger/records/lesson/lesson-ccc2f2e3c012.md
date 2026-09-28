---
format_version: 0.1.0
id: lesson-ccc2f2e3c012
kind: lesson
title: sv create refuses/hangs on a non-empty directory (the repo already had
  docs/, .f
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
  problem: sv create refuses/hangs on a non-empty directory (the repo already had
    docs/, .forgetrail/, etc.).
  resolution: Scaffold into a fresh temp dir with fully non-interactive flags,
    then move files to the repo root.
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


