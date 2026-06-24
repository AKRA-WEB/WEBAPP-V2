# V2 Plan Index

Last updated: 2026-06-24

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
status, current capabilities, stack, and roadmap to supervisors. `V2-0029`
adds a static UI/UX mock-up at `docs/mockups/v2-ui-ux-mockup.html`, preserving
V1 workflow familiarity while proposing improved V2 responsive UI patterns.
`V2-0030` adds `FRONTEND_CONDUCTOR.md` as a frontend sub-conductor with
shortcuts for UI/UX resume, planning, mock-ups, implementation, review,
responsive checks, and design-system work. `V2-0031` adds `Gemini.md` as the
Gemini-specific companion for frontend design, UI/UX critique, mock-up support,
responsive review, and implementation advice. `V2-0034` prepares the Picking
cutover package (`docs/migration/picking-cutover-package.md`): V1 history
archive note, a real staging data-reconciliation query (4 fixture
requisitions only, no leftover test rows), a UAT checklist, a filled
module cutover checklist, and a rollback plan. It deliberately does not
declare Picking cut over — deployed Vercel Preview/Development verification
and one combined human UAT pass remain open, user-gated items. `V2-0036`
foundation work is now complete: V1 source profiling confirmed a live `PR`
sheet with no CSV export yet, `scripts/pr-po-gr-import-dry-run.mjs` profiled
`PO`/`GR`/`ProductName`/`Vendor` against staging (0 blockers, 7 warnings — see
`docs/migration/pr-po-gr-v1-mapping.md`), ADR `0020` locked the schema/RLS
shape, and `supabase/migrations/0013_pr_po_gr_foundation.sql` has been
applied and verified in staging (36 public tables, 34 RLS policies). No
PR/PO/GR data import, runtime UI, or RPCs exist yet; after `V2-0040`, the next
PR/PO/GR gate is deciding how to handle 3 PR-derived PO rows with no source PR
row before staging import planning.
`V2-0039` accepts that PR/PO/GR should cut over as one grouped operational
release after end-to-end staging UAT, while still allowing small
implementation slices. `V2-0040` executed the read-only PR -> PO -> GR
reconciliation dry-run against the current empty PR source. `V2-0037`
designed and implemented the Purchase Requisition (PR) module frontend mockup
under `docs/mockups/pr-ui-ux-mockup.html`. `V2-0038` designed and implemented
the KPI Tracker module frontend mockup under
`docs/mockups/kpi-ui-ux-mockup.html`. `V2-0042` adds Obsidian-friendly docs
entrypoints (`docs/00-dashboard.md`, active-plan, decision, and migration
maps) and ignores local `.obsidian/` folders so project docs can be browsed as
a vault without committing editor workspace state. `V2-0043` adds
`docs/architecture/app-flow-diagrams.md`, Mermaid flowcharts for all 8
modules labeled by real implementation status. `V2-0040`'s last open
question is now resolved (ADR `0022`, 2026-06-24): the 3 PR-derived PO rows
with no source PR row import as manual-review/nullable PR linkage, with no
historical PR-row recovery and no schema change. `V2-0044` (2026-06-24,
Complete) executed the staging PO/GR/PR import: ADR `0023` accepted a
full-snapshot import; the real run loaded 253 PO headers/748 lines, 588 GR
headers/1868 lines/6 splits, 0 PR rows into the locked `0013` schema (PR
source still empty), verified by 16 read-only checks and an idempotent
second run. Migration `0014` widened the event-type checks for the import
audit trail, and ADR `0026` records the synthesized `LEGACY-*` `po_number`
needed for 251/253 headers whose V1 source `PO_Number` was blank. No
runtime PR/PO/GR UI yet. `V2-0045` (2026-06-24) completed the schema/master/folder hardening
requested after review: added a human-readable schema catalog, accepted ADR
`0024` for master-data vocabulary and folder boundaries, tracked placeholder
domain module folders with README files, and added `scripts/lib/` guidance for
shared import helpers. No runtime code, migration SQL, staging data, V1
production files, or secrets changed. `V2-0046` (2026-06-24, Draft) now plans
the operational-readiness gate requested before PR/PO/GR write workflow:
Environment Matrix, Monitoring/Observability, Backup/DR, and Rollback.
ADR `0025` accepts the gate: `V2-0044` staging import/read-only validation may
continue, but transactional PR/PO/GR writes should wait until the readiness
package is approved; production cutover requires implemented and verified
readiness checks.
`V2-0047` (2026-06-24, Complete) executed the first read-only PR/PO/GR UI
slice: permission-gated `/purchasing` + `/purchasing/[id]` (PO list/detail)
and `/receiving` + `/receiving/[id]` (GR list/detail, including line splits),
reading the real rows `V2-0044` already imported. Not blocked by
`V2-0046`/ADR `0025` (that gate covers write workflow only). Confirmed and
fixed the planned `.read`-vs-`.write` permission gap using
`anyOf: [".read", ".write"]` at the page level (Picking's existing pattern),
proven against a synthetic `SUPERVISOR`-role test account (holds
`purchasing.write`/`receiving.write`, no `.read`) — previously denied by the
shared `ModuleLandingPage`'s single-permission check, now allowed. Verified
end to end with a temporary local Playwright install against real imported
data (legacy `po_number` caption, ADR-`0022` PR-linkage note, orphan-GR
note all render correctly); zero console errors, zero mobile overflow.

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
   - Next action: Picking cutover package (`V2-0034`) is prepared but not
     approved — deployed Vercel Preview/Development verification and one
     combined human UAT pass are open, user-gated items per
     `docs/migration/picking-cutover-package.md`.
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
   - Next action: Picking cutover package (`V2-0034`) is prepared; the user
     must decide on the two open gates (deployed verification, combined UAT)
     before PR/PO/GR foundation planning starts.
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
   - Next action: use the decision board for proposed next moves; the Picking
     cutover package (`V2-0034`) is prepared and awaiting a user decision on
     its two open gates.
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
21. `V2-0029` - UI/UX mock-up
   - Status: Complete on 2026-06-22.
   - Outcome: added `docs/mockups/v2-ui-ux-mockup.html`, a static mock-up for
     Main portal, Picking board, create requisition, detail/problem flow,
     mobile preview, and UX notes. It records the working direction that V2 UX
     should stay familiar to V1 while UI may improve visual hierarchy,
     responsive behavior, status visibility, and role-aware actions.
   - File: `docs/plans/V2-0029-ui-ux-mockup.md`
22. `V2-0030` - Frontend conductor and shortcuts
   - Status: Complete on 2026-06-22.
   - Outcome: added `FRONTEND_CONDUCTOR.md`, frontend shortcut commands,
     `docs/frontend/ui-ux-operating-model.md`, and ADR `0019`. Frontend work
     is now defined as a sub-conductor lane inside the same migration plan
     board, not a separate source of truth.
   - File: `docs/plans/V2-0030-frontend-conductor-and-shortcuts.md`
23. `V2-0031` - Gemini frontend instructions
   - Status: Complete on 2026-06-22.
   - Outcome: added `Gemini.md` and linked it from `AGENTS.md`,
     `CONDUCTOR.md`, `README.md`, and `FRONTEND_CONDUCTOR.md`. Gemini is now
     documented as a frontend/UI/UX design and review companion under the
     frontend sub-conductor, not a separate source of truth or execution
     authority.
   - File: `docs/plans/V2-0031-gemini-frontend-instructions.md`
24. `V2-0032` - Frontend UI/UX module roadmap
   - Status: Complete on 2026-06-22 (documentation only).
   - Outcome: defined the Frontend UI/UX roadmap for all remaining V2 modules (PO, PR, GR, KPI, AKRA, TRDAKRA, Picking), detailing pages to build, V1 UX parity, V2 UI improvements, mobile responsive boundaries, and dependencies.
   - File: `docs/plans/V2-0032-frontend-ui-ux-module-roadmap.md`
25. `V2-0033` - PO Frontend UI/UX Mock-up
   - Status: Complete on 2026-06-22 (mockup phase).
   - Outcome: designed and implemented the Purchasing Orders (PO) module frontend mockup under `docs/mockups/po-ui-ux-mockup.html`, demonstrating active list, detail review, direct PO isolation rules, interactive role matrix toggles, and responsive device layout simulation.
   - File: `docs/plans/V2-0033-po-frontend-mockup.md`
26. `V2-0034` - Picking cutover package
   - Status: Prepared on 2026-06-22; not approved. Updated 2026-06-22 in
     response to `Review: V2-0034` feedback (5 findings, all verified
     accurate).
   - Outcome: added `docs/migration/picking-cutover-package.md`. Documents
     the V1 history archive answer (V1 Picking stays live/unchanged for
     pre-cutover lookups), a real staging data-reconciliation query (4
     `v2_fixture` requisitions only, zero leftover `v2_app` test rows, 0
     problem-report/secret rows — confirms prior slices' cleanup claims), a
     UAT checklist, a fully filled `docs/migration/cutover-checklist.md`
     instance, and a rollback plan. Explicitly does **not** check off
     deployed Vercel Preview/Development verification (local `main` is 2
     commits ahead of `origin/main`, and the local Vercel CLI account cannot
     reach the real project's team scope) or a combined human UAT pass —
     both are named as open, user-gated decisions rather than silently
     marked done. Review response added: a re-runnable
     reconciliation script (`scripts/verify-picking-cutover-reconciliation.mjs`,
     `npm run picking:verify-cutover-reconciliation`, replacing a deleted
     one-off query — numbers unchanged); a reference-data freshness section
     (3a) clarifying the existing check only proves snapshot-internal
     consistency, not live-V1 freshness, with a fresh-export step still
     required pre-cutover; and a concrete cutover runbook (section 5a:
     pause/redirect V1 — a business action outside this repo's authority,
     enable the V2 production route, notify users, rollback).
   - File: `docs/plans/V2-0034-picking-cutover-package.md`
27. `V2-0035` - GR Frontend UI/UX Mock-up
   - Status: Complete on 2026-06-22 (Updated on 2026-06-22 with dynamic V1 parity).
   - Outcome: designed and implemented the Goods Receiving (GR) mobile-first frontend mockup under `docs/mockups/gr-ui-ux-mockup.html`, achieving strict V1 layout parity. Based on feedback, upgraded the mockup to be fully dynamic, generating the 14-day calendar grid (displaying date, day badge, and vendor confirmed/estimated pills), warehouse filter chips with counts, PO cards, and status-gated action buttons (Draft, Review, Confirm, Recall, Reset) dynamically in Javascript, including automated field lockout.
   - File: `docs/plans/V2-0035-gr-frontend-mockup.md`
28. `V2-0036` - PR/PO/GR foundation
   - Status: In progress on 2026-06-22 — source profiling + dry-run report,
     schema/RLS lock, migration `0013` draft, and staging apply +
     verification are all complete. Remaining work is future PR/PO/GR data
     import and runtime UI, now gated on the `V2-0040` manual-review/import
     decision for 3 PR-derived PO rows with no source PR row.
   - Outcome: plans the grouped purchasing/receiving foundation before
     implementation: V1 source profiling, PR source confirmation, dry-run
     import report, Direct PO identity preservation, proposed
     `public.purchasing_*` / `public.receiving_*` table families, RLS/grant
     posture, staging-only migration verification, and later PR/PO/GR UI
     sequencing. Executed the first implementation slice
     (`Go: ทำ V2-0036 เฉพาะ PR/PO/GR source profiling + dry-run report`):
     added `docs/migration/pr-po-gr-v1-mapping.md` (confirms a live V1 `PR`
     sheet exists but has no CSV export yet; documents V1's own PO
     bill-grouping key, lift-fee/extra-item Remark tag formats, and a real
     `PO.csv` header mismatch — no `Expected_Date` column in the export
     despite `Code.gs.txt` documenting one) and
     `scripts/pr-po-gr-import-dry-run.mjs` (+ npm alias
     `pr-po-gr:import-dry-run`), which profiles `PO.csv`/`GR.csv`/
     `ProductName.csv`/`Vendor.csv` and cross-matches against staging
     `catalog_products`/`catalog_vendors`/`warehouse_warehouses`. Result: 0
     blockers, 7 warnings (no PR CSV export; 233 ambiguous bare-`DIRECT`
     bill groups, largest 21 lines; 10 orphan GR `Ref_PO_UID`; GR date
     issues split into 16 genuinely malformed vs 54 epoch-zero export
     artifacts vs 7 `-`-placeholder dates; 5 unmatched PO SKUs; 2 PO
     products needing manual catalog review). No schema/migration, staging
     data, V1 production files, or secrets changed; `lint`/`typecheck`/
     `build`/`git diff --check` all pass.
   - Schema/RLS lock (`Architect: ล็อก schema/RLS...`, 2026-06-22): ADR
     `0020` fixes migration `0013` as a schema-only foundation using
     `public.purchasing_*` / `public.receiving_*` tables, nullable legacy
     bridges for missing PR CSV / `Expected_Date` / orphan GR rows, explicit
     grants, RLS, and current coarse permissions only
     (`purchasing.read/write`, `receiving.read/write`).
   - Migration drafted and applied (`Go: draft V2-0036 migration 0013
     schema/RLS foundation only`, then `ok go next`, 2026-06-22): added
     `supabase/migrations/0013_pr_po_gr_foundation.sql` — the 9 ADR-`0020`
     tables (`purchasing_purchase_requests/_lines`,
     `purchasing_purchase_orders/_lines`, `purchasing_events`,
     `receiving_goods_receipts/_lines`, `receiving_line_splits`,
     `receiving_events`), all RLS-enabled with explicit grants and
     permission-based select policies, no data import, no UI, no RPCs. One
     schema judgment call beyond the plan's literal field list:
     `receiving_goods_receipts.purchase_order_id` is nullable (re-reading
     the mapping doc showed GR rows resolve a PO bill only via a PO-line
     match, so orphan `Ref_PO_UID` rows can't resolve either) — documented
     inline and in the plan's handoff notes. Applied to staging:
     `npm run check:migrations` and `npm run db:verify-staging-schema` both
     pass (36 public tables, 34 RLS policies); a live anon Data API call
     against two new tables returned `HTTP 401`, matching `V2-0008`'s
     precedent.
   - Next action: task breakdown items 4-7 are all done. Remaining
     `V2-0036` work is future PR/PO/GR data import and runtime UI; after
     `V2-0039`/`V2-0040`, the next gate is deciding how to handle 3
     PR-derived PO rows with no source PR row before staging import planning.
   - File: `docs/plans/V2-0036-pr-po-gr-foundation.md`
29. `V2-0037` - PR Frontend UI/UX Mock-up
   - Status: Complete on 2026-06-22 (Mockup phase).
   - Outcome: designed and implemented the Purchase Requisition (PR) module frontend mockup under `docs/mockups/pr-ui-ux-mockup.html`, demonstrating active form submission, dynamic autocomplete suggestion list with matching/freetext badges, collapsible history list showing statuses (Pending, Approved, Rejected, Ordered), interactive supervisor approvals with rejection comment modal, purchasing officer actions, progress timeline bar, and LINE Flex preview.
   - File: `docs/plans/V2-0037-pr-frontend-mockup.md`
30. `V2-0038` - KPI Frontend UI/UX Mock-up
   - Status: Complete on 2026-06-22 (Mockup phase).
   - Outcome: designed and implemented the KPI Tracker module frontend mockup under `docs/mockups/kpi-ui-ux-mockup.html`, demonstrating active daily records input, branch switching (AKRA vs TRD), role simulation (Staff, Supervisor, Admin), dynamic SVG charts for error trends and monthly rankings, HP gamification rings leaderboard (starting at 100 HP), weekly task list status checks, CSV export utility, and administrative employee roster controls.
   - File: `docs/plans/V2-0038-kpi-frontend-mockup.md`
31. `V2-0039` - PR/PO/GR release-shape decision
   - Status: Complete on 2026-06-23 (planning decision accepted).
   - Outcome: created a release-shape plan and ADR `0021` (Accepted).
     Decision: implement PR/PO/GR in small slices, but keep one grouped
     operational cutover gate after PR -> PO -> GR staging UAT. A staged
     PR/PO-first release requires a separate bridge/writeback ADR first.
   - Next action: `V2-0040` has run against the current empty PR source;
     decide how to handle 3 PR-derived PO rows without source PR rows before
     import planning.
   - File: `docs/plans/V2-0039-pr-po-gr-release-shape-decision.md`
32. `V2-0040` - PR/PO/GR fresh PR CSV reconciliation
   - Status: Complete on 2026-06-24 — reconciliation logic built and proven
     against the current empty PR source; the 3-row import-posture decision
     is now resolved (ADR `0022`).
   - Outcome: extended `scripts/pr-po-gr-import-dry-run.mjs` with PR
     Profiling, PR -> PO Reconciliation (matched/genuinely-unmatched/
     unverifiable), and PO -> GR line coverage sections. `Trackingpo -
     webapp - PR.csv` exists with the current PR header and 0 rows; user
     confirmed the PR source is genuinely empty. Real findings: 1 bill
     group / 3 PO line rows carry a real `Ref_PR_UID` and are
     unverifiable/manual-review because no source PR rows exist; PO -> GR
     line coverage is 94.1% (706/750). Result: 0 blockers, 9 warnings —
     see `docs/migration/pr-po-gr-v1-mapping.md`'s "V2-0040
     Reconciliation Dry-Run" section.
   - Decision (ADR `0022`, 2026-06-24): import the 3 PR-derived PO rows as
     manual-review/nullable PR linkage (`legacy_ref_pr_uid` +
     `pr_number_label`); do not pursue historical PR-row recovery — raw-row
     inspection showed the PR is already closed (`GR Completed`) and its
     reference survives as text on every line, and the locked schema's
     nullable columns already cover this with no migration change.
   - Next action: plan the PR/PO/GR staging import slice.
   - File: `docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`
33. `V2-0041` - Placeholder route guard pass
   - Status: Complete on 2026-06-23.
   - Outcome: drafted inline during a bare `Go` (same pattern as
     `V2-0017`/`V2-0023`/`V2-0025`), picking up the decision board's
     unblocked Near-Term Queue item 5 / Watch List entry. Added a
     `requirePermission()` + `AccessDenied` guard to
     `src/modules/core/module-landing-page.tsx` (shared by all 5
     placeholder routes) using each app's own
     `public.apps.required_permission`, plus `export const dynamic =
     "force-dynamic"` on the 5 route files
     (`/purchasing`, `/receiving`, `/warehouse`, `/returns`, `/kpi`).
     Closes a real pre-existing gap: those 5 routes previously rendered
     placeholder content to anyone, signed in or out, regardless of
     permission. Verified signed-out via a local dev server: all 5 routes
     now return "Sign In Required" instead of placeholder content.
     `lint`/`typecheck`/`build`/`git diff --check` all pass.
   - File: `docs/plans/V2-0041-placeholder-route-guard-pass.md`
34. `V2-0042` - Obsidian docs index
   - Status: Complete on 2026-06-23.
   - Outcome: added Obsidian-friendly navigation pages under `docs/`:
     `00-dashboard.md`, `01-active-plans.md`, `02-decisions.md`, and
     `03-migration-map.md`; added `.obsidian/` and `docs/.obsidian/` to
     `.gitignore`; no runtime code, schema, staging data, or V1 production
     files changed.
   - File: `docs/plans/V2-0042-obsidian-docs-index.md`

35. `V2-0043` - App flow diagrams (Mermaid)
   - Status: Complete on 2026-06-23.
   - Outcome: added `docs/architecture/app-flow-diagrams.md`, basic Mermaid
     flowcharts for all 8 V2 modules (Main/Auth, Picking, Purchasing PR,
     Purchasing PO, Receiving GR, Warehouse TRDAKRA+W5, Returns, KPI), ready
     to paste into Mermaid Live. Each diagram is labeled with real
     implementation status (Picking/Main implemented+verified; PR/PO/GR
     schema-only; Warehouse/Returns/KPI placeholder-route-only) so it isn't
     mistaken for proven behavior where it is actually a planned spec, or,
     for Returns, a generic placeholder pending a real mockup/plan.
     Documentation-only; no runtime code, schema, staging data, V1
     production files, or secrets changed.
   - File: `docs/plans/V2-0043-app-flow-diagrams.md`

36. `V2-0044` - PR/PO/GR staging import slice
   - Status: Complete on 2026-06-24 — import executed and verified.
   - Outcome: ADR `0023` accepted (full-snapshot import). Added
     `scripts/lib/pr-po-gr-parsing.mjs` (shared parsing/grouping/date module,
     extracted from the dry-run script and proven byte-identical before
     use), `scripts/pr-po-gr-import-apply.mjs` (gated on
     `--confirm-pr-po-gr-import` + staging project-ref check, preview/
     validate-then-write, truncate-then-reload in one transaction), and
     `scripts/verify-pr-po-gr-import.mjs` (16 read-only checks). Added
     migration `0014_pr_po_gr_import_events.sql` (widens
     `purchasing_events_type_check`/`receiving_events_type_check` for
     `pr_imported`/`po_imported`/`gr_imported` — the locked `0013` lists only
     covered future write-workflow actions). Ran the real staging import
     twice (idempotency proof) and re-verified after each: **253 PO
     headers/748 lines, 588 GR headers/1868 lines/6 splits, 0 PR
     headers/lines**, 16/16 verification checks pass both times. Real gaps
     found and resolved during implementation (none blocking, all
     staging-only/reversible): 2 PO rows skipped for `PO_Qty = "0"`
     (collapsing 254→253 bill groups, and explaining the 14-vs-dry-run's-10
     orphan GR count — fully traced); unit fallback chain for 46 PO/105 GR
     blank-`Unit` rows; `received_qty = 0` for 181 blank-`GR_Qty` `Draft GR`
     rows; **ADR `0026`** (new) for synthesized `LEGACY-*` `po_number` on
     251/253 headers (V1's own `PO_Number` is blank on 746/750 rows); new GR
     header grouping logic (PO bill + date/ATA/receiver/status/remark, per
     ADR `0020`) with no external count to check beyond hand-spot-checks and
     re-run stability; a documented one-row "Pending GR" status judgment
     call. PR import is code-complete (mirrors the PO pattern) but
     data-unproven (current PR source has 0 rows) — same posture as
     `V2-0027`'s LINE real-send branch. See
     `docs/migration/pr-po-gr-v1-mapping.md`'s "V2-0044 Staging Import
     Result" section for full detail.
   - Next action: no runtime `/purchasing`/`/receiving` UI yet. Per ADR
     `0025`/`V2-0046`, a future write workflow (not this read-only import)
     must wait for the operational-readiness package (`V2-0046` tasks 1-5).
   - File: `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`

37. `V2-0045` - Schema, master data, and folder structure hardening
   - Status: Complete on 2026-06-24.
   - Outcome: added `docs/database/schema-catalog.md`,
     `docs/migration/master-data-vocabulary.md`, and accepted ADR `0024`
     (`docs/decisions/0024-master-data-vocabulary-and-folder-boundaries.md`);
     updated docs maps; tracked README boundaries for future
     `src/modules/purchasing`, `receiving`, `warehouse`, `returns`, `kpi`,
     plus `scripts/lib`. This standardizes `source_app`/`legacy_source`/
     `match_status` vocabulary and folder ownership before PR/PO/GR import
     implementation. Documentation/README-only; no runtime behavior, migration
     SQL, staging data, V1 production files, or secrets changed.
   - Next action: superseded by `V2-0044`'s completion — `V2-0044`'s vocabulary
     usage is recorded in its own status entry; execute `V2-0046` before
     PR/PO/GR transactional write workflow starts.
   - File: `docs/plans/V2-0045-schema-master-folder-hardening.md`
38. `V2-0046` - Operational readiness before PR/PO/GR writes
   - Status: Draft on 2026-06-24 — planning step only, no implementation.
   - Outcome: plans the required readiness package before transactional
     PR/PO/GR write workflow: Environment Matrix, Monitoring/Observability,
     Backup/DR, Rollback, and PR/PO/GR readiness gates. ADR `0025` accepts the
     gate: `V2-0044` import/read-only validation may proceed, but PR/PO/GR
     writes should not start until the readiness package is approved; production
     cutover requires implemented and verified readiness checks.
   - Next action: after ADR `0023` import-scope confirmation, `V2-0044`
     can proceed for staging import/read-only validation. Before write
     workflow, execute `V2-0046` tasks 1-5 to create the operations docs and
     approval checklist.
   - File: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
39. `V2-0047` - PR/PO/GR read-only list/detail UI
   - Status: Complete on 2026-06-24.
   - Outcome: implemented permission-gated `/purchasing`/`/purchasing/[id]`
     (PO) and `/receiving`/`/receiving/[id]` (GR, with line splits) read-only
     routes over the `V2-0044` staging import, mirroring the `V2-0019`
     Picking read-only pattern (own `read-model.ts`/`format.ts` per module,
     normal authenticated client, no writes). Not gated by `V2-0046`/ADR
     `0025` (that gate covers write workflow only). Confirmed the real
     pre-existing gap found during planning (`ModuleLandingPage`'s single
     `purchasing.read`/`receiving.read` check denies `.write`-only roles) and
     fixed it: the new routes use `anyOf: [".read", ".write"]` like Picking's
     page guard. Discovered the gap was narrower than first assumed —
     `SUPERVISOR` holds both `purchasing.write`/`receiving.write` (no
     `.read`), but `WAREHOUSE` holds only `receiving.write`, not
     `purchasing.write`. Verified end to end with a temporary local
     Playwright install against 4 new synthetic `v2047-*@akra-v2.test`
     accounts (`ADMIN`/`GUEST`/`WAREHOUSE`/`SUPERVISOR`, all deleted after):
     signed-out and `GUEST` denied on both routes; `SUPERVISOR` (`.write`-only)
     allowed on both list+detail; `ADMIN` allowed; a real `LEGACY-`-prefixed
     PO shows the ADR-`0026` caption; the ADR-`0022` PR-derived PO shows the
     manual-review note; an orphan GR shows the "no linked PO" note; zero
     console errors; zero horizontal overflow at 390px. Two auto-mode
     classifier blocks during prep (ad-hoc real-user password reset, then an
     ad-hoc reset bypassing the repo's `--confirm`/project-ref convention)
     were resolved by using the existing `scripts/create-test-account.mjs`
     instead — no real V1 user account was touched.
   - Next action: none for this slice. Next PR/PO/GR step is `V2-0046` tasks
     1-5 (before any write workflow) or a real PR import once a non-empty
     PR export exists.
   - File: `docs/plans/V2-0047-pr-po-gr-readonly-ui.md`

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
- Resolved (`V2-0044`, ADR `0023` Accepted, 2026-06-24): import the full
  current PO/GR snapshot (all 750/1868 rows) in one pass, not active/open
  rows first. User confirmed; `Go:` for the import slice followed.
- Open sub-decisions under `V2-0046` / ADR `0025` (Accepted, 2026-06-24):
  choose production RPO/RTO, backup/PITR posture, monitoring tool, alert
  owners, rollback authority, and exact production/staging Supabase separation
  before PR/PO/GR write workflow and production cutover.
- Resolved (`V2-0040`, ADR `0022`, 2026-06-24): the 3 PR-derived PO rows
  whose `Ref_PR_UID` has no source PR row (current PR CSV source is
  genuinely empty) import as manual-review/nullable PR linkage; no
  historical PR-row recovery.
- Resolved (`V2-0039`, ADR `0021`, 2026-06-23): PR/PO/GR use a grouped
  operational release gate after end-to-end staging UAT; implementation can
  still proceed in small slices.

## Update Rules

- Update this index whenever a plan is added, completed, blocked, superseded, or
  its next action changes.
- Keep detailed work history in `docs/handoff/work-log.md`, not in this index.
- Keep `docs/handoff/work-log.md` short; move older detailed history to
  `docs/handoff/archive/` and leave pointers in the active work log.
- Keep current operational status in `docs/handoff/current-state.md`.
- Do not remove historical plans unless they were created in error and have not
  been referenced by handoff docs.
