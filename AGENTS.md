# Agent guardrails — filepress

This repo uses **ForgeKit** lifecycle tracking. Source of truth: `.forgekit/workflow_tracking.json` (`currentPhase`, `phases`, `decisions`).

## Session start

1. Read `.forgekit/workflow_tracking.json` and `CONTEXT_PROMPT.md` (once it exists) before making changes.
2. Check `currentPhase` and work within that phase's scope; don't jump ahead without user confirmation.

## Git commits

- Plain `git commit -m "..."` or `git commit -F <file>`.
- **No unrequested attribution trailers** (e.g. no "Co-Authored-By" or tool-attribution lines) unless the user explicitly asks for them.
- Only commit when the user asks, or when a phase/task boundary is reached and the user's own rules call for a commit.

## Phase transitions

Do not advance `currentPhase` or mark a phase complete without explicit user confirmation. If exit criteria look satisfied, say so and wait.
