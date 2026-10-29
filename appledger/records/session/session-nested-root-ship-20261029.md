---
format_version: 0.1.0
id: session-nested-root-ship-20261029
kind: session
title: Require root ship delegation for nested sites
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
  session_id: session-nested-root-ship-20261029
  accomplished:
    - "External scaffolding now writes root ship delegation for a nested git repository when a Pages target is configured. An existing different root ship command is left unchanged."
    - "filepress check fails while a site package has ship and the ancestor package in the same git repository does not run that site."
    - "DEPLOY.md, EXTERNAL_SITES.md, and the product deploy page state that a nested site is configured only when both commands exist."
    - "Scaffold and root-ship tests passed, including automatic delegation, composed commands, and refusal to replace a different root command. The published-files import check passed."
  left_off: "Local main is ahead of origin. No publication, push, deployment, or phase transition. Existing app repositories are unchanged until they upgrade FilePress and add the missing root command."
  next_steps:
    - Add the root ship delegation in app repositories that already have a site ship script, including UXcalibur.
    - Owner publishes getfilepress through the established release workflow when ready.
---

Standalone site repositories still use the site package as the root ship command. Land continues to run the site script. The new check applies inside a git repository only, so scaffolding does not edit an ancestor package it cannot identify.
