# Plan V2-0022: Full V1 Parity Timeline

Status: Draft

Architect command:

```text
Architect: วางแผนเรียง Timeline ในการทำงานมาเลย จนจบครบและใช้งานได้เหมือน V1 แยกออกเป็น Phase แยกออกตามแอพ แต่ละ Modlue
```

## 1. Goal

- Primary objective: define the module-by-module execution timeline from the
  current V2 baseline to a V2 system that can replace V1 app workflows.
- Success definition: every live V1 app has a matching V2 module with data
  model, import path, permissions, main workflows, notifications where needed,
  browser/mobile verification, UAT, and a module cutover/rollback runbook.
- User/business reason: the user needs a realistic end-to-end roadmap, not just
  the next Picking slice, so implementation can be sequenced toward full V1
  replacement without losing daily production safety.

## 2. Requirement And Scope Definition

### Problem

- V2 has a strong foundation and a partial Picking pilot, but the full migration
  path to V1 parity is not yet written as one timeline.
- Current V2 `/` is still a migration dashboard, while V1 Main is the operator
  entry point.
- PR, PO, GR, TRDAKRA, AKRA W5, Returnitem, and KPITracker still run in V1 and
  need module-specific V2 plans, schemas, imports, UI, and cutover decisions.

### Users

- Primary users: AKRA staff using Main, Picking, PR, PO, GR, warehouse,
  Returnitem, and KPI workflows daily.
- Secondary users: supervisors approving, monitoring, and resolving operational
  exceptions.
- Admin/support users: admins managing users, roles, permissions, app
  visibility, migration status, and cutover support.

### MVP Features

- Preserve V1 workflows that users depend on, but implement them in V2 modules
  with server-side permissions and Postgres transactions.
- Keep V1 production apps live until each module has passed its cutover gate.
- Use staging imports and parallel verification before production switch.
- Treat full V1 parity as two levels:
  - **Operational replacement**: V2 can run the daily workflow safely.
  - **Full parity closeout**: reporting, admin support, edge cases, historical
    import, notifications, and rollback are verified enough to retire the V1
    module.
- Sequence modules by dependency, not by visual similarity:
  1. Main/Core portal and shared UX shell.
  2. Picking pilot closeout.
  3. Purchasing/Receiving group: PR, PO, GR.
  4. Warehouse group: TRDAKRA and AKRA W5.
  5. Returnitem.
  6. KPI/reporting.
  7. final hardening and production cutover.

### Nice-To-Have Features

- Usage-based recently used/pinned modules on Main.
- Advanced admin CRUD beyond what is required for cutover.
- Rich global search across modules.
- Historical archive browsing for every legacy row on day one.
- Custom reporting builder after KPI parity is complete.

### Out Of Scope

- Changing V1 production apps, GAS deployments, Sheets, GitHub Pages URLs, LINE
  tokens, or live routing as part of this planning step.
- Implementing runtime code in response to this `Architect:` command.
- Copying V1 single-file HTML/CSS/JS implementations into V2.
- Connecting V2 Production to live data before a module cutover is approved.
- Importing or committing secrets.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, TypeScript, existing `AppShell`, module routes,
  shared UI components, and CSS tokens.
- Backend/server boundary: server components, server actions, route handlers,
  and server-only Supabase clients for privileged workflows.
- Database: Supabase Postgres with migrations under `supabase/migrations`.
- Auth/permissions: Supabase Auth, imported V1 users/roles/permissions in
  staging, reusable `requirePermission()` server guard, and RLS for exposed
  reads.
- Deployment: Vercel Preview/Development for staging verification; Production
  remains disconnected/protected until explicit cutover.

### Data Model / Schema

- Shared entities:
  - users/profiles/roles/permissions/apps;
  - products, aliases, vendors, warehouses, locations, par settings;
  - audit logs and import batches.
- Workflow entities:
  - Picking requisitions, lines, problem reports, events, staff, LINE contacts;
  - PR requests and lines;
  - PO headers, lines, direct bill identities, vendor confirmations, close/APV;
  - GR headers, lines, receive/reset/recall events, split storage locations;
  - warehouse stock balances, movements, requests, dispatches, surveys;
  - Returnitem returns, claim lines, damaged goods holding/triage, vendor
    responses, customer closure states;
  - KPI definitions, daily records, report snapshots, and secured views.
