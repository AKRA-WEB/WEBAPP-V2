# ADR 0018: Picking Problem, LINE Staging, And History Decisions

Date: 2026-06-20

## Status

Accepted

## Context

After `V2-0023`, Picking can create requisitions and move statuses through
`pending -> picked -> sent`. The next slices are problem reporting, LINE
notification/failure recovery, and the Picking cutover package.

Three workflow choices needed user decisions before implementation:

- whether a problem report on a `pending` bill should also mark the bill as
  `picked`, matching V1's `problem.html` side effect;
- whether LINE staging tests should send real messages or start with disabled
  send/dry-run behavior;
- whether V1 Picking history should be imported into V2 or kept as an archive.

## Decision

1. A Picking problem report on a `pending` requisition must **not** mark the
   requisition as `picked`.
2. LINE staging starts with disabled send/dry-run behavior. Real LINE sends
   require a later explicit approval.
3. V1 Picking history stays as a read-only archive for backward lookup instead
   of being imported into V2 for the first cutover package.

## Consequences

- Problem reporting becomes an exception signal, not an implicit pick action.
- Status transitions stay explicit through the existing status-transition
  action path.
- V2 diverges intentionally from V1's pending-problem side effect; this must be
  reflected in UI copy, events, and tests.
- LINE implementation can be developed and verified without creating external
  operator-facing side effects.
- Picking cutover is simpler and lower risk because the first cutover package
  does not need full V1 requisition-history import.
- V1 history must remain accessible as a documented archive after cutover.

## Related

- Plan: `docs/plans/V2-0022-full-v1-parity-timeline.md`
- Next slice: Picking problem reporting
- Mapping: `docs/migration/picking-v1-mapping.md`
- Decision board: `docs/project-management/decision-board.md`
