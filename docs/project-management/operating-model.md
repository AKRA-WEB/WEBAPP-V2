# Project Management Operating Model

Last updated: 2026-06-20

This file defines how AKRA WEBAPP V2 should be managed from this point forward.
It is intentionally compact. Detailed implementation history belongs in plans,
ADRs, handoff logs, and archive logs.

## Source Of Truth

Read in this order during routine project management:

1. `docs/plans/index.md` - current plan board and next action.
2. `docs/handoff/current-state.md` - operational state and risks.
3. `docs/project-management/decision-board.md` - user decisions and proposed
   next moves.
4. Active recent `docs/handoff/work-log.md` entries only.
5. Active plan files listed in `docs/plans/index.md`.

Do not use chat history as the source of truth. If chat contains a useful
decision, persist it to a plan, ADR, decision board, or handoff doc.

## Session Shortcut

When the user types `Let's work`, use it as a shortcut for a context-saving
resume:

1. Read the compact source-of-truth docs from the section above plus
   `AGENTS.md`, `README.md`, and `CONDUCTOR.md`.
2. Skip archive logs unless a current plan, ADR, bug, or verification question
   points there.
3. Check `git status --short`.
4. Summarize current status, recommended next action, and decisions needed.
5. Wait for `Architect:`, `Go:`, `Review:`, or another explicit instruction
   before changing runtime code.

## Operating Cadence

- After every non-trivial task: update current state, work log, plan index, and
  any affected plan/module inventory.
- After every decision that changes future work: add or update an ADR.
- After every module milestone: update `docs/migration/module-inventory.md`.
- When active `work-log.md` grows beyond 3-5 entries or roughly 400 lines:
  move older entries to `docs/handoff/archive/` and keep a dated pointer.
- Before starting a new implementation slice: check `git status --short`, read
  the active plan, and verify the next action against the decision board.

## Priority Policy

Default priority order:

1. Protect V1 production and secrets.
2. Keep V2 source-of-truth docs accurate and short enough to resume.
3. Finish the current pilot path before opening large new modules.
4. Prefer dependency order from `V2-0022`.
5. Keep implementation slices small enough to verify and review.

Current default next execution slice:

1. Picking problem reporting.
2. Picking LINE notification/failure recovery.
3. Picking cutover package.
4. PR/PO/GR foundation plan.

## Definition Of Done

For any implementation slice:

- Scope is tied to a plan or clearly recorded next action.
- Relevant checks pass (`lint`, `typecheck`, `build`, migration/import checks,
  or docs-only `git diff --check`).
- Browser/mobile checks are run when UI changed.
- Permission behavior is checked for allowed and denied roles when access
  matters.
- Handoff docs are updated before final response.
- No V1 production system changes unless the user explicitly approved a
  production V1 task or module cutover.

## Context Budget Rules

- Use summaries first: `plans/index.md`, `current-state.md`, and this file.
- Keep `work-log.md` active and short; archive detail, do not delete it.
- Read archive logs only for historical verification, bug investigation, ADR
  context, or when a current plan points there.
- Summarize command output in handoff docs instead of pasting long logs.
- Link to files/reports for details instead of duplicating them.

## User Decision Pack

When a decision is needed, present it with:

- recommended option;
- why it is recommended;
- tradeoff/risk;
- files or modules affected;
- verification or rollback implication.

Avoid asking the user to decide implementation trivia unless the choice affects
business workflow, cutover risk, secrets, production systems, or user-visible
behavior.

## Risk Management

Track these risk classes in plans/handoff when they apply:

- V1 production impact.
- Secrets or service-role exposure.
- Supabase RLS/grant/RPC posture.
- Data import/reconciliation risk.
- Permission mismatch between Main links and route guards.
- Mobile operational usability.
- LINE notification side effects.
- Cutover and rollback readiness.

## Current Management Notes

- Main portal (`V2-0017`) is complete.
- Picking read-only, create requisition, and status transitions (`V2-0019`,
  `V2-0020`, `V2-0023`) are complete.
- Picking problem reporting is the recommended next slice.
- Placeholder non-Picking module routes still need server-side permission guard
  treatment before they get real content.
- V1 remains the production system until module-specific cutover approval.