- Constraints:
  - keep legacy IDs and source metadata for traceability;
  - do not authorize from user-editable metadata;
  - use transaction-safe counters and replacement snapshots;
  - keep notification secrets and LINE identifiers server-only.
- RLS/security notes:
  - reads can be exposed only after RLS and grants are explicit;
  - privileged mutations should go through server-side code and service-role or
    server-only RPC calls;
  - Data API-callable RPCs that require service-role execution must follow ADR
    `0015`: `public`, `SECURITY INVOKER`, execute only for `service_role`.

### Integration Points

- V1 references: V1 app code, GAS behavior, Google Sheets snapshots, and
  `C:\dev\WEBAPP\development_context.md` are reference only until a cutover
  action is approved.
- Supabase: migrations, staging imports, RLS, Data API, server-side RPCs.
- Vercel: Preview/Development verification first; Production only after
  cutover gate.
- LINE/GAS/Sheets/API: V1 remains live; V2 notification paths must be
  server-side and tested with staging-safe recipients/settings first.
- Secrets/env vars: no committed secrets; service-role and notification tokens
  stay in ignored local env, Vercel env, or secret manager.

## 4. UI/UX And User Flow

### User Flow

1. User opens V2 Main.
2. If signed out, V2 shows a portal state with sign-in and environment status.
3. If signed in, V2 shows allowed modules first, matching V1's app-launcher
   mental model.
4. User enters a module.
5. Module route verifies permissions server-side.
6. User completes the same operational task they currently do in V1.
7. V2 records database rows/events/notifications transactionally.
8. During migration, module data is verified against V1 snapshots or parallel
   runs before cutover.

### Screens / States

- Screen: Main portal, module list/detail/create/action screens, admin and
  reporting screens.
- Empty state: no assigned modules, no pending work, no matching search/result,
  no historical data imported yet.
- Loading state: server-rendered when possible; client components avoid auth
  flicker and avoid hiding permission errors.
- Error state: compact operational error without secrets; failed writes must not
  display success.
- Permission-denied state: reusable `AccessDenied` UI plus server-side route
  guard; hidden links are not the security boundary.
- Mobile behavior: every operational module must pass 375/390px checks with no
  horizontal overflow and 44px+ practical touch targets for common actions.

### System Logic / Pseudocode

```text
for each module in migration_timeline:
  read V1 behavior and sheet schemas
  profile/export staging snapshots
  design normalized V2 schema and import report
  apply staging migration only
  implement read model and permission-gated UI
  implement write actions with transactions/audit/events
  verify roles, mobile, browser, staging data, and no secret leakage
  run parallel comparison against V1 behavior
  write cutover checklist
  wait for explicit user approval before production switch
```

## 5. Task Breakdown

### Timeline Assumptions

- Estimates are working-time ranges for one focused implementation stream. They
  are not calendar guarantees.
- Week 0 starts from the current documented state on 2026-06-20.
- "Operational replacement" is expected before "full parity closeout" for some
  modules.
- A safer total estimate for full V1 replacement is **10-12 weeks**. An
  aggressive path to operational replacement is **7-9 weeks** if scope stays
  tight and user testing is fast.
- Any new V1 bugfix or production interruption can pause V2 timeline work.

### Phase 0 - Current Baseline And Safety Gate

Status: mostly complete.

Apps/modules: repo-wide foundation.

Duration: done, with continuous upkeep.

Deliverables already present:

- Next.js/TypeScript app shell.
- Supabase staging schema migrations `0001`-`0009`.
- Core auth/roles/permissions/app registry.
- Real V1 core user/role import to staging.
- Shared product catalog and warehouse baseline import to staging.
- Picking read-only list/detail and create requisition write slice.
- Handoff, conductor, plan index, ADR discipline.

Exit gate:

- Continue updating handoff docs for every non-trivial change.
- Keep V1 production isolated.

### Phase 1 - Main Portal And Core Admin Surface

Apps/modules: V1 Main / SSO -> V2 `auth`, `core`, Main portal.

Recommended duration: 3-5 working days for operator portal; 5-8 working days if
minimal admin user/role management is included.

Scope:

- Execute `V2-0017`: replace `/` migration-first dashboard with an
  operator-facing portal.
- Preserve V1 Main mental model: sign in once, show allowed modules, visible
  user/role context, admin shortcuts.
