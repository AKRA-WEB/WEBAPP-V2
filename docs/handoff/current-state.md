# Current State

Last updated: 2026-06-23

## Project

- Repository: `https://github.com/AKRA-WEB/WEBAPP-V2`
- Local path: `C:\dev\AKRA-WEBAPP-V2`
- Status: Phase 3 Picking pilot schema and mapping drafted, applied to staging,
  DB-verified; read-only UI slice (`/picking`, `/picking/[id]`), the create
  requisition write slice (`/picking/new`), the status-transition slice
  (`pending -> picked -> sent` actions on `/picking/[id]`), and the problem-
  reporting slice (`/picking/[id]/problem` + a "Problem reports" read section
  on `/picking/[id]`, `V2-0025`) are all implemented and verified against
  staging. Main portal redesign (`V2-0017`) is also complete and verified
  against staging. Picking LINE notification/failure recovery (`V2-0027`) is
  also complete. The Picking cutover package (`V2-0034`) is **prepared but not
  approved** — see `docs/migration/picking-cutover-package.md` for the real
  staging reconciliation (now reproducible via
  `npm run picking:verify-cutover-reconciliation`), UAT checklist, filled
  cutover checklist, a cutover runbook (section 5a), and the open user-gated
  items: deployed Vercel verification, combined human UAT pass, a fresh
  reference-data export/recheck against live V1 (section 3a), and the
  runbook steps themselves. The 2026-06-22 closeout resolved the final
  wording mismatch around pre-commit status and includes the evidence package
  plus reproducible tooling in the pushed work set. `Review: V2-0034`
  (2026-06-22) found 5 real gaps
  (1 blocker, 1 high, 3 medium), all verified accurate and addressed except
  the two that are inherently user/business actions. A Thai management
  summary is at
  `docs/project-management/executive-summary-th.md`. A static UI/UX mock-up is
  at `docs/mockups/v2-ui-ux-mockup.html`, and `FRONTEND_CONDUCTOR.md` /
  `Gemini.md` define the frontend UI/UX lane. Plan `V2-0032` (Frontend UI/UX
  roadmap), `V2-0033` (PO Frontend Mockup at `docs/mockups/po-ui-ux-mockup.html`),
  `V2-0035` (GR Mobile-first Mockup at `docs/mockups/gr-ui-ux-mockup.html`),
  `V2-0037` (PR Frontend Mockup at `docs/mockups/pr-ui-ux-mockup.html`), and
  `V2-0038` (KPI Frontend Mockup at `docs/mockups/kpi-ui-ux-mockup.html`) are complete.
  `V2-0036` drafts the PR/PO/GR foundation plan and all four implementation
  task-breakdown items are now done (2026-06-22): source profiling +
  dry-run report (confirmed a live V1 `PR` sheet with no CSV export yet,
  and `scripts/pr-po-gr-import-dry-run.mjs` profiled `PO`/`GR`/
  `ProductName`/`Vendor` against staging shared catalog/vendor/warehouse
  tables — 0 blockers, 7 warnings; see
  `docs/migration/pr-po-gr-v1-mapping.md` and
  `import-reports/pr-po-gr-dry-run-report.md`); the schema/RLS lock (ADR
  `0020`); the migration draft and staging apply:
  `supabase/migrations/0013_pr_po_gr_foundation.sql` adds the 9
  `public.purchasing_*`/`public.receiving_*` tables with RLS, explicit
  grants, and permission-based select policies, no data import, no runtime
  UI, no RPCs — applied to staging, `npm run check:migrations` and
  `npm run db:verify-staging-schema` both pass (36 public tables, 34 RLS
  policies), and a live anon Data API call against two new tables returned
  `HTTP 401` (matching `V2-0008`'s precedent). Remaining PR/PO/GR work
  (data import, runtime UI) is gated on a fresh PR CSV export and the grouped
  release discipline. `V2-0039` accepted ADR `0021`: PR/PO/GR should cut over
  as one grouped operational release after end-to-end staging UAT, while still
  allowing implementation in small slices. `V2-0040` is now drafted as the
  next executable PR/PO/GR planning slice: fresh PR CSV export plus read-only
  PR -> PO -> GR reconciliation dry-run before import/UI. `V2-0041`
  (2026-06-23) closed a real pre-existing gap on the 5 non-Picking
  placeholder module routes (`/purchasing`, `/receiving`, `/warehouse`,
  `/returns`, `/kpi`): they had no server-side permission guard at all and
  were reachable by anyone regardless of role. `ModuleLandingPage` now
  enforces each app's `required_permission` via the same
  `requirePermission()`/`AccessDenied` pattern Picking already uses.
  `V2-0037` separately added a PR frontend mock-up
  (`docs/mockups/pr-ui-ux-mockup.html`).
- Production impact: None
- V1 reference path: `C:\dev\WEBAPP`

## Objective

Create a new unified AKRA WEBAPP V2 that combines the current separate HTML,
Google Apps Script, Google Sheets, and GitHub Pages apps into one modular web
application.

Target stack:

- Next.js + TypeScript
- Vercel deployment
- Supabase Auth and Postgres
- Incremental module migration from V1

## Current Baseline

This repository was cloned as an empty GitHub repo and initialized with planning
and handoff documents. A minimal Next.js app shell has now been scaffolded.

## Active Plan

Plan IDs:

- `V2-0003` (`docs/plans/V2-0003-core-schema.md`)
- `V2-0004` (`docs/plans/V2-0004-core-v1-import-mapping.md`)
- `V2-0005` (`docs/plans/V2-0005-dashboard-app-registry.md`)
- `V2-0006` (`docs/plans/V2-0006-picking-pilot-schema.md`)
- `V2-0007` (`docs/plans/V2-0007-supabase-migration-preflight.md`)
- `V2-0008` (`docs/plans/V2-0008-staging-migration-apply.md`)
- `V2-0009` (`docs/plans/V2-0009-next-execution-sequence.md`)
- `V2-0010` (`docs/plans/V2-0010-picking-product-scope-and-flow.md`)
- `V2-0011` (`docs/plans/V2-0011-conductor-planning-index.md`)
- `V2-0012` (`docs/plans/V2-0012-architect-command-format.md`)
- `V2-0013` (`docs/plans/V2-0013-local-baseline-closeout.md`)
- `V2-0014` (`docs/plans/V2-0014-deployment-boundary-and-staging-access.md`)
- `V2-0015` (`docs/plans/V2-0015-core-import-dry-run.md`)
- `V2-0016` (`docs/plans/V2-0016-server-permission-guard-pattern.md`)
- `V2-0017` (`docs/plans/V2-0017-main-portal-design-direction.md`)
- `V2-0018` (`docs/plans/V2-0018-shared-catalog-warehouse-data-structure.md`)
- `V2-0019` (`docs/plans/V2-0019-picking-read-only-pilot.md`)
- `V2-0020` (`docs/plans/V2-0020-picking-create-requisition-write-slice.md`)
- `V2-0021` (`docs/plans/V2-0021-handoff-work-log-archiving.md`)
- `V2-0022` (`docs/plans/V2-0022-full-v1-parity-timeline.md`)
- `V2-0023` (`docs/plans/V2-0023-picking-status-transitions.md`)
- `V2-0024` (`docs/plans/V2-0024-project-management-operating-model.md`)
- `V2-0025` (`docs/plans/V2-0025-picking-problem-reporting.md`)
- `V2-0026` (`docs/plans/V2-0026-database-data-flow-html.md`)
- `V2-0028` (`docs/plans/V2-0028-management-executive-summary.md`)
- `V2-0027` (`docs/plans/V2-0027-picking-line-notification-failure-recovery.md`)
- `V2-0029` (`docs/plans/V2-0029-ui-ux-mockup.md`)
- `V2-0030` (`docs/plans/V2-0030-frontend-conductor-and-shortcuts.md`)
- `V2-0031` (`docs/plans/V2-0031-gemini-frontend-instructions.md`)
- `V2-0032` (`docs/plans/V2-0032-frontend-ui-ux-module-roadmap.md`)
- `V2-0033` (`docs/plans/V2-0033-po-frontend-mockup.md`)
- `V2-0034` (`docs/plans/V2-0034-picking-cutover-package.md`)
- `V2-0035` (`docs/plans/V2-0035-gr-frontend-mockup.md`)
- `V2-0036` (`docs/plans/V2-0036-pr-po-gr-foundation.md`)
- `V2-0037` (`docs/plans/V2-0037-pr-frontend-mockup.md`)
- `V2-0038` (`docs/plans/V2-0038-kpi-frontend-mockup.md`)
- `V2-0039` (`docs/plans/V2-0039-pr-po-gr-release-shape-decision.md`)
- `V2-0040` (`docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`)
- `V2-0041` (`docs/plans/V2-0041-placeholder-route-guard-pass.md`)

Goal: Continue Phase 3 from the verified Picking read-only/create baseline
toward a full V1 replacement roadmap. `V2-0022` now frames the remaining work
as module waves: Main/Core portal, Picking closeout, PR/PO/GR, TRDAKRA/W5,
Returnitem, KPITracker, and full hardening/cutover. UI/UX work now has a
frontend sub-conductor lane, but it remains tied to the same migration board
and module order.

Status:

- Phase 1 app shell complete (see plan `V2-0002` history below).
- Phase 2 core schema written as DRAFT migrations `0001`-`0003` under
  `supabase/migrations/` (tables, `private` auth/RLS helpers, RLS policies,
  explicit grants, structural seed) and applied to the staging Supabase project.
- `0006_core_grant_hardening.sql` closes broad default grants found during
  staging verification after the initial `0001`-`0005` apply.
- `handle_new_user` profile provisioning now lives in `private`; trigger-only
  helper execution is revoked from direct `public`/`anon`/`authenticated` calls.
- V1 `User` / `AppConfig` / `RoleConfig` / `PermConfig` import mapping is
  drafted in `docs/migration/core-v1-import-mapping.md`; no real V1 data has
  been exported or imported.
- Server `getPermissionSnapshot()` and admin read-only viewer
  `/admin/permissions` added.
- Dashboard module cards now read from `public.apps` when Supabase env and a
  signed-in user are available, with a static fallback when the database is not
  configured yet.
- ADR `0003` records core-tables-in-`public` decision.
- Phase 3 Picking pilot schema written as DRAFT migrations `0004`-`0005`
  under `supabase/migrations/` (products, staff, requisitions, lines, problem
  reports, lifecycle events, daily bill sequences, and server-only token/contact
  tables) and applied to the staging Supabase project.
- V1 Picking mapping is drafted in `docs/migration/picking-v1-mapping.md`;
  no real V1 Picking data has been exported or imported.
- ADR `0004` records the temporary `public.picking_*` table naming and
  server-only secret/contact split.
- Continuation preflight on 2026-06-18 confirmed official Supabase docs still
  emphasize explicit grants for Data API exposure, RLS on exposed tables, and
  `security definer` functions with a fixed `search_path`.
- `lint` / `typecheck` / `build` / `git diff --check` pass. Static consistency
  checks confirm permission seed keys match `AppPermission` and fallback app
  registry keys match the structural `apps` seed.
- Added repeatable `npm run check:migrations` preflight covering draft
  migration RLS/grant/security-definer/server-only table assumptions plus the
  existing permission/app-registry drift checks; it passes locally.
- Local `.env.local` now contains the staging project's public Supabase URL and
  publishable key only. `SUPABASE_SECRET_KEY` is intentionally blank until a
  rotated staging service role key is provided.
- Added `pg`-based tooling scripts: `npm run db:apply-migrations` and
  `npm run db:verify-staging-schema`, both reading `DATABASE_URL` only from the
  process environment.
- Staging DB verification passed after `0006` (17 public tables, 15 policies);
  anonymous Data API access to `public.apps` returns HTTP 401 with the
  publishable key.
- Added `docs/runbooks/supabase-staging-migration.md` documenting the correct
  staging migration workflow, required verification targets, and the grant/RLS
  error found during staging apply.
- Added a rotated staging service role key to local `.env.local`
  (`SUPABASE_SECRET_KEY`); user confirmed it is a rotated key, not the one
  previously shared in chat. Not yet added to Vercel project settings.
- Added `scripts/create-test-account.mjs` (Supabase Admin API: creates an
  `auth.users` row with `email_confirm: true` and upserts a `user_roles`
  assignment for a given role key). Used it to create one staging test
  account: `test-admin@akra-v2.test`, role `ADMIN`. This is a synthetic test
  account, not a V1 data import.
- Verified sign-in and the `/admin/permissions` viewer end to end against
  staging using a temporary local Playwright install (`npm install --no-save
  playwright`, removed again after the test): `/login` signs in and redirects
  to `/`, `/admin/permissions` renders the `ADMIN` role card, all 13
  permissions, all 8 apps, with no console errors. Playwright is not a project
  dependency; the one-off check script was deleted after use.
- User added the public Supabase env vars and the rotated `SUPABASE_SECRET_KEY`
  to the V2 Vercel project (`https://vercel.com/akrapanich-3912s-projects/project-webapp-v2`)
  by hand via the dashboard, scoped to Preview + Development.
- Found and fixed a Vercel build failure (`No Output Directory named "public"
  found`) caused by the project's Framework Preset not being set to Next.js;
  fixing the preset (and clearing any Output Directory override) made the
  build succeed.
- Discovered all Phase 2/3 work had been sitting uncommitted locally and was
  never pushed, so Vercel had only ever deployed the Phase 1 scaffold
  (`e99fc59`) — explaining the stale `Phase 1` pill and missing
  `/admin/permissions` route the user saw on the live deployment. Committed
  and pushed it in three commits on `main` (`c31bc54`, `1d8dede`, `325d6ee`);
  see the 2026-06-19 work-log entry for details.
- User confirmed sign-in at `/login` works against the live deployment (typed
  directly; there is no nav link to it yet) with the `test-admin@akra-v2.test`
  test account.
- Pushed `e99fc59..8a8f083` to `origin/main` (user explicitly authorized the
  direct push to `main`, no PR, solo-dev repo). Vercel auto-redeployed from
  the push.
- Re-verified live: `/admin/permissions` on
  `https://project-webapp-v2.vercel.app/` now renders the real Phase 2
  content — `ADMIN` role card, `Permissions (13)`, `Apps (8)`, `Read only`
  pill — matching the local Playwright check exactly. Next Action 1 (rotated
  key + Vercel + sign-in/`/admin/permissions` e2e) is now fully closed.
- Added plan `V2-0009` to define the next execution sequence: navigation,
  deployment boundary decision, staging user matrix, core import dry run,
  server permission guards, then the Picking pilot UI/actions.
- Implemented `V2-0009` step 1: `AppShell` now exposes real links for
  dashboard, `/admin/permissions`, `/login`, and module routes; dashboard module
  cards link to registry routes; placeholder landing pages exist for
  `/picking`, `/purchasing`, `/receiving`, `/warehouse`, `/returns`, and
  `/kpi`.
- Added `V2-0010` as the required product-scope and user-flow gate before
  implementing Picking UI or write actions. ADR `0005` records the decision to
  lock MVP, nice-to-have, out-of-scope, user flows, screen notes, logic, and
  verification before coding the first Picking workflow.
- Added root `CONDUCTOR.md` and `docs/plans/index.md` as the central
  conductor-style planning entry point for future agents. ADR `0006` records
  that agents must use the conductor and plan index to resume active work.
- Added `Architect:` as the user-facing detailed planning command. ADR `0007`
  records that `Architect:` is plan-only, while `Go:` is the execution command;
  the default detailed plan format lives at
  `docs/plans/templates/architect-plan-template.md`.
- Added focused Architect plans for the next execution slices:
  - `V2-0013` closes out the current uncommitted local baseline with
    verification, commit, push, and deployment check.
  - `V2-0014` covers the deployment boundary decision and non-admin staging
    test user matrix.
  - `V2-0015` covers a validation-first V1 core import dry run with no database
    writes in the first slice (V2-0015 complete).
  - `V2-0016` covers a reusable server-side permission guard before Picking
    routes/actions.
- Current workspace note: navigation/conductor/planning work is committed (V2-0013 complete). V2-0014 environment boundary is confirmed (Vercel Production remains disconnected from staging), test roles (PICKING_WRITER, PICKING_READER, GUEST) are seeded on staging. Three non-admin staging test accounts are created. V2-0015 (Core import dry run) is complete; built and verified the dry-run script `scripts/core-import-dry-run.mjs` which parses V1 snapshot CSVs, maps/normalizes roles/permissions, generates synthetic emails, and resolves current DB permissions via HTTPS API.
- Added `V2-0017` as the Main portal design-direction gate. ADR `0008`
  proposes the hybrid decision: preserve V1 Main's workflow and module mental
  model, but redesign the V2 Main portal instead of copying the V1 visual shell
  or single-file implementation.
- Added `V2-0018` as the shared catalog and warehouse data-structure plan after
  the user uploaded fresh `import-data/` CSV snapshots. The plan records the
  initial product-source findings: PO/GR ProductName is the broadest coded
  source (4,793 codes), TRDAKRA Product and Returnitem usable codes are subsets,
  W5 has 116 name-only stock rows with 21 exact-name unmatched rows, and
  product scope should be modeled with aliases and scope memberships rather
  than flat TRD/AKRA/W5 booleans. ADR `0009` records this proposed modeling
  decision.
- Added a Grill Review / Decision Gate to `V2-0018` covering the main blockers:
  TRD/AKRA cannot be derived from Product master presence alone, W5 no-code rows
  should not auto-create canonical products by default, units cannot be
  aggregated before conversion rules, stock snapshots and movement histories may
  not reconcile, raw location values must be preserved, product active status is
  source-specific, Picking catalog bridging needs a decision, and catalog edit
  permissions need an owner.
- Completed Plan `V2-0018` profiling dry-runs and transformer previews: `scripts/product-catalog-import-dry-run.mjs` and `scripts/product-catalog-import-transformer.mjs` are implemented and successfully verified. Generated `import-reports/product-catalog-dry-run-report.md` and `import-reports/transformer-preview-report.md` with catalog mapping stats. Created draft SQL migration `supabase/migrations/0008_shared_catalog_schema.sql` and `docs/migration/product-catalog-v1-mapping.md`, and validated migration compliance.
- Completed Plan `V2-0016` (Server permission guard pattern): implemented server-side guard `requirePermission()` in `src/modules/auth/guard.ts` supporting single permission, `anyOf`, and `allOf` checks with `ADMIN` bypass. Refactored `/admin/permissions` to use the guard, created reusable `AccessDenied` UI component, and added ADR `0010` to document the design decision. Corrected on 2026-06-20 so empty guard calls fail closed instead of allowing any authenticated user.
- Applied `0008_shared_catalog_schema.sql` to staging database and successfully imported catalog and warehouse data using `scripts/product-catalog-import-apply.mjs`.
- Corrected the V2-0018 import/transform rules on 2026-06-20: W1 is TRD; W2, W3, W4, W5, C1, and C2 are AKRA; TRDAKRA Product entries default to `akra_trd`; destructive staging scripts now require explicit confirmation flags.
- Reimported the corrected catalog/warehouse staging data and verified aggregates: 4,793 products, 173 vendors, 11,433 aliases, 3,760 scope entries, 126 locations, 1,791 par configs, 116 balances, and 1,660 movements. All 1,791 TRDAKRA alias products are now `akra_trd`; `trd_alias_products_trd_only` is 0.
- Added repeatable read-only verification command `npm run db:verify-catalog-import`
  for catalog row counts, warehouse business-unit mapping, and TRDAKRA scope
  classification.
- Completed Next Action 1 (V2-0009): ran the real V1 core import. Found real
  V1 `User`/`RoleConfig`/`PermConfig` exports already on disk under
  `import-data/main/`; confirmed V1 `Main/Code.gs` has no bulk-export path, so
  these on-disk exports were the data source. Updated
  `scripts/core-import-dry-run.mjs` to read real data (case-insensitive/alias
  header handling) and fixed a synthetic-email collision bug (now keyed on
  V1 `ID`, not display name alone). Extended the V1-to-V2 permission map for
  six previously unmapped `app-ret.*` keys; left `app-akra.manageProducts`
  unmapped (no clean V2 permission home yet — see ADR `0011`). Dry run passed
  (15 users, 0 blockers, 1 warning). User confirmed at the report checkpoint:
  create 5 missing roles, drop `manageProducts`, import all 15 users as-is.
  Added `scripts/core-import-apply.mjs` (idempotent, gated on
  `--confirm-core-import` + staging project-ref check, never reads/stores the
  V1 `Password` column) and ran it against staging: created roles
  `SUPERVISOR`/`AKRA`/`TRD`/`WAREHOUSE`/`CASHIER`, upserted 18
  `role_permissions` grants, and created/linked 15 real V1 users as
  `auth.users` + `profiles` (synthetic `@akra-v2.test` emails, no password
  set) + `user_roles`. Verified via `npm run db:verify-staging-schema` and a
  targeted staging query. `lint`/`typecheck` pass.
- No V1 production files changed.
- Locked the first Picking UI execution slice on 2026-06-20: `V2-0010` is
  complete as the product/user-flow gate, ADR `0012` records read-only
  list/detail first, and `V2-0019` is the execution plan. Create requisition,
  status/problem workflows, and LINE integration are deferred until the
  read-only path is verified.
- Executed `V2-0019` on 2026-06-20: implemented the permission-gated Picking
  read-only pilot.
  - Added `src/modules/picking/read-model.ts` (server-only:
    `listRecentRequisitions`, `getRequisitionDetail`, reading
    `picking_requisitions`/`picking_requisition_lines`/`picking_requisition_events`
    through the normal authenticated Supabase client so RLS stays in the
    verification path) and `src/modules/picking/format.ts` (bill label/status
    tone/date/quantity formatters).
  - Replaced the `/picking` placeholder with a guarded list
    (`requirePermission({ anyOf: ["picking.read", "picking.write"] })`,
    `AccessDenied` on denial, status-count summary, recent requisition rows
    linking to detail, empty state) and added `/picking/[id]` guarded detail
    (header, metadata grid including picked/sent/problem timestamps, lines,
    lifecycle timeline, not-found state).
  - Staging had zero Picking requisitions (`picking_requisitions` count was
    0), so added `scripts/picking-seed-staging-fixtures.mjs` (new
    `npm run picking:seed-staging-fixtures`), gated on
    `--confirm-picking-fixtures` plus a staging project-ref check, idempotent
    via `upsert` on `legacy_uid`. Seeded 4 fixture requisitions
    (`legacy_source = "v2_fixture"`, names prefixed "Fixture …") covering
    pending/picked/sent/line_push_failed(+problem_reported) states, with
    lines and lifecycle events, and synced `picking_daily_sequences` for
    today's `bill_date` so future real bill numbers will not collide.
  - Verified end to end against staging using a temporary local Playwright
    install (`npm install --no-save playwright` + `npx playwright install
    chromium`, both removed after the run, matching the pattern used for the
    `/admin/permissions` check on 2026-06-19): signed-out shows "Sign In
    Required"; `test-guest@akra-v2.test` (GUEST) sees "Access Denied" on
    `/picking`; `test-admin@akra-v2.test` (ADMIN), `test-picker-writer@akra-v2.test`
    (PICKING_WRITER), and `test-picker-reader@akra-v2.test` (PICKING_READER)
    all see the requisition list and can open detail; no browser console
    errors. Test account passwords were reset to a temporary known value via
    the service-role Admin API for this verification session only (not
    recorded in any committed file); these are synthetic staging-only
    accounts with no production use.
  - Found and fixed a pre-existing mobile layout bug in the shared
    `AppShell`: `.sidebar` (in the `@media (max-width: 820px)` rule in
    `src/app/globals.css`) had no `min-inline-size: 0`, so the horizontally
    scrollable `.side-nav` strip forced the whole document wider than the
    viewport at narrow widths (measured `scrollWidth` 1143px at a 390px
    viewport). Added `min-inline-size: 0` to `.sidebar` in that rule; `/picking`
    and `/picking/[id]` now measure zero horizontal overflow at 390px (and
    this also benefits every other page using `AppShell`).
  - `lint`, `typecheck`, `build`, and `git diff --check` all pass.
- Drafted `V2-0020` on 2026-06-20 as the next recommended Picking slice:
  create requisition before LINE/status/problem workflows. ADR `0013` records
  the sequencing decision and the shared-catalog bridge direction. The plan
  starts with a small nullable catalog bridge on Picking lines and a gated
  Picking reference-data dry run/import (`ProductName` aliases and `Staff`)
  before implementing `/picking/new`.
- Completed `V2-0021` on 2026-06-20: split old work-log entries into
  `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`, kept 2026-06-20
  recent entries in the active `docs/handoff/work-log.md`, and updated
  `AGENTS.md`, `CONDUCTOR.md`, and `README.md` so future agents read archive
  logs only when historical detail is needed. ADR `0014` records the policy.
- Executed `V2-0020` on 2026-06-20 (`Go:`): the Picking create requisition
  write slice.
  - Migration `0009_picking_catalog_bridge.sql`: nullable
    `catalog_product_id`/`catalog_alias_id` on `picking_requisition_lines`
    plus an atomic `public.create_picking_requisition(...)` function (bill
    number allocation + requisition + lines + `created` event in one call).
    Applied and verified on staging (`npm run check:migrations`,
    `npm run db:verify-staging-schema`).
  - Empirically confirmed `private` schema functions are not reachable via
    the Supabase Data API at all (`PGRST106`), so the new atomic function
    lives in `public`, `SECURITY INVOKER` (not `DEFINER`), `EXECUTE` revoked
    from `anon`/`authenticated` and granted only to `service_role`. ADR
    `0015` records this and why no `DATABASE_URL`/Vercel env change was
    needed: the existing `SUPABASE_SECRET_KEY` (already in Vercel
    Preview/Development) is sufficient.
  - Added `scripts/picking-reference-import-dry-run.mjs` and
    `scripts/picking-reference-import-apply.mjs` (gated on
    `--confirm-picking-reference-import` + staging project-ref check). Ran
    both: imported real V1 `Picking - ProductName.csv` (4,761 rows -> 4,758
    `matched_code` + 3 `manual_review` `catalog_product_aliases` rows,
    `source_app = "picking"`) and `Picking - Staff.csv` (1 real row, "Chen",
    `legacy_source = "picking_v1"`) plus her LINE account row.
  - Added `src/lib/supabase/admin.ts` (server-only service-role client),
    `src/modules/picking/reference-data.ts` (active staff +
    capped/matched-only product alias suggestions), and
    `src/modules/picking/create-action.ts` (`createPickingRequisition`
    server action: `requirePermission({ permission: "picking.write" })`,
    server-side validation, calls the new RPC, redirects to
    `/picking/[id]`).
  - Added guarded `/picking/new` (`src/app/picking/new/page.tsx` +
    `src/modules/picking/new-requisition-form.tsx`, client component with
    add/remove line rows, catalog-product-or-free-text per line) and a
    writer/admin-only "New requisition" link on `/picking`.
  - Verified on staging: a single create writes exactly 1 requisition + N
    lines + 1 `created` event and advances `picking_daily_sequences`; 5
    concurrent RPC calls got 5 distinct `bill_no` values (atomic allocation
    confirmed under concurrency); all test/smoke rows were deleted after
    verification.
  - Browser-verified with a temporary local Playwright install (removed
    after, same pattern as `V2-0019`): signed-out shows sign-in required;
    `GUEST` denied on both `/picking` and `/picking/new`;
    `PICKING_READER` sees no "New requisition" link and is denied on
    `/picking/new`; `PICKING_WRITER` and `ADMIN` see the link, and the
    writer completed a full create -> redirect-to-detail flow in the
    browser; `/picking` and `/picking/new` measured zero horizontal
    overflow at 390px; no console errors. Test account passwords were
    reset to a temporary known value via the service-role Admin API for
    this verification session only (user-approved; not recorded in any
    committed file) — same synthetic staging-only accounts as `V2-0019`.
  - `lint`, `typecheck`, `build`, and `git diff --check` all pass.
  - Fixed a regression caught via advisor review: the V2-0018 catalog
    verification script (`scripts/verify-product-catalog-import.mjs`) had a
    hardcoded `catalog_product_aliases` count that the new picking-source
    aliases broke; scoped it to exclude `source_app = 'picking'` and
    re-verified green.
  - Caveat: the create flow is verified locally against staging (direct RPC
    calls + local dev browser checks), not yet exercised through a deployed
    Vercel Preview/Development build. In scope per the plan
    (`SUPABASE_SECRET_KEY` is already in Vercel; `DATABASE_URL` was never
    needed for this), but deployed-create itself is unproven.
  - No V1 production files changed.
- Added `V2-0022` on 2026-06-20 as a full V1 parity timeline. ADR `0016`
  records the dependency-ordered migration sequence: Main/Core portal,
  Picking pilot closeout, PR/PO/GR, TRDAKRA/W5, Returnitem, KPITracker, and
  full-system hardening/cutover. The plan estimates 7-9 weeks for aggressive
  operational replacement or 10-12 weeks for safer full parity closeout,
  assuming one focused implementation stream and fast UAT. This was a
  documentation-only `Architect:` step; no runtime app code, schema, staging
  data, V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets were changed.
- Updated `V2-0022` after the user asked to save what to do after each job:
  default next action is Phase 1 Main portal (`V2-0017`), then Picking status
  transitions, Picking problem reporting, Picking LINE/failure recovery,
  Picking cutover package, PR/PO/GR foundation, PR, PO, GR, warehouse
  (TRDAKRA/W5), Returnitem, KPITracker, and final hardening/cutover.
- Executed `V2-0017` on 2026-06-20 (`Go:`, no plan ID): confirmed the Main
  portal direction with the user first (track/labels/signed-out behavior),
  since the plan was still `Draft`/ADR `0008` still `Proposed`. ADR `0008`
  is now Accepted. `src/app/page.tsx` is rewritten as a server component that
  branches not-configured / signed-out / signed-in: signed-out shows a hero
  panel with a Sign In CTA and a disabled preview of the registry; signed-in
  filters the app registry into allowed-vs-queued by permission (this closes
  a pre-existing gap — Main previously rendered every module as a clickable
  link with no permission check at all), shows Thai one-line module
  descriptions (V1 proper-noun names kept as-is, e.g. "Picking", "TRDAKRA"),
  surfaces the signed-in user's display name/roles, adds an admin-only
  shortcut to `/admin/permissions`, and demotes the former "Migration
  Control" stats panel into a quieter `secondary-panel` below the modules.
  Added `.hero-panel`, `.workspace-header__user`, `.section-label`,
  `.module-card__note`, and `.secondary-panel` to `src/app/globals.css`.
  `npm run lint`/`typecheck`/`build` pass. Browser-verified against staging
  with a temporary local Playwright install (removed after, same pattern as
  prior slices): signed-out shows the hero + CTA;
  `test-picker-reader@akra-v2.test` (`PICKING_READER`) sees 1 allowed
  clickable module (Picking) and 6 "ต้องขอสิทธิ์เพิ่มเติม" denied notes, no
  admin shortcut; `test-admin@akra-v2.test` (`ADMIN`) sees all 7 routed
  modules as allowed plus the admin shortcut; 390px viewport measured zero
  horizontal overflow; no console errors. Test account passwords were reset
  to a temporary known value via the service-role Admin API for this
  verification session only (user-approved; not recorded in any committed
  file) — same synthetic staging-only accounts as prior slices. No V1
  production files changed.
  - Known gap carried forward (pre-existing, not introduced by this slice,
    noted in the plan's own Screens/States section): the placeholder module
    landing pages (`/purchasing`, `/receiving`, `/warehouse`, `/returns`,
    `/kpi`, via `ModuleLandingPage`) have no server-side permission guard —
    Main now hides/disables their links by permission, but the routes
    themselves are still reachable by direct URL. Out of scope for this
    plan; worth a guard pass before any of those modules gets real content.
- Executed `V2-0023` on 2026-06-20 (`Go`, no plan ID given; drafted the plan
  as part of execution per the documented Next Action 5): Picking status
  transitions.
  - Migration `0010_picking_status_transitions.sql`: atomic
    `public.transition_picking_requisition_status(p_requisition_id,
    p_target_status, p_actor_profile_id, p_actor_name)`, mirroring `0009`'s
    posture (default `SECURITY INVOKER`, `EXECUTE` revoked from
    `anon`/`authenticated`, granted only to `service_role`). Enforces only
    `pending -> picked` and `picked -> sent` (per
    `docs/migration/picking-v1-mapping.md`'s V1 LINE-postback rule); any other
    target or out-of-order call raises and writes nothing. Applied and
    verified on staging (`npm run check:migrations`,
    `npm run db:verify-staging-schema`).
  - Found and fixed a real bug during direct RPC smoke-testing: the
    function's `returns table (id uuid, status text)` clause creates implicit
    PL/pgSQL variables named `id`/`status`, which made bare references to the
    `picking_requisitions` columns of the same names ambiguous
    (`column reference "status" is ambiguous`). Fixed by aliasing the table
    (`picking_requisitions pr`) and qualifying every reference. Re-verified:
    `pending -> picked -> sent` writes the right timestamp/actor columns and
    exactly one event per transition; `pending -> sent` and a repeated
    `picked -> picked` call are both rejected and write nothing.
  - Added `src/modules/picking/transition-action.ts`
    (`transitionPickingRequisitionStatus`, `requirePermission({ permission:
    "picking.write" })`, calls the RPC via `createAdminClient()`, redirects
    back to the same `/picking/[id]` on success; denial/RPC error is a silent
    no-op in this minimal slice, no user-facing error message yet).
  - Added "Mark picked"/"Mark sent" buttons to
    `src/app/picking/[id]/page.tsx`, shown only when
    `can(guard.snapshot, "picking.write")` and the requisition is in the
    matching predecessor status; plain `<form action={...bind(...)}>` server
    actions, no new client component.
  - Browser-verified with a temporary local Playwright install (removed
    after, same pattern as prior slices; user explicitly approved resetting
    three existing synthetic staging test-account passwords via the
    service-role Admin API for this verification session only, not recorded
    in any committed file): `test-picker-reader@akra-v2.test`
    (`PICKING_READER`) sees the `Pending` status pill but no transition
    buttons; `test-picker-writer@akra-v2.test` (`PICKING_WRITER`) completed
    the full `pending -> picked -> sent` flow in the browser with zero
    horizontal overflow at a 390px viewport before and after; `ADMIN`
    transitioned a bill too; no browser console errors in any check. All
    smoke-test and browser-test requisitions were deleted after verification.
  - `lint`, `typecheck`, `build`, and `git diff --check` all pass.
  - No V1 production files changed.
- Completed `V2-0024` on 2026-06-20 as the project-management operating model:
  synced agent/read-order/context-budget rules across `AGENTS.md`,
  `README.md`, `CONDUCTOR.md`, and `CLAUDE.md`; added
  `docs/project-management/operating-model.md` and
  `docs/project-management/decision-board.md`; archived older active work-log
  entries into
  `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`;
  and synced stale Picking status in `docs/migration/migration-plan.md`,
  `docs/migration/module-inventory.md`, `V2-0009`, and `V2-0022`.
  Documentation/process-only; no runtime code, Supabase schema, staging data,
  V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.
- User resolved three Picking decisions on 2026-06-20, recorded in ADR `0018`:
  problem reporting on a `pending` requisition does not mark it as `picked`;
  LINE staging starts with disabled send/dry-run behavior; V1 Picking history
  stays as a read-only archive instead of being imported into V2 for the first
  cutover package.
- Added `docs/database/data-flow.html` on 2026-06-20 as a static HTML database
  structure/data-flow reference by app/module (`V2-0026`). It covers
  Main/Core, shared catalog/warehouse, Picking, PR/PO, GR, TRDAKRA/W5,
  Returnitem, KPI, and Notifications, and labels local uncommitted Picking
  problem-reporting files separately from the verified staging baseline.
- Executed `V2-0025` on 2026-06-20 (bare `Go`, plan drafted inline per the
  `V2-0017`/`V2-0023` precedent): Picking problem reporting.
  - Migration `0011_picking_problem_reports.sql`: atomic
    `public.report_picking_problem(p_requisition_id, p_actor_profile_id,
    p_actor_name, p_lines)` (service-role-only, mirrors `0009`/`0010`'s
    posture) writes a `picking_problem_reports` row, its
    `picking_problem_report_lines`, the requisition's
    `problem_by_name`/`problem_at` columns, and a `problem_reported` event in
    one transaction; rejects the call once the requisition is `sent`; never
    changes `status` (ADR `0018`'s explicit divergence from V1's
    pending-promotes-to-picked side effect). No new tables — the
    `picking_problem_reports`/`picking_problem_report_lines` tables and their
    `picking.read`/`picking.write` select policies already existed from
    `0004`/`0005`.
  - Added `src/modules/picking/problem-action.ts`
    (`reportPickingProblem`): `picking.write`-gated, validates submitted line
    ids match the requisition's existing lines 1:1, builds the RPC payload
    from server-side `product_name`/`requested_qty`/`unit` (not client
    input) plus client `actual_qty`/`note`.
  - Extended `src/modules/picking/read-model.ts`
    (`getRequisitionDetail`) to also load problem reports + lines through the
    normal RLS-enforced authenticated client.
  - Added guarded `/picking/[id]/problem`
    (`src/modules/picking/problem-report-form.tsx`, pre-fills actual qty with
    the requested qty per line) and a writer/admin-only "Report problem" link
    (hidden once `status === "sent"`) plus a "Problem reports" read section on
    `/picking/[id]`.
  - Found and fixed a real mobile-overflow regression during verification: a
    long unbroken test-account email rendered inside a `white-space: nowrap`
    class forced a 2px horizontal overflow at 390px on `/picking/[id]`; fixed
    by adding a dedicated `.problem-report__meta` class
    (`overflow-wrap: anywhere`) instead of reusing the nowrap qty class.
  - Verified: direct RPC smoke test (status unchanged on report on
    `pending`/`picked`, rejected on `sent`, resubmission is additive not an
    overwrite) plus full browser verification with a temporary local
    Playwright install (removed after; user approved a temporary
    `test-picker-writer`/`test-picker-reader` password reset via
    `AskUserQuestion`, same not-recorded pattern as prior slices):
    `PICKING_WRITER` full create -> report -> redirect -> rendered-report
    flow, link hides once `sent`; `PICKING_READER` can read the report's
    lines (confirms the `0005` RLS policy works for `picking.read`, not just
    in theory) but is denied on the write form; zero overflow at 390px on
    both routes after the fix; no console errors. `lint`/`typecheck`/`build`/
    `git diff --check`/`check:migrations`/`db:verify-staging-schema` all
    pass. No V1 production files changed.
- Added `V2-0028` on 2026-06-22 as a documentation-only management summary:
  `docs/project-management/executive-summary-th.md` explains the V2 purpose,
  stack, staging-verified capabilities, unfinished areas, simplified roadmap,
  and presentation talking points in Thai. No runtime code, Supabase schema,
  staging data, V1 production files, GAS deployments, Sheets, URLs, LINE
  tokens, or secrets were changed by this documentation task. Existing local
  uncommitted LINE notification files were not edited or marked complete.
- Executed `V2-0027` on 2026-06-22 (bare `Go:`, plan drafted inline per the
  `V2-0017`/`V2-0023`/`V2-0025` precedent): Picking LINE notification and
  failure recovery.
  - Consulted advisor before writing the migration: the schema reserves a
    `line_push_failed` **status** value (migration `0004`), which would
    suggest blocking the requisition until a retry succeeds, but that
    conflicts with `0010` (only `pending -> picked`) and with V1's own
    non-blocking push-failure behavior (`Code.gs.txt`: saves with a warning,
    `lineStatus` stays `pending`). Adopted Option B: notification outcome is
    event-only and never touches `picking_requisitions.status`. The reserved
    status value stays unused.
  - Migration `0012_picking_line_notifications.sql`: widens
    `picking_requisition_events_type_check` to add
    `line_notification_sent`/`line_notification_skipped`
    (`line_push_failed` already existed). No new tables/RPC — the outcome is
    a single admin-client event insert (plus an optional
    `picking_requisition_secrets` upsert on a real-send success), since
    `service_role` already holds insert grants on both tables from `0005`.
    Applied and verified on staging (`npm run check:migrations`,
    `npm run db:verify-staging-schema`).
  - Added `src/modules/picking/line-notification.ts`
    (`sendPickingLineNotification`): defaults to dry-run
    (`PICKING_LINE_PUSH_ENABLED !== "true"`) -> `line_notification_skipped`
    event, no network call; enabled without
    `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` -> `line_push_failed` event, no
    network call (mirrors V1's own `pushLineMessages` guard); enabled and
    configured -> attempts a real `fetch` push, recording
    `line_notification_sent` (capturing `quoteToken`) on success or
    `line_push_failed` on a non-2xx/network error — this branch is
    type-checked but unproven, no staging LINE credentials exist.
  - Added `src/modules/picking/line-notification-action.ts`
    (`retryPickingLineNotification`, `picking.write`-gated, redirects back to
    `/picking/[id]`).
  - Hooked the send into `src/modules/picking/create-action.ts` after a
    successful `create_picking_requisition` call, in its own `try/catch`,
    placed **before** `redirect()` (not wrapping it, since `redirect()`
    works by throwing).
  - Added a "Retry LINE notification" button to
    `src/app/picking/[id]/page.tsx`, writer/admin-only, shown when the
    latest LINE-related lifecycle event is `line_push_failed`, independent
    of the requisition's own status.
  - Added `.env.example` placeholders: `PICKING_LINE_PUSH_ENABLED`,
    `LINE_CHANNEL_TOKEN`, `LINE_GROUP_ID`.
  - Verified end to end through the real running app (sign-in ->
    `/picking/new` -> `/picking/[id]`), not just direct DB calls, using a
    temporary local Playwright install (removed after; user approved
    resetting `test-admin`/`test-picker-writer`/`test-picker-reader`
    passwords via `AskUserQuestion` first, not recorded in any committed
    file, same pattern as prior slices): default-disabled path
    (`line_notification_skipped`, no button); enabled-without-credentials
    failure path (`line_push_failed`, zero network calls, button shown to
    writer, confirmed hidden for reader); repeated failure while still
    misconfigured (idempotent, button stays); retry after reverting the
    flag (recovers to `line_notification_skipped`, button disappears). Zero
    horizontal overflow at 390px and no console errors throughout. A direct
    DB smoke test separately confirmed the widened constraint accepts all
    three event types and still rejects garbage, with `status` unchanged
    after every insert.
  - `lint`, `typecheck`, `build`, `git diff --check`, `check:migrations`,
    `db:verify-staging-schema` all pass. Both browser-test requisitions were
    deleted after; Playwright was removed; `.env.local`'s temporary
    `PICKING_LINE_PUSH_ENABLED=true` line was reverted.
  - Found this session's `V2-0028` (documentation-only) had concurrently
    modified this file, `docs/plans/index.md`, and
    `docs/handoff/work-log.md` without touching the in-progress LINE files;
    per "do not revert work you did not make," this slice's handoff edits
    were layered on top instead of overwriting `V2-0028`'s changes.
  - Also archived 5 older active-log entries into
    `docs/handoff/archive/work-log-2026-06-20-status-transitions-through-operating-model.md`
    to bring the active log back under its context budget.
  - No V1 production files changed.
- Executed `V2-0034` on 2026-06-22 (bare `Go:` / "go now", plan drafted inline
  per the `V2-0017`/`V2-0023`/`V2-0025`/`V2-0027` precedent): Picking cutover
  package.
  - Wrote a temporary read-only script
    (`scripts/_tmp-picking-reconciliation.mjs`, deleted after use) and queried
    staging directly rather than reciting prior handoff claims: 4
    `picking_requisitions` rows total, all `legacy_source = "v2_fixture"`
    (the `V2-0019` seed fixtures), zero `"v2_app"` rows — confirms every
    browser-test requisition from `V2-0020`/`0023`/`0025`/`0027` verification
    really was deleted afterward. `picking_problem_reports` and
    `picking_requisition_secrets` are both empty.
  - Found one pre-existing, low-priority data quirk during that query: the
    `V2-0019` seed fixture for the `line_push_failed` bill writes a
    `problem_reported` lifecycle event but never inserts a matching
    `picking_problem_reports` row (a seed-script gap, not a regression in any
    real flow). Left unfixed, noted in the package and the decision board.
  - Checked `git log origin/main..main`: local `main` is 2 commits ahead of
    `origin/main` (`V2-0027`, `V2-0028`) — the deployed Vercel build does not
    yet include the LINE retry feature. Did not push (shared-state action,
    not pre-authorized).
  - Added `docs/migration/picking-cutover-package.md`: answers the V1 history
    archive question (V1 Picking stays live/unmodified for pre-cutover
    lookups; V2 never imports or reconciles against it), the reconciliation
    findings above, a UAT checklist (the combined create -> pick -> send ->
    problem -> LINE-retry script has never been run as one continuous human
    pass, only per-slice agent-run Playwright), a fully filled instance of
    `docs/migration/cutover-checklist.md`, and a rollback plan (V1 stays the
    fallback since it has never been modified).
  - Explicitly did **not** check off "Vercel Preview verified" or "User
    approval received" in the filled checklist — named both as open,
    user-gated decisions instead of marking them done. Reason: the agent
    cannot exercise a deployed build even after a push (local `vercel` CLI is
    logged in as `akra-web`, which cannot reach the real project's team scope
    `akrapanich-3912s-projects` — see memory note `vercel-project-location`).
  - Documentation-only; no `src/` files, Supabase schema, staging data, V1
    production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
    changed. `git diff --check` passes. No commits pushed.
- Executed `V2-0036` task breakdown item 4 on 2026-06-22 (`Go: draft
  V2-0036 migration 0013 schema/RLS foundation only`): drafted
  `supabase/migrations/0013_pr_po_gr_foundation.sql` per ADR `0020`.
  - 9 tables (`purchasing_purchase_requests`/`_lines`,
    `purchasing_purchase_orders`/`_lines`, `purchasing_events`,
    `receiving_goods_receipts`/`_lines`, `receiving_line_splits`,
    `receiving_events`), every nullable legacy bridge field from the locked
    plan (PO bill identity kind/value/legacy refs, nullable
    `expected_date`/`raw_expected_date`/`expected_date_source`, nullable
    orphan-safe GR line FK, a `date_parse_status` check mirroring the
    dry-run script's date classification), RLS enabled, revoke-then-grant
    posture (`authenticated` select-only, `service_role` full, no `anon`),
    and select policies using the two locked permission groupings. No data
    import, no UI routes, no transaction RPCs, no new permissions.
  - One schema judgment call beyond the plan's literal wording:
    `receiving_goods_receipts.purchase_order_id` is nullable, not just the
    line-level FK, because re-reading `docs/migration/pr-po-gr-v1-mapping.md`
    showed V1 GR rows resolve a PO bill only via a PO-line match on
    `Ref_PO_UID`; the 10 known orphan rows can't resolve either, so the
    header stays importable without fabricating a bill link. Documented
    inline in the migration and in the plan's handoff notes.
  - Verified: `npm run check:migrations` passes (36 public tables, 13
    permissions). `npm run lint`, `npm run typecheck` pass (no `src/`
    changes). `git diff --check` passes (pre-existing CRLF warnings only).
  - No data import, no V1 production files, no secrets changed.
- Continued the same `Go:` slice on 2026-06-22 (`ok go next`): applied
  migration `0013` to staging and verified it (task breakdown items 5-6).
  - `npm run db:apply-migrations -- 0013_pr_po_gr_foundation.sql`:
    `Sanity: public_tables=36, permissions=13, apps=8, private_functions=4`.
  - `npm run db:verify-staging-schema`: `Schema verification passed (36
    public tables, 34 policies)`.
  - A live anon Data API call (`curl` with only the publishable `apikey`
    header, no auth) against `purchasing_purchase_requests` and
    `receiving_goods_receipts` both returned `HTTP 401` /
    `permission denied for table`, matching `V2-0008`'s `public.apps`
    anon-denial precedent exactly — a real Data API check, not just a
    static grant inspection.
  - Checked which roles currently hold `purchasing.*`/`receiving.*`
    permissions: only `purchasing.write`/`receiving.write` (on
    `ADMIN`/`SUPERVISOR`/`AKRA`/`WAREHOUSE`, from the real V1 import) — no
    role has the `.read` variant specifically, but the select policies
    treat read-or-write as equivalent so this still grants access.
    Confirming a permission-holding role can read **real rows** is deferred
    until a write path/UI lands and inserts data — there are zero rows in
    any of the 9 tables right now, matching how Picking's RLS-with-real-rows
    proof happened alongside `V2-0019`/`V2-0020`'s UI, not at `V2-0006`'s
    schema-creation time.
  - No new tooling needed for item 5: `check:migrations` and
    `db:verify-staging-schema` already derive expected tables/policies from
    the migration files dynamically.
  - `V2-0036` task breakdown items 4-7 are now all done. No data import, no
    runtime UI, no RPCs, no V1 production files, no secrets changed.
- Executed `V2-0041` on 2026-06-23 (bare `Go`, plan drafted inline per the
  `V2-0017`/`V2-0023`/`V2-0025` precedent): placeholder route guard pass.
  - Picked up the decision board's unblocked Near-Term Queue item 5 / Watch
    List entry: `/purchasing`, `/receiving`, `/warehouse`, `/returns`, and
    `/kpi` rendered placeholder content to anyone, signed in or out,
    regardless of permission, because `ModuleLandingPage` never called
    `requirePermission()`.
  - Added a `requirePermission({ permission: app.requiredPermission as
    AppPermission })` + `AccessDenied` guard to
    `src/modules/core/module-landing-page.tsx` (shared by all 5 routes),
    using each app's existing `public.apps.required_permission` value —
    mirrors `src/app/picking/page.tsx`'s guard shape exactly, no new
    permissions or schema changes. Added `export const dynamic =
    "force-dynamic"` to the 5 route files with the same comment Picking
    uses, since the page is now genuinely per-user.
  - Verified signed-out via a local dev server + `curl` (no Playwright —
    a static first-load check, not an interactive flow): all 5 routes now
    return the "Sign In Required" `AccessDenied` body instead of the
    placeholder "Current Status" content. Did not separately verify the
    authenticated-forbidden/authenticated-allowed branches with a real
    test account — the `requirePermission()`/`AccessDenied` code path
    itself is unchanged, already proven correct in Picking (`V2-0019`) and
    Main (`V2-0017`); only new call sites were added, no new logic.
  - `lint`/`typecheck`/`build` pass. `git diff --check` passes (pre-existing
    CRLF warnings only). No Supabase schema, staging data, V1 production
    files, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.

## Next Actions

1. ~~Prepare and run the actual V1 core import script (writing profiles/user_roles/role_permissions to staging) based on `scripts/core-import-dry-run.mjs` validation report.~~ Done 2026-06-20.
2. ~~Execute `V2-0019`: implement permission-gated Picking read-only list/detail
   (`/picking` and `/picking/[id]`) against staging Supabase.~~ Done 2026-06-20.
3. ~~Review or execute `V2-0020`: create requisition write slice with
   shared-catalog bridge, transaction-safe daily bill number allocation,
   reference-data dry run/import, and `/picking/new`.~~ Done 2026-06-20.
4. ~~Execute Phase 1 Main portal (`V2-0017`).~~ Done 2026-06-20.
5. ~~Execute Picking status transitions (`pending -> picked -> sent`).~~ Done
   2026-06-20 (`V2-0023`).
6. ~~Execute Picking problem reporting.~~ Done 2026-06-20 (`V2-0025`).
7. ~~Execute Picking LINE notification/failure recovery.~~ Done 2026-06-22
   (`V2-0027`). Real LINE sends remain unproven pending credentials and
   explicit approval.
8. ~~Prepare the Picking cutover package.~~ Done 2026-06-22 (`V2-0034`,
   `docs/migration/picking-cutover-package.md`). User authorized committing
   and pushing today's work on 2026-06-22. **Not approved for cutover** —
   remaining gates are: personally exercise the deployed Vercel
   Preview/Development build or accept staging/local verification as
   sufficient; run one combined human UAT pass versus relying on per-slice
   automated checks only; run a fresh V1 reference export/recheck; and execute
   the cutover runbook steps.
9. ~~Draft migration `0013` for the locked PR/PO/GR schema/RLS foundation
   only, then apply it to staging and verify.~~ Done 2026-06-22 (`V2-0036`
   task breakdown items 4-7 all complete). Next PR/PO/GR work is data
   import and runtime UI, gated on a fresh PR CSV export and a
   release-shape decision — no specific command queued yet.
10. ~~Execute `V2-0037`: design and implement the Purchase Requisitions (PR) frontend mockup (`docs/mockups/pr-ui-ux-mockup.html`).~~ Done 2026-06-22.
11. ~~Execute `V2-0038`: design and implement the KPI Tracker frontend mockup (`docs/mockups/kpi-ui-ux-mockup.html`).~~ Done 2026-06-22.
12. ~~Placeholder route guard pass: add server-side `requirePermission()`
    guards to `/purchasing`, `/receiving`, `/warehouse`, `/returns`,
    `/kpi`.~~ Done 2026-06-23 (`V2-0041`, bare `Go`).
13. Provide/export a fresh live V1 `PR` CSV for `V2-0040`, then run
    `Go: execute V2-0040 PR CSV reconciliation dry-run`.
14. Keep `docs/plans/index.md` updated whenever a plan status or next action
    changes.
15. Keep `docs/handoff/work-log.md` as the active recent log; archive older
    entries under `docs/handoff/archive/` when it becomes long again.
16. Use `docs/project-management/executive-summary-th.md` when the user needs
    a supervisor-friendly project summary.


## Open Questions

- Should V2 use Supabase Auth from day one, or temporarily bridge existing Main
  SSO during migration?
- Should Vercel production be private/protected until first cutover?
- Which module should be the pilot if the user prefers something other than
  `Picking`?
- How should V1 users without email addresses be represented in Supabase Auth?
- Will V1 Sheets remain read-only archives after each module cutover, or should
  there be a temporary sync window?
- Should every non-Picking module history be imported before cutover, or should
  some V1 Sheets remain read-only archives after V2 operational replacement?

## Safety Notes

Do not modify V1 repos, GAS deployments, production Sheets, or production URLs
while working in V2 unless the user explicitly approves a cutover task.

Do not commit real Supabase keys. The service role key must only be stored in
local ignored env files, Vercel environment variables, or a secure secret
manager.
