# UI/UX Operating Model

Last updated: 2026-06-22

This document describes how UI/UX work should run alongside the AKRA WEBAPP V2
module migration. The short command rules live in `FRONTEND_CONDUCTOR.md`.

## Operating Principle

The correct model is not a fully separate frontend project. UI/UX should run as
a parallel lane inside the same migration plan board:

- Same module priority as the migration roadmap.
- Same source-of-truth docs and handoff rules.
- Same V1 isolation boundary.
- Frontend-specific checkpoints for mock-up, responsive behavior,
  accessibility, and role-aware states.

## V1 And V2 Rule

- UX should remain familiar to V1 users unless a plan or ADR records an approved
  improvement.
- UI can be improved when the improvement makes the workflow clearer, faster,
  more responsive, or easier to operate on mobile.
- Proposed improvements should be visible in a mock-up before runtime
  implementation when the screen is business-critical or user-facing.

## Frontend Lifecycle

1. Capture V1 behavior: task path, labels, user roles, required fields, success
   and error states, and any notification side effects.
2. Align with migration scope: data availability, permission model, server
   actions/RPCs, and cutover risk.
3. Draft the UI approach: update a plan or create a static mock-up when useful.
4. Implement the smallest approved slice.
5. Verify desktop and mobile behavior, especially at a 390px viewport.
6. Update handoff docs with checks, screenshots or mock-up paths when relevant,
   and any remaining frontend risks.

## Responsive Baseline

- No horizontal overflow at 390px in normal mobile use.
- Tables, long IDs, emails, product names, and status labels must wrap or
  collapse intentionally.
- Primary actions must remain reachable without covering critical content.
- Touch targets should be operationally usable, not only visually compact.
- Loading, empty, denied, and signed-out states should not rely on desktop-only
  layout assumptions.

## Review Checklist

- Does the screen still follow the V1 mental model for the same task?
- Are V2 improvements obvious without forcing retraining?
- Are permissions reflected in both navigation and route-level behavior?
- Are mobile layouts usable for warehouse or operational contexts?
- Are error and retry states visible enough for real work?
- Are mock-ups, plans, and handoff docs updated so the next agent can continue
  without chat history?