- Decide signed-out behavior for `/`.
- Add compact migration/status panel as secondary content.
- Add admin shortcuts to permissions and future user management.
- Confirm app visibility rules for queued modules.

Key files expected later:

- `src/app/page.tsx`
- `src/components/app-shell.tsx`
- `src/app/globals.css`
- `src/modules/core/app-registry.ts`
- `src/modules/auth/*`

Exit gate:

- Admin, Picking writer, Picking reader, guest, and signed-out states verified.
- Mobile no-overflow verified.
- V1 Main stays live and unchanged.

### Phase 2 - Picking Pilot Closeout

Apps/modules: V1 Picking -> V2 `picking`.

Recommended duration: 5-8 working days to operational replacement; 8-12 working
days with historical import and cutover runbook.

Scope:

- Implement in-app status transitions: `pending -> picked -> sent`, including
  idempotency and audit events.
- Implement problem reporting flow, preserving the V1 rule that a pending bill
  can become picked when a problem report is submitted unless a later decision
  changes it.
- Implement LINE send/notification path server-side with staging-safe tests.
- Import or deliberately archive V1 Picking requisition history.
- Verify daily bill numbering, concurrent creates, problem reports, and LINE
  failure recovery.
- Prepare Picking cutover checklist and rollback plan.

Dependencies:

- Existing `V2-0019` and `V2-0020` are complete.
- Needs explicit next-slice choice: LINE first, status buttons first, or problem
  reporting first.

Exit gate:

- Picking writer can create, update status, report problem, and send/record
  notification in V2.
- Reader/admin/guest behavior verified.
- V1 Picking cutover approved before any live switch.

### Phase 3 - Purchasing/Receiving Foundation

Apps/modules: shared PR/PO/GR foundation.

Recommended duration: 4-6 working days.

Scope:

- Profile V1 PR/PO/GR Sheets and GAS behavior from current snapshots.
- Draft PR/PO/GR schema covering stable bill identity, `DIRECT-<uuid>`, legacy
  fallback grouping, vendor confirmation dates, PO close/APV, GR receive/reset,
  split locations, extra items, and receiving events.
- Draft imports and comparison reports before writes.
- Build shared vendor/product/warehouse references from existing catalog data.
- Write ADR if the final schema changes module boundaries.

Exit gate:

- Staging schema plan and import dry-run reports are ready.
- Known edge cases from V1 `20260617.01` direct bill grouping are represented.

### Phase 4 - PR Module

Apps/modules: V1 PR -> V2 `purchasing`.

Recommended duration: 4-6 working days after Phase 3.

Scope:

- PR create/edit/history.
- Product/vendor/warehouse selection through shared catalog where available.
- Permission mapping for requesters and approvers.
- PR approval/reject path if still owned by PO approvers, matching V1.
- Staging import/parallel comparison for active and historical PR rows.

Exit gate:

- PR users can create and view requests in V2.
- PO approvers can approve/reject with server-side guard.
- V1 PR remains live until cutover.

### Phase 5 - PO Module

Apps/modules: V1 PO -> V2 `purchasing`.

Recommended duration: 6-10 working days after PR is stable.

Scope:

- PO dashboard, create/update/delete where allowed.
- Direct PO bill identity preservation.
- Pending matching and close/APV workflows.
- Vendor expected date and delivery insight basics.
- LINE notification parity where V1 uses it.
- Staging import/parallel comparison for open PO, closed PO, and legacy direct
  rows.

Exit gate:

- Same-day direct POs with same vendor/warehouse stay separate.
- Legacy fallback rows remain understandable.
- PO/PR integration tests pass.

### Phase 6 - GR Module

Apps/modules: V1 GR -> V2 `receiving`.

Recommended duration: 8-12 working days after PO stable.

Scope:

- GR pending/received lists, warehouse filters, vendor calendar, and receiving
  detail.
- Receive, edit, reset/recall, split storage, extra item handling.
- Remark and lift fee preservation.
- Date formatting parity for GR date, ATA, expiration date.
- Receiving events and audit trail.
- Integration with PO status/matching and future warehouse stock movements.

Exit gate:

- New PO -> receive -> reset/edit -> reopen workflows match V1 behavior.
- Warehouse split quantities and locations remain traceable.
- GR browser/mobile verification passes.

### Phase 7 - Warehouse Foundation And TRDAKRA

