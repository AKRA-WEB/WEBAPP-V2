# V2 Plan Index

Last updated: 2026-06-20

This is the central plan board for AKRA WEBAPP V2. It is the first file to read
after `CONDUCTOR.md` when another agent needs to continue work.

## Current Direction

V2 is in Phase 3 preparation. The core schema, Picking pilot schema, shared
catalog/warehouse baseline, and the real V1 core identity import (users,
roles, role_permissions) are applied and verified in staging. The Picking gate
(`V2-0010`), the read-only Picking pilot (`V2-0019`), and the create
requisition write slice (`V2-0020`) are all complete and verified in staging:
`/picking` list, `/picking/[id]` detail, and a guarded `/picking/new` create
flow with a shared-catalog product bridge and an atomic
`public.create_picking_requisition(...)` transaction. LINE send, in-app status
transitions, and problem reporting remain deferred — the next Picking slice is
still an open choice. `V2-0017` Main portal polish remains the alternate UI
track. `V2-0022` now records the full module-by-module timeline to reach V1
operational replacement and full parity closeout.

## Active Queue

1. `V2-0013` - Local baseline closeout
   - Status: Complete on 2026-06-19.
   - Outcome: all local changes (navigation shell, landing pages, planning templates, decisions, conductor setup, and project init guide) are verified, committed, and pushed.
   - File: `docs/plans/V2-0013-local-baseline-closeout.md`
2. `V2-0009` - Next execution sequence
   - Status: In progress; steps 1-5 complete. Real V1 core import (the
     deferred part of step 4) completed 2026-06-20: see ADR `0011` and the
     2026-06-20 work-log entry. Step 6 (Picking read-only pilot, `V2-0019`)
     completed 2026-06-20. The create requisition write slice (`V2-0020`)
     completed 2026-06-20.
   - Next action: pick the next Picking slice (LINE send, in-app status
     buttons, or problem reporting), or switch to `V2-0017` Main portal
     direction if the user prioritizes portal polish before more Picking
     workflow.
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
   - Status: Complete on 2026-06-20 for the first implementation slice.
   - Outcome: first Picking UI slice is read-only list/detail; create,
     problem/status workflows, and LINE integration are deferred.
   - File: `docs/plans/V2-0010-picking-product-scope-and-flow.md`
8. `V2-0019` - Picking read-only pilot
   - Status: Complete on 2026-06-20.
   - Outcome: permission-gated `/picking` list and `/picking/[id]` detail
     implemented against staging Supabase (`src/modules/picking/read-model.ts`,
     `format.ts`). Staging had zero Picking requisitions, so
     `scripts/picking-seed-staging-fixtures.mjs` (gated, project-ref checked,
     `legacy_source="v2_fixture"`) seeded 4 staging-only fixture requisitions
     covering pending/picked/sent/line_push_failed+problem states. Verified
     with a temporary local Playwright install against staging: ADMIN,
     PICKING_WRITER, PICKING_READER allowed; GUEST denied; signed-out shows
     sign-in required; no console errors. Found and fixed a pre-existing
     `.sidebar` mobile CSS bug (missing `min-inline-size: 0` let the nav strip
     blow out page width at narrow viewports); 390px list/detail now render
     with zero horizontal overflow. Playwright was removed after verification.
   - File: `docs/plans/V2-0019-picking-read-only-pilot.md`
9. `V2-0020` - Picking create requisition write slice
   - Status: Complete on 2026-06-20.
   - Outcome: migration `0009` (nullable catalog bridge on
     `picking_requisition_lines` + atomic `public.create_picking_requisition(...)`
     RPC, service-role-only) applied and verified on staging. Reference-data
     import (`scripts/picking-reference-import-{dry-run,apply}.mjs`) loaded
     4,761 Picking-source `catalog_product_aliases` (4,758 `matched_code`, 3
     `manual_review`) and 1 `picking_staff` row ("Chen") + LINE account row.
     `/picking/new` (guarded by `picking.write`) and a writer/admin-only "New
     requisition" link on `/picking` are implemented, calling
     `createPickingRequisition` (`src/modules/picking/create-action.ts`) via a
     new server-only admin client (`src/lib/supabase/admin.ts`). Verified on
     staging: atomic write (1 requisition + N lines + 1 `created` event), 5
     concurrent creates got 5 distinct `bill_no` values, and full role/mobile
     browser verification (signed-out, `GUEST`, `PICKING_READER`,
     `PICKING_WRITER`, `ADMIN`; 390px no overflow; no console errors) using a
     temporary local Playwright install (removed after). ADR `0015` records
     that `private` schema functions are not reachable via the Data API, so
     the atomic create function lives in `public` (SECURITY INVOKER,
     service-role-only) instead of `private`. LINE send, in-app status
     buttons, and problem reporting remain deferred — next slice still open.
   - File: `docs/plans/V2-0020-picking-create-requisition-write-slice.md`
