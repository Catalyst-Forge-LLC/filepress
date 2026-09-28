---
format_version: 0.1.0
id: lesson-c4a8e4a6c7b1
kind: lesson
title: Land localslip sync engine failed after LocalBerth → LocalSlip rename.
record_status: active
created_at: 2026-09-14T00:00:00Z
updated_at: 2026-09-14T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
data:
  context: Imported from workflow tracking gotchas[].
  problem: Land localslip sync engine failed after LocalBerth → LocalSlip rename.
  resolution: staleVirtualStoreDir compares that path to this packageDir;
    applyUpdate removes node_modules and pnpm install, then retries. Also
    recover if pnpm still prints ERR_PNPM_UNEXPECTED_VIRTUAL_STORE.
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