Apps/modules: V1 TRDAKRA -> V2 `warehouse`.

Recommended duration: 10-15 working days.

Scope:

- Normalize stock balances, stock movements, request/dispatch records, survey
  logs, locations, floors, zones, and par levels.
- Implement TRD/AKRA request and dispatch workflows.
- Implement pending pick-list, stock adjustment, stock checks, survey bulk
  order, location manager, history filters, and product analytics.
- Implement daily dispatch summary server-side.
- Decide granular TRDAKRA permission keys beyond V1 role fallback.

Dependencies:

- Existing shared catalog/warehouse baseline from `V2-0018`.
- GR integration decision for stock movement creation.

Exit gate:

- TRD and AKRA daily stock/request/dispatch workflows run in V2.
- Existing V1 analytics that users rely on are present or explicitly deferred.

### Phase 8 - AKRA W5 Module

Apps/modules: V1 AKRA W5 -> V2 `warehouse`.

Recommended duration: 5-8 working days, parallelizable with part of Phase 7
only after warehouse foundation is stable.

Scope:

- W5 product mapping for name-only rows and manual-review aliases.
- W5 stock, adjustment, request, dispatch/pick-list dashboard, and history.
- Preserve W5-specific labels, locations, and low-stock behavior after business
  confirmation.

Exit gate:

- W5 users can operate stock and adjustments in V2.
- Manual-review product aliases are resolved or safely displayed as legacy
  unmatched items.

### Phase 9 - Returnitem Module

Apps/modules: V1 Returnitem -> V2 `returns`.

Recommended duration: 8-12 working days.

Scope:

- Return intake, QC, damaged-goods holding, triage, claim creation, vendor
  pipeline, customer closure, print/reprint, and audit views.
- Preserve granular `app-ret` permissions mapped during core import.
- Support route/source fields and lazy migration of legacy statuses.
- Add LINE/vendor notification paths if required for V1 parity.

Exit gate:

- Return/claim/damaged-goods workflows can be completed in V2 without skipping
  warehouse or claim gates.
- Historical status mapping is documented and verified.

### Phase 10 - KPITracker And Analytics

Apps/modules: V1 KPITracker -> V2 `kpi`, cross-module `analytics`.

Recommended duration: 5-10 working days for KPI parity; longer if the user wants
new cross-module executive reporting.

Scope:

- KPI daily record entry and admin settings.
- Admin dashboard permission parity.
- Secured report views from V2 workflow tables.
- Migration of KPI historical records where needed.
- Decide whether KPI should read live operational tables or curated snapshots.

Exit gate:

- KPI users can record and review daily metrics in V2.
- Admin dashboard is permission-gated and mobile usable.

### Phase 11 - Full-System Hardening And Cutover

Apps/modules: all modules.

Recommended duration: 8-15 working days after module parity.

Scope:

- End-to-end role matrix verification across ADMIN, SUPERVISOR, AKRA, TRD,
  WAREHOUSE, Cashier, module-specific reader/writer roles, and guest.
- Security review for RLS, grants, server actions, secrets, and notification
  paths.
- Performance checks for heavy lists and reports.
- Data reconciliation reports against V1 snapshots.
- User acceptance testing by module.
- Production deployment checklist, rollback checklist, support/training notes,
  and post-cutover monitoring.

Exit gate:

- Each module has explicit user approval for cutover.
- V1 production routes remain available until the module-specific rollback
  window closes.

### Summary Timeline

| Phase | App / Module | Estimate | Dependency | Outcome |
| --- | --- | --- | --- | --- |
| 1 | Main / Core portal | 3-8 days | current core guards | V2 becomes operator-facing entry point |
| 2 | Picking | 5-12 days | Picking create slice complete | first cutover-ready pilot |
| 3 | PR/PO/GR foundation | 4-6 days | catalog/core | purchasing/receiving schema and imports |
| 4 | PR | 4-6 days | Phase 3 | request workflow parity |
| 5 | PO | 6-10 days | PR + Phase 3 | PO/direct/close/APV parity |
| 6 | GR | 8-12 days | PO | receiving/reset/split parity |
| 7 | TRDAKRA | 10-15 days | warehouse foundation | TRD/AKRA stock workflow parity |
| 8 | AKRA W5 | 5-8 days | warehouse foundation | W5 stock workflow parity |
| 9 | Returnitem | 8-12 days | core/catalog as needed | return/claim parity |
| 10 | KPITracker | 5-10 days | migrated source data | KPI/reporting parity |
| 11 | Full hardening/cutover | 8-15 days | all modules | production-ready V2 replacement |

