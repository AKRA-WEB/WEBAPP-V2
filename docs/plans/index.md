# V2 Plan Index

Last updated: 2026-06-20

This is the central plan board for AKRA WEBAPP V2. It is the first file to read
after `CONDUCTOR.md` when another agent needs to continue work.

## Current Direction

V2 is in Phase 3 preparation. The core schema, Picking pilot schema, and shared
catalog/warehouse baseline are applied and verified in staging. The next
implementation work should finish the actual V1 core import and then return to
the Picking gate before write workflows.

## Active Queue

1. `V2-0013` - Local baseline closeout
   - Status: Complete on 2026-06-19.
   - Outcome: all local changes (navigation shell, landing pages, planning templates, decisions, conductor setup, and project init guide) are verified, committed, and pushed.
   - File: `docs/plans/V2-0013-local-baseline-closeout.md`
2. `V2-0009` - Next execution sequence
   - Status: In progress; steps 1-5 are complete.
   - Next action: prepare and run the actual V1 core import, then return to the
     Picking pilot gate (`V2-0010`).
   - File: `docs/plans/V2-0009-next-execution-sequence.md`
3. `V2-0014` - Deployment boundary and staging access
   - Status: Complete on 2026-06-19.
   - Outcome: Production/Preview/Development environment scope is recorded (Vercel Production remains disconnected from staging), test roles (PICKING_WRITER, PICKING_READER, GUEST) created, and non-admin test users created.
   - File: `docs/plans/V2-0014-deployment-boundary-and-staging-access.md`
4. `V2-0015` - Core import dry run
   - Status: Complete on 2026-06-19.
   - Outcome: Built dry-run validation script `scripts/core-import-dry-run.mjs` checking V1 snapshots, normalizing roles/permissions, generating synthetic emails, and querying staging DB via HTTPS API.
   - File: `docs/plans/V2-0015-core-import-dry-run.md`

5. `V2-0018` - Shared catalog and warehouse data structure
   - Status: Complete after 2026-06-20 correction.
   - Outcome: Ran profiling dry-run and transformer, applied SQL migration `0008_shared_catalog_schema.sql`, imported staging catalog/warehouse data, corrected business scope rules (W1=TRD; W2, W3, W4, W5, C1, C2=AKRA; TRDAKRA Product defaults to `akra_trd`), and verified staging aggregates.
   - File: `docs/plans/V2-0018-shared-catalog-warehouse-data-structure.md`
6. `V2-0016` - Server permission guard pattern
   - Status: Complete on 2026-06-19.
   - Outcome: implemented `requirePermission` helper in `src/modules/auth/guard.ts` supporting anyOf/allOf checks and admin bypass, refactored `/admin/permissions` to use the guard, and created reusable `AccessDenied` UI.
   - File: `docs/plans/V2-0016-server-permission-guard-pattern.md`
7. `V2-0010` - Picking product scope and user-flow gate
   - Status: Draft; required before implementing Picking UI or write actions.
   - Next action: revisit after `V2-0014` and `V2-0016`; confirm first Picking
     slice and open decisions before coding.
   - File: `docs/plans/V2-0010-picking-product-scope-and-flow.md`
8. `V2-0017` - Main portal design direction
   - Status: Draft.
   - Next action: confirm the hybrid direction: preserve V1 Main behavior and
     module mental model, but redesign the V2 Main portal instead of copying the
     V1 visual shell.
   - File: `docs/plans/V2-0017-main-portal-design-direction.md`
9. `V2-0011` - Conductor planning index
   - Status: Complete on 2026-06-19.
   - Outcome: root `CONDUCTOR.md` and this plan index now define the central
     resume/handoff workflow.
   - File: `docs/plans/V2-0011-conductor-planning-index.md`
10. `V2-0012` - Architect command format
   - Status: Complete on 2026-06-19.
   - Outcome: `Architect:` is now the standard plan-only command and a detailed
     template exists at `docs/plans/templates/architect-plan-template.md`.
   - File: `docs/plans/V2-0012-architect-command-format.md`

## Completed Or Baseline Plans

| Plan | Status | Notes |
| --- | --- | --- |
| `V2-0003` | Baseline applied | Core identity/permission schema drafted, hardened, applied to staging, and DB-verified. |
| `V2-0004` | Mapping drafted | Core V1 import mapping exists; dry run is complete under `V2-0015`; actual staging import is still pending. |
| `V2-0005` | Complete | Dashboard app registry helper and fallback were added. |
| `V2-0006` | Baseline applied | Picking pilot schema and V1 mapping drafted; staging schema applied and verified. |
| `V2-0007` | Complete | Repeatable static migration preflight added. |
| `V2-0008` | Complete | Staging migrations applied and verified; grant hardening recorded. |

## Open Decisions To Resolve Soon

- Whether the current direct-to-`main` solo-dev workflow should continue for
  V2 closeout commits or switch to PRs.
- Whether V1 users without email addresses receive synthetic staging emails or a
  different identity bridge.
- Whether Picking implementation should start with read-only list/detail only or
  include create requisition in the first coded slice.
- Whether LINE notification follows create requisition immediately or waits
  until in-app status/problem flows are proven.
- Whether V2 Main should require sign-in immediately or show a signed-out portal
  state with a Sign In action.
- Whether queued modules should be visible to ordinary users during migration or
  only to admins/internal testers.

## Update Rules

- Update this index whenever a plan is added, completed, blocked, superseded, or
  its next action changes.
- Keep detailed work history in `docs/handoff/work-log.md`, not in this index.
- Keep current operational status in `docs/handoff/current-state.md`.
- Do not remove historical plans unless they were created in error and have not
  been referenced by handoff docs.
