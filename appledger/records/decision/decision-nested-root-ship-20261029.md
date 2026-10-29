---
format_version: 0.1.0
id: decision-nested-root-ship-20261029
kind: decision
title: Nested sites require a root ship command
record_status: active
created_at: 2026-10-29T12:42:31.000Z
updated_at: 2026-10-29T12:42:31.000Z
recorded_by:
  id: cursor
  type: agent
visibility: internal
relations: []
claims: []
data:
  status: accepted
  choice: A site nested in a git app repository is configured only when the ancestor package.json delegates pnpm ship to the site. Scaffolding writes that command for a confirmed Pages target and refuses to replace a different one. filepress check fails while the delegation is missing.
  rationale: Site-only ship leaves pnpm ship at the app root missing. LocalHelm can fall back to site/, so the gap stays invisible until someone runs the root command.
  alternatives:
    - Document the root command and leave it optional.
    - Overwrite an existing root ship command automatically.
  authority: owner request, 2026-10-29
---

The site script remains the build and upload. The root script only delegates to it.