### Concrete Next-Step Chain

Use this as the default execution order unless the user explicitly changes
priority.

1. Execute Phase 1 Main Portal (`V2-0017`).
   - Command to start: `Go: ทำ Phase 1 Main Portal ตาม V2-0017 และ V2-0022`
   - Finish when `/` is an operator-facing portal, allowed modules are visible
     by permission, signed-out/admin/writer/reader/guest states are verified,
     and mobile has no horizontal overflow.
   - After finishing: update `V2-0017` status, `docs/plans/index.md`,
     `docs/handoff/current-state.md`, and `docs/handoff/work-log.md`, then move
     to step 2.

2. Execute Picking status transitions.
   - New focused plan should be created if the slice is non-trivial, likely
     `V2-0023`.
   - Scope: server-side transition actions, `pending -> picked -> sent`
     buttons, idempotency, lifecycle events, role checks, and browser/mobile
     verification.
   - Finish when writer/admin can transition staging requisitions, reader/guest
     cannot, invalid transitions fail safely, and existing create/list/detail
     still pass.
   - After finishing: move to step 3.

3. Execute Picking problem reporting.
   - Scope: problem report form, problem report tables/actions if needed,
     preserve or explicitly revise V1's pending-bill behavior, detail/list
     problem indicators, and audit events.
   - Finish when a staging user can submit and review problem reports, and the
     workflow is role-verified on desktop and mobile.
   - After finishing: move to step 4.

4. Execute Picking LINE notification and failure recovery.
   - Scope: server-side LINE send, no browser secrets, sent/failure state,
     retry or recovery path, staging-safe test policy, and no leaking LINE
     identifiers to normal client reads.
   - Finish when send success/failure paths are verified and documented.
   - After finishing: move to step 5.

5. Prepare Picking cutover package.
   - Scope: V1 Picking history import or archive decision, data reconciliation,
     UAT checklist, Vercel Preview/Development verification, production
     readiness checklist, rollback plan, and explicit user approval gate.
   - Finish when the user can decide whether V2 Picking is ready to replace V1
     Picking.
   - After finishing: move to step 6.

6. Plan and implement PR/PO/GR foundation.
   - New plan should cover the grouped purchasing/receiving schema before UI
     work starts.
   - Scope: V1 source profiling, imports/dry-runs, schema/migrations, direct PO
     identity, vendor expected date, PO/GR matching, GR reset/recall, split
     locations, extra items, permissions, and comparison reports.
   - Finish when staging schema and import reports are verified.
   - After finishing: move to step 7.

7. Implement PR, then PO, then GR in that order.
   - PR first: request create/edit/history and approve/reject integration.
   - PO second: PO dashboard, direct PO grouping, close/APV, vendor insight,
     notifications if needed.
   - GR third: receive/edit/reset/recall, warehouse split, remarks/lift fee,
     date formatting, and PO integration.
   - Finish when PR -> PO -> GR end-to-end staging flow matches V1 behavior and
     has a cutover/rollback package.
   - After finishing: move to step 8.

8. Plan and implement warehouse modules.
   - TRDAKRA first because it defines most stock movement, request, dispatch,
     survey, par, location, and analytics patterns.
   - AKRA W5 after or partially parallel once warehouse foundations are stable,
     with special attention to name-only product mapping.
   - Finish when TRD/AKRA/W5 daily stock workflows are usable in V2 and stock
     movement reconciliation is documented.
   - After finishing: move to step 9.

9. Implement Returnitem.
   - Scope: intake, QC, damaged-goods holding/triage, claim/vendor pipeline,
     customer closure, print/reprint, `app-ret` permissions, and status
     migration.
   - Finish when return/claim workflows can complete without bypassing
     warehouse or claim gates.
   - After finishing: move to step 10.

10. Implement KPITracker and analytics.
    - Scope: daily KPI entry, admin settings, secured dashboards, historical
      import, and report source decision (live tables vs curated snapshots).
    - Finish when KPI users can enter/review metrics and admins can view
      permission-gated dashboards.
    - After finishing: move to step 11.

