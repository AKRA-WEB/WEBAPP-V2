# ADR 0017: Project Management Operating Model

Date: 2026-06-20

## Status

Accepted

## Context

AKRA WEBAPP V2 has moved from setup into a multi-module migration program.
Multiple AI agents may continue the work, and chat context can be cleared or
compacted. The project needs enough documentation to avoid losing work, but
not so much active handoff content that every session wastes context.

The user asked the agent to help manage planning, organization, and project
execution, while proposing useful next steps for user review.

## Decision

Use a lightweight project-management layer:

- `docs/project-management/operating-model.md` defines operating rules,
  priority policy, definition of done, context budget, and risk classes.
- `docs/project-management/decision-board.md` lists recommended next moves,
  decisions needed, and watch-list risks.
- `docs/plans/index.md` remains the implementation plan source of truth.
- `docs/handoff/current-state.md` remains the compact operational status.
- `docs/handoff/work-log.md` remains recent-only, with older entries archived.

Use `Let's work` as a project shortcut for context-saving resume. It reads the
compact source-of-truth docs, skips archives unless needed, checks git status,
and reports the recommended next action. It does not authorize implementation
by itself.

Normal resume should not read archives unless a current plan, ADR, bug, or
verification question needs historical detail.

## Consequences

- Future agents can resume with less context cost.
- The user gets explicit recommendation packs instead of raw implementation
  details.
- Status drift becomes easier to catch because high-level docs have clear
  ownership.
- Agents must keep the decision board and current state updated when priorities
  or risks change.

## Related

- Plan: `docs/plans/V2-0024-project-management-operating-model.md`
- Operating model: `docs/project-management/operating-model.md`
- Decision board: `docs/project-management/decision-board.md`
- Archive policy ADR: `docs/decisions/0014-active-work-log-and-archive-policy.md`
