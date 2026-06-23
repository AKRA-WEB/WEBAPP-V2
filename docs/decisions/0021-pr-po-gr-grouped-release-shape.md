# ADR 0021: PR/PO/GR Grouped Operational Release Shape

Date: 2026-06-23

## Status

Accepted

## Context

`V2-0036` completed the PR/PO/GR foundation through staging schema
verification. The 9 `public.purchasing_*` and `public.receiving_*` tables now
exist in staging with RLS and explicit grants, but there is no PR/PO/GR data
import, runtime UI, or transaction RPC yet.

The next PR/PO/GR work is blocked on two project decisions:

- a fresh CSV export from the live V1 `PR` sheet is required before full PR
  import and PR-derived PO reconciliation;
- the release shape must be chosen before runtime writes are implemented.

V1 PR, PO, and GR are tightly coupled:

- PR approval creates PO rows using the PR UID;
- Direct PO bill identity must remain stable for GR grouping;
- GR rows link to specific PO line UIDs and affect receiving/closeout state.

## Decision

Use a **grouped PR/PO/GR operational release gate**.

Implementation may still proceed in small slices:

1. fresh PR CSV dry-run and reconciliation;
2. staging-only data import;
3. read-only PR, PO, and GR screens;
4. write actions in PR -> PO -> GR order;
5. end-to-end staging UAT;
6. grouped cutover package and rollback plan.

Production cutover should not happen for PR/PO alone while GR remains on V1
unless a separate ADR defines a temporary bridge/writeback model and assigns
clear source-of-truth ownership for each workflow action.

## Consequences

- Safer default: operators do not have to split one purchasing/receiving chain
  across V1 and V2.
- PR/PO/GR runtime write actions must be designed as one end-to-end workflow,
  even when implemented in small technical slices.
- Fresh PR export remains mandatory before import and final reconciliation.
- A staged PR/PO-first rollout is still possible, but only after a separate
  bridge plan proves V1 GR can safely receive V2-created production PO rows or
  V2 PR/PO writes remain non-production until GR is ready.
- Picking cutover remains separate and unaffected.

## Related

- Plan: `docs/plans/V2-0039-pr-po-gr-release-shape-decision.md`
- Plan: `docs/plans/V2-0036-pr-po-gr-foundation.md`
- Mapping: `docs/migration/pr-po-gr-v1-mapping.md`
- ADR: `docs/decisions/0016-module-by-module-v1-parity-sequence.md`
- ADR: `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
