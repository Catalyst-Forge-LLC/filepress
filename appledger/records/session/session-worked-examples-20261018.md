---
format_version: 0.1.0
id: session-worked-examples-20261018
kind: session
title: Make the landing starter demonstrate a concrete result
record_status: active
created_at: 2026-10-18T19:56:30.493Z
updated_at: 2026-10-18T19:56:30.493Z
recorded_by:
  id: codex
  type: agent
visibility: internal
relations: []
claims: []
data:
  session_id: session-worked-examples-20261018
  accomplished:
    - Replaced generic benefit prompts with one connected input, output, and
      subsequent action example. Require an output excerpt, specific headings,
      a visible consequence, and clear ownership of any edit.
    - Removed the duplicate example section from the landing starter. Its
      secondary action targets the single example and transfers focus there.
    - Eight existing scaffold tests, the guidance build, and a generated external
      landing build pass. Desktop and 390px iframe layouts were inspected.
  left_off: Local implementation for owner review. No push, publication,
    deployment, version change, or phase transition.
  next_steps:
    - Review the Cold-eye example and remaining shelf findings before the next
      editorial pass. Release remains a separate owner decision.
---

The owner found that attractive example cards still described outputs without
showing the practical benefit. The starter now asks for the actual input, a
sample in the output format, and the repaired artifact or next decision. A
recommendation must not be presented as an applied edit. A single example is
linked instead of repeated. The default blog scaffold and draft behavior remain.

Evidence: catalyst-forge/docs/reviews/shelf-example-followup-2026-10-18.md.

Release target remains the FilePress repository root (package getfilepress),
version source package.json, npm README source README.md. Build the product site
with pnpm build:www; package checks and release gates remain unchanged. No release
was requested or performed.