10. `V2-0022` - Full V1 parity timeline
   - Status: Draft.
   - Outcome: records a dependency-ordered roadmap from the current Phase 3
     baseline through Main/Core portal, Picking closeout, PR/PO/GR,
     TRDAKRA/W5, Returnitem, KPITracker, and full hardening/cutover. The
     planning estimate is 7-9 weeks for aggressive operational replacement or
     10-12 weeks for safer full parity closeout, assuming one focused
     implementation stream and fast UAT. The concrete next-step chain now
     defaults to Main portal first, then Picking status transitions, Picking
     problem reporting, Picking LINE/failure recovery, Picking cutover package,
     PR/PO/GR foundation, PR, PO, GR, warehouse, Returnitem, KPI, and final
     hardening/cutover.
   - Next action: execute Phase 1 Main portal (`V2-0017`) first unless the
     user explicitly prioritizes Picking closeout instead.
   - File: `docs/plans/V2-0022-full-v1-parity-timeline.md`
11. `V2-0017` - Main portal design direction
   - Status: Draft.
   - Next action: confirm the hybrid direction: preserve V1 Main behavior and
     module mental model, but redesign the V2 Main portal instead of copying the
     V1 visual shell.
   - File: `docs/plans/V2-0017-main-portal-design-direction.md`
12. `V2-0011` - Conductor planning index
   - Status: Complete on 2026-06-19.
   - Outcome: root `CONDUCTOR.md` and this plan index now define the central
     resume/handoff workflow.
   - File: `docs/plans/V2-0011-conductor-planning-index.md`
13. `V2-0012` - Architect command format
   - Status: Complete on 2026-06-19.
   - Outcome: `Architect:` is now the standard plan-only command and a detailed
     template exists at `docs/plans/templates/architect-plan-template.md`.
   - File: `docs/plans/V2-0012-architect-command-format.md`
14. `V2-0021` - Handoff work-log archiving
   - Status: Complete on 2026-06-20.
   - Outcome: active `docs/handoff/work-log.md` now keeps recent entries only;
     2026-06-18 through 2026-06-19 entries were moved to
     `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`, with read
     rules updated in `AGENTS.md`, `CONDUCTOR.md`, and `README.md`.
   - File: `docs/plans/V2-0021-handoff-work-log-archiving.md`

## Completed Or Baseline Plans

| Plan | Status | Notes |
| --- | --- | --- |
| `V2-0003` | Baseline applied | Core identity/permission schema drafted, hardened, applied to staging, and DB-verified. |
| `V2-0004` | Complete | Core V1 import mapping exists; dry run complete under `V2-0015`; actual staging import completed 2026-06-20 (ADR `0011`). |
| `V2-0005` | Complete | Dashboard app registry helper and fallback were added. |
| `V2-0006` | Baseline applied | Picking pilot schema and V1 mapping drafted; staging schema applied and verified. |
| `V2-0007` | Complete | Repeatable static migration preflight added. |
| `V2-0008` | Complete | Staging migrations applied and verified; grant hardening recorded. |

## Open Decisions To Resolve Soon

- Whether the current direct-to-`main` solo-dev workflow should continue for
  V2 closeout commits or switch to PRs.
- Whether V1 users without email addresses receive synthetic staging emails or a
  different identity bridge.
- Whether LINE notification follows create requisition immediately or waits
  until in-app status/problem flows are proven.
- Whether Vercel Preview/Development should receive a server-only `DATABASE_URL`
  for transactional create verification, or create testing stays local until a
  private RPC/transaction path is added.
- Whether V2 Main should require sign-in immediately or show a signed-out portal
  state with a Sign In action.
- Whether queued modules should be visible to ordinary users during migration or
  only to admins/internal testers.
- Whether every module requires full historical import before cutover, or some
  V1 Sheets remain read-only archives after operational replacement.

## Update Rules

- Update this index whenever a plan is added, completed, blocked, superseded, or
  its next action changes.
- Keep detailed work history in `docs/handoff/work-log.md`, not in this index.
- Keep `docs/handoff/work-log.md` short; move older detailed history to
  `docs/handoff/archive/` and leave pointers in the active work log.
- Keep current operational status in `docs/handoff/current-state.md`.
- Do not remove historical plans unless they were created in error and have not
  been referenced by handoff docs.
