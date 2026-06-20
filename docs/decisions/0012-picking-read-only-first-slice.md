# ADR 0012: Picking Starts With A Read-Only List And Detail Slice

Date: 2026-06-20

## Status

Accepted

## Context

The V2 Picking schema, RLS policies, shared catalog baseline, core import, and
server-side permission guard are ready in staging. The next work moves from
database readiness into user-facing module routes.

V1 Picking has several connected behaviors: requisition creation, daily visible
bill numbers, LINE notification/postback actions, status transitions, and
problem reporting. Implementing all of that in the first V2 UI slice would make
permission, data display, write transactions, token handling, and notification
failure modes hard to isolate.

## Decision

The first coded Picking pilot slice will be read-only:

- `/picking` lists recent requisitions.
- `/picking/[id]` shows requisition detail, lines, and lifecycle events.
- Access requires `picking.read` or `picking.write` through the reusable server
  guard.
- Reads should use normal authenticated Supabase server access so RLS remains
  part of verification.
- Create requisition, daily bill number allocation, status actions, problem
  reporting UI, and LINE integration are deferred to later slices.
- If staging has no requisition rows, synthetic staging-only fixture data may be
  created with an explicit confirmation flag. Fixture rows must be clearly
  distinguishable from imported V1 data.
- Do not introduce a separate Picking product-master import in this slice.
  Future product selection should bridge to the shared catalog baseline from
  `V2-0018`.

## Consequences

- The first Picking route can verify auth, permissions, RLS, routing, list UI,
  detail UI, and mobile rendering without write-side complexity.
- Create and LINE work stay server-side and can be tested after the read path
  is stable.
- V1 Picking remains the live system. No V1 frontend, GAS backend, Sheet,
  GitHub Pages deployment, live URL, or LINE token changes are required.
- Future agents should use `docs/plans/V2-0019-picking-read-only-pilot.md` as
  the execution plan for the first Picking UI slice.
