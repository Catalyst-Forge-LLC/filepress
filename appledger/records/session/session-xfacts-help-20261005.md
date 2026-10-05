---
format_version: 0.1.0
id: session-xfacts-help-20261005
kind: session
title: Add xFacts help tooltips and complete label pages
record_status: active
created_at: 2026-10-05T13:26:00Z
updated_at: 2026-10-05T13:26:00Z
recorded_by:
  id: codex
  type: agent
visibility: internal
relations: []
claims: []
data:
  session_id: session-xfacts-help-20261005
  accomplished:
    - Added question-mark links to the family home sites with locally bundled Tippy tooltips.
    - Added discovery-approved static full-label pages when a portable viewer link is absent.
    - Verified LocalHelm shows all nine selected names and opens the complete label.
    - Core tests (77), app tests (24), and LocalHelm production build passed.
  left_off: Changes remain local. Type check has eight existing errors; demo build has an existing missing logo. Iterate phase is preserved.
  next_steps:
    - Publish FilePress and rebuild consuming sites when requested by the owner.
---

FeatureFacts currently has no portable viewer implementation. FilePress therefore renders the existing label locally and preserves existing external viewer URLs for other families. The help link is separate from the full-label link to avoid nested anchors. No label evidence was invented or changed.
