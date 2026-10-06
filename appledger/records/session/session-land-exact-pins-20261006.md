---
format_version: 0.1.0
id: session-land-exact-pins-20261006
kind: session
title: Fix Land engine sync for exact npm pins
record_status: active
created_at: 2026-10-06T14:00:00Z
updated_at: 2026-10-06T14:00:00Z
recorded_by:
  id: codex
  type: agent
visibility: internal
relations: []
claims: []
data:
  session_id: session-land-exact-pins-20261006
  accomplished:
    - Changed sibling sync to request getfilepress at the selected target version explicitly.
    - Removed misleading publication advice after a mismatched resolved version.
    - Verified the corrected applyUpdate updates AdSmith's exact pin and installed/locked version from 0.1.48 to 0.1.50.
    - All 27 sync and sibling discovery tests passed.
    - AdSmith's site build and four-page output verification passed on 0.1.50.
  left_off: Sync fix is local; no push, deployment, publication, or phase transition was performed.
  next_steps:
    - Refresh LocalHelm and review subsequent named Land plans.
---

AdSmith had FilePress installed. The old unqualified pnpm update honored the old exact dependency pin instead of selecting the planned target. This was a sync implementation defect, not a missing FilePress installation.
