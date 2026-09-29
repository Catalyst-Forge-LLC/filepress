# Agent guardrails — filepress

This repo uses **ForgeTrail**. The record is `appledger/`: the phase in `profiles/forgetrail.yaml`, and decisions and the session in `records/`.

## Session start

1. Read `appledger/profiles/forgetrail.yaml`, the latest session record, and `CONTEXT_PROMPT.md` (once it exists) before making changes.
2. Work within the current phase. Don't jump ahead without user confirmation.

## Git commits

- Plain `git commit -m "..."` or `git commit -F <file>`.
- Only commit when the user asks, or when a phase/task boundary is reached and the user's own rules call for a commit.

## Phase transitions

Do not advance the phase or mark a phase complete without explicit user confirmation. If exit criteria look satisfied, say so and wait.