11. Run full-system hardening, UAT, and cutover.
    - Scope: full role matrix, RLS/grants/security review, performance checks,
      mobile/browser verification, data reconciliation, user acceptance tests,
      deployment runbooks, rollback windows, and post-cutover monitoring.
    - Finish when each module has explicit user approval and V1 can be retired
      module by module.

### Per-Step Closeout Checklist

Every implementation step above must close with:

1. Relevant automated checks (`lint`, `typecheck`, `build`, migration checks,
   import verifiers, or docs-only `git diff --check`).
2. Browser verification for the affected roles and mobile widths where UI
   changed.
3. Handoff updates: current state, active work log, plan index, and any changed
   module inventory/migration docs.
4. ADR update when a decision changes future implementation.
5. A clear "next action" entry that points to the next step in this chain.
6. Confirmation that no V1 production system changed unless the user explicitly
   approved a cutover or production V1 task.

## 6. Files Expected To Change

This `Architect:` step changes only planning/handoff files:

- `docs/plans/V2-0022-full-v1-parity-timeline.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/decisions/0016-module-by-module-v1-parity-sequence.md`

Future implementation phases are expected to change:

- `src/app/**`
- `src/components/**`
- `src/lib/**`
- `src/modules/auth/**`
- `src/modules/core/**`
- `src/modules/picking/**`
- `src/modules/purchasing/**`
- `src/modules/receiving/**`
- `src/modules/warehouse/**`
- `src/modules/returns/**`
- `src/modules/kpi/**`
- `supabase/migrations/**`
- `scripts/*import*.mjs`
- `scripts/*verify*.mjs`
- `docs/migration/**`
- `docs/runbooks/**`
- `docs/decisions/**`
- `docs/handoff/**`

## 7. Verification Steps

For this planning step:

- Inspect the new plan for module coverage and consistency with current
  handoff docs.
- Run `git diff --check`.
- Confirm no runtime app code, Supabase schema, staging data, V1 production
  apps, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.

For future implementation phases:

- Documentation-only work: `git diff --check`.
- App code: `npm run lint`, `npm run typecheck`, `npm run build`, and targeted
  browser/mobile checks.
- Supabase schema/import: migration preflight, staging apply, staging schema
  verification, import dry-run/apply verification, and RLS/grant checks.
- UI: role matrix browser checks and mobile overflow checks.
- Notification workflows: staging-safe LINE tests and failure recovery checks.
- Cutover: module-specific reconciliation, UAT, rollback test, and production
  deployment verification.

## 8. Rollback / No-Production-Impact Note

This plan is documentation only. It does not change runtime V2 code, staging
schema, V1 production files, GAS deployments, Google Sheets schemas, live URLs,
LINE tokens, or secrets.

Future implementation phases must remain reversible by:

- keeping V1 live until explicit module cutover approval;
- applying V2 migrations to staging first;
- importing via repeatable scripts with dry-run reports;
- writing module-specific rollback plans before production switch;
- avoiding destructive V1 writes during migration.

## 9. Open Questions

- Should V2 Main be prioritized immediately before Picking closeout, or should
  Picking workflow completion stay first?
- For full parity, should V1 historical data be imported into V2 for every
  module, or should some history remain read-only in archived V1 Sheets?
- Which modules require LINE notification parity before cutover versus after
  operational replacement?
- Should PR/PO/GR be cut over as one grouped release, or can PR/PO go first
  while GR remains on V1 temporarily?
- Should TRDAKRA and AKRA W5 share one warehouse cutover, or be released as
  separate warehouse submodules?
- What user roles should participate in UAT for each module?
- What is the acceptable parallel-run window per module before disabling V1
  writes?

## 10. Handoff Notes

- Next action: default to executing Phase 1 Main portal (`V2-0017`) first unless
  the user explicitly prioritizes Picking closeout instead.
- After Phase 1 Main portal: execute Picking closeout in this order: status
  transitions, problem reporting, LINE notification/failure recovery, then
  cutover package.
- After Picking cutover package: plan PR/PO/GR foundation before implementing
  PR, PO, or GR UI.
- Blockers: exact cutover dates, UAT availability, LINE staging policy, and
  whether every module needs full historical import.
- Related plans: `V2-0009`, `V2-0017`, `V2-0018`, `V2-0019`, `V2-0020`.
- Related ADRs: `0008`, `0013`, `0015`, `0016`.
