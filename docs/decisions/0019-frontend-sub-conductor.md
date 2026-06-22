# ADR 0019: Frontend Sub-Conductor

Status: Accepted
Date: 2026-06-22

## Context

AKRA WEBAPP V2 is migrating module by module from V1 while also improving the
interface. The user asked whether a separate conductor should be created for
frontend work so UI/UX can progress alongside system migration, with shortcut
commands for frontend tasks.

A completely independent frontend conductor would make it easy for UI plans to
drift away from data readiness, permissions, server actions, and cutover order.
At the same time, keeping all frontend expectations only inside the main
conductor would make responsive design, mock-ups, and V1 UX parity too easy to
miss.

## Decision

Create `FRONTEND_CONDUCTOR.md` as a frontend sub-conductor. It is a command and
checklist layer over the existing project conductor, not a separate backlog or
source of truth.

Frontend work remains tied to the main plan board in `docs/plans/index.md` and
the active state in `docs/handoff/current-state.md`. The frontend sub-conductor
adds shortcuts for resume, planning, mock-ups, implementation, review,
responsive checks, and design-system work.

## Consequences

- UI/UX can be planned and verified earlier in each module migration.
- UX parity with V1 is explicit: keep the workflow familiar unless a plan or ADR
  approves a change.
- UI improvements are encouraged when they improve clarity, responsiveness,
  accessibility, and role-aware operation.
- Agents must not treat frontend work as independent from data, permissions,
  notifications, or cutover readiness.
- Handoff obligations remain unchanged: non-trivial frontend work updates the
  current state, work log, plan index, and any relevant plan or ADR.
