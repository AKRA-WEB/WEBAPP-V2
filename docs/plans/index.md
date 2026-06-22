# V2 Plan Index

Last updated: 2026-06-22

This is the central plan board for AKRA WEBAPP V2. It is the first file to read
after `CONDUCTOR.md` when another agent needs to continue work.

## Current Direction

V2 is in Phase 3 preparation. The core schema, Picking pilot schema, shared
catalog/warehouse baseline, and the real V1 core identity import (users,
roles, role_permissions) are applied and verified in staging. The Picking gate
(`V2-0010`), the read-only Picking pilot (`V2-0019`), the create requisition
write slice (`V2-0020`), and the status-transition slice (`V2-0023`) are all
complete and verified in staging: `/picking` list, `/picking/[id]` detail
(now with "Mark picked"/"Mark sent" actions), a guarded `/picking/new` create
flow with a shared-catalog product bridge, an atomic
`public.create_picking_requisition(...)` transaction, and an atomic
`public.transition_picking_requisition_status(...)` transaction enforcing
`pending -> picked -> sent` only. Picking problem reporting (`V2-0025`) is
also complete: an atomic `public.report_picking_problem(...)` transaction
records per-line requested-vs-actual quantities without changing requisition
status (ADR `0018`), surfaced via a guarded `/picking/[id]/problem` form and a
"Problem reports" read section on `/picking/[id]`. Picking LINE
notification/failure recovery (`V2-0027`) is also complete: notification
outcome (`sent`/`skipped`/`failed`) is recorded as a lifecycle event only and
never changes requisition status (a deliberate V1-faithful divergence from
the schema's reserved `line_push_failed` status value), defaulting to
disabled/dry-run with a writer/admin "Retry LINE notification" action on
`/picking/[id]`; real LINE sends remain unproven pending real credentials and
explicit approval. `V2-0017` Main portal redesign is now complete (`/`
is permission-filtered, Thai-first, with a signed-out portal state). `V2-0022`
now records the full module-by-module timeline to reach V1 operational
replacement and full parity closeout; per that plan's next-step chain, the
Picking cutover package is the recommended next slice.
Project management has also been standardized in `V2-0024`: active status
belongs in this index and `docs/handoff/current-state.md`, the active work log
is capped to recent entries, and `docs/project-management/decision-board.md`
tracks recommendations for user review.
`V2-0026` adds a static HTML database/data-flow reference for the current
implemented schema and planned app/module flows. `V2-0028` adds a
management-friendly Thai executive summary at
`docs/project-management/executive-summary-th.md` for presenting the project
status, current capabilities, stack, and roadmap to supervisors.

## Active Queue

1. `V2-0013` - Local baseline closeout
   - Status: Complete on 2026-06-19.
   - Outcome: all local changes (navigation shell, landing pages, planning templates, decisions, conductor setup, and project init guide) are verified, committed, and pushed.
   - File: `docs/plans/V2-0013-local-baseline-closeout.md`
2. `V2-0009` - Next execution sequence
   - Status: In progress; steps 1-5 complete. Real V1 core import (the
     deferred part of step 4) completed 2026-06-20: see ADR `0011` and the
     2026-06-20 work-log entry. Step 6 (Picking read-only pilot, `V2-0019`)
     completed 2026-06-20. The create requisition write slice (`V2-0020`) and
     the status-transition slice (`V2-0023`) both completed 2026-06-20.
   - Next action: LINE notification/failure recovery is the next Picking
     slice per `V2-0022`'s chain (problem reporting, `V2-0025`, is complete).
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
   - Next action: LINE notification/failure recovery is next (status
     transitions `V2-0023` and problem reporting `V2-0025` are complete).
   - File: `docs/plans/V2-0022-full-v1-parity-timeline.md`
11. `V2-0017` - Main portal design direction
   - Status: Complete on 2026-06-20.
   - Outcome: user confirmed the hybrid direction via `Go:` (build now,
     Thai-first V1 labels, signed-out portal with Sign In CTA). `/` now
     branches not-configured/signed-out/signed-in, filters the app registry
     into allowed-vs-queued by permission (closing a pre-existing gap where
     every module was a clickable link regardless of permission), shows Thai
     one-line module descriptions, surfaces signed-in user/role and an admin
     shortcut, and demotes the former dashboard stats to a secondary panel.
     ADR `0008` accepted. Also added the plan's spec'd empty state (no
     allowed modules) after an advisor review caught it was missing.
     Verified against staging as signed-out, `GUEST` (empty state, 0 allowed
     cards), `PICKING_READER` (1 allowed module, 6 permission-denied notes,
     no admin shortcut), and `ADMIN` (7 allowed modules, admin shortcut
     present); 390px viewport zero overflow; no console errors; screenshots
     confirmed Thai text/layout render correctly.
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
15. `V2-0023` - Picking status transitions
   - Status: Complete on 2026-06-20.
   - Outcome: migration `0010` adds atomic
     `public.transition_picking_requisition_status(...)` (service-role-only,
     mirrors `0009`'s posture), enforcing `pending -> picked` and
     `picked -> sent` only. Fixed a real PL/pgSQL column-ambiguity bug found
     during smoke-testing (the function's `returns table (id, status)` clause
     shadowed the table's own `id`/`status` columns). Added
     `src/modules/picking/transition-action.ts` and "Mark picked"/"Mark sent"
     buttons on `/picking/[id]`, gated by `picking.write`. Verified via direct
     RPC smoke test (valid forward path, rejected `pending -> sent`, rejected
     repeat transitions) and browser verification (`PICKING_READER` no
     buttons, `PICKING_WRITER` full flow at 390px, `ADMIN` can transition, no
     console errors) using a temporary local Playwright install (removed
     after).
   - File: `docs/plans/V2-0023-picking-status-transitions.md`
16. `V2-0024` - Project management operating model
   - Status: Complete on 2026-06-20.
   - Outcome: standardized source-of-truth hierarchy, context-budget rules,
     active work-log archiving, decision board, definition of done, and
     project-management operating cadence. Added
     `docs/project-management/operating-model.md` and
     `docs/project-management/decision-board.md`; archived older active-log
     entries into
     `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`.
   - Next action: use the decision board for proposed next moves; current
     recommendation is LINE notification/failure recovery (problem reporting,
     `V2-0025`, is complete).
   - File: `docs/plans/V2-0024-project-management-operating-model.md`
17. `V2-0026` - Database structure data-flow HTML
   - Status: Complete on 2026-06-20.
   - Outcome: added `docs/database/data-flow.html`, a static HTML reference
     showing database structure and data flow by app/module. It distinguishes
     verified/staging baseline objects, local uncommitted Picking
     problem-reporting work, and planned future PR/PO/GR, warehouse,
     Returnitem, KPI, and notification schemas.
   - File: `docs/plans/V2-0026-database-data-flow-html.md`
18. `V2-0025` - Picking problem reporting
   - Status: Complete on 2026-06-20.
   - Outcome: migration `0011` adds atomic
     `public.report_picking_problem(...)` (service-role-only, mirrors
     `0009`/`0010`'s posture), writing a `picking_problem_reports` row, its
     `picking_problem_report_lines`, the requisition's
     `problem_by_name`/`problem_at` columns, and a `problem_reported`
     lifecycle event in one transaction — without changing requisition status
     (ADR `0018`); rejects the call once the requisition is `sent`. Added
     `src/modules/picking/problem-action.ts` (`reportPickingProblem`,
     `picking.write`-gated, server-validated line ownership, DB-sourced
     product/qty/unit so only `actual_qty`/`note` are client-trusted),
     extended `read-model.ts` to load problem reports through the normal
     RLS-enforced client, added a guarded `/picking/[id]/problem` form and a
     writer/admin-only "Report problem" link + "Problem reports" read
     section on `/picking/[id]`. Verified via direct RPC smoke test (status
     unchanged on `pending`/`picked`, rejected on `sent`, resubmission is
     additive) and full browser verification (`PICKING_WRITER` submit ->
     redirect -> rendered report -> link hides once `sent`;
     `PICKING_READER` can read the report's lines via RLS but is denied on
     the write form; zero overflow at 390px; no console errors). Found and
     fixed a real 2px mobile-overflow regression caused by a long unbroken
     test-account email inside a `white-space: nowrap` class.
   - File: `docs/plans/V2-0025-picking-problem-reporting.md`
19. `V2-0028` - Management executive summary
   - Status: Complete on 2026-06-22.
   - Outcome: added `docs/project-management/executive-summary-th.md`, a
     Thai, management-friendly overview explaining the project purpose, stack,
     current staging-verified capabilities, unfinished areas, roadmap, and
     supervisor presentation talking points. Documentation-only; no runtime
     code, schema, staging data, V1 production files, secrets, or LINE tokens
     changed.
   - File: `docs/plans/V2-0028-management-executive-summary.md`
20. `V2-0027` - Picking LINE notification and failure recovery
   - Status: Complete on 2026-06-22.
   - Outcome: migration `0012` widens `picking_requisition_events_type_check`
     to add `line_notification_sent`/`line_notification_skipped`
     (`line_push_failed` already existed). No new tables/RPC — outcome is a
     single admin-client event insert (plus an optional
     `picking_requisition_secrets` upsert on a real-send success). Per an
     advisor-flagged decision, notification failure never changes
     `picking_requisitions.status` (V1-faithful: V1's own push failure is
     non-blocking); the reserved `line_push_failed` status value stays
     unused. Added `src/modules/picking/line-notification.ts`
     (`sendPickingLineNotification`: dry-run by default via
     `PICKING_LINE_PUSH_ENABLED`, fails cleanly with zero network calls when
     enabled without `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID`, real-send branch
     unproven) and `src/modules/picking/line-notification-action.ts`
     (`retryPickingLineNotification`, `picking.write`-gated). Hooked into
     `create-action.ts` after a successful create (own `try/catch`, before
     `redirect()`). Added a "Retry LINE notification" button to
     `/picking/[id]` shown when the latest LINE event is `line_push_failed`.
     Verified end to end through the real app (not just direct DB calls)
     with a temporary local Playwright install: default-disabled path,
     enabled-without-credentials failure path (zero network calls), repeated
     failure (idempotent), and retry-after-fix recovery (button disappears)
     all confirmed; role gating (`PICKING_READER` never sees the button) and
     390px/no-console-error checks passed. Also archived 5 older work-log
     entries to stay under the context budget.
   - File: `docs/plans/V2-0027-picking-line-notification-failure-recovery.md`

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
- Resolved (`V2-0027`, 2026-06-22): LINE notification is attempted at create
  time, dry-run/disabled by default; in-app status/problem flows were already
  proven first (`V2-0023`/`V2-0025`).
- Whether Vercel Preview/Development should receive a server-only `DATABASE_URL`
  for transactional create verification, or create testing stays local until a
  private RPC/transaction path is added.
- Whether every module requires full historical import before cutover, or some
  V1 Sheets remain read-only archives after operational replacement.
- For non-Picking modules, which notification paths require parity before
  cutover versus after operational replacement.

## Update Rules

- Update this index whenever a plan is added, completed, blocked, superseded, or
  its next action changes.
- Keep detailed work history in `docs/handoff/work-log.md`, not in this index.
- Keep `docs/handoff/work-log.md` short; move older detailed history to
  `docs/handoff/archive/` and leave pointers in the active work log.
- Keep current operational status in `docs/handoff/current-state.md`.
- Do not remove historical plans unless they were created in error and have not
  been referenced by handoff docs.
