---
format_version: 0.1.0
id: session-scaffold-ship-20261006
kind: session
title: Configure site and root Ship during scaffolding
record_status: active
created_at: 2026-10-06T16:00:00Z
updated_at: 2026-10-06T16:00:00Z
recorded_by:
  id: codex
  type: agent
visibility: internal
relations: []
claims: []
data:
  session_id: session-scaffold-ship-20261006
  accomplished:
    - Added explicit Pages project and production branch options to external scaffolding.
    - Added local Wrangler dependency and site build/upload Ship for configured targets.
    - Added optional root Ship delegation with preservation of existing app commands.
    - Documented pending setup and clarified LocalHelm Land responsibilities.
    - Seven scaffold regression tests pass for standalone and nested paths and validation failures.
  left_off: Local changes only; no deployment, publication, push or phase transition.
  next_steps:
    - Publish through the normal owner release process when requested.
---

ForgeTrail guidance now carries the same setup contract through Lite, Phase 2,
MCP companion recipes and the deployment template. Script preparation is distinct
from installing dependencies, provisioning a missing project and deploying.
