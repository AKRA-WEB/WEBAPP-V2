# Current State

Last updated: 2026-06-20

## Project

- Repository: `https://github.com/AKRA-WEB/WEBAPP-V2`
- Local path: `C:\dev\AKRA-WEBAPP-V2`
- Status: Phase 3 Picking pilot schema and mapping drafted, applied to staging,
  DB-verified; read-only UI slice (`/picking`, `/picking/[id]`) and the create
  requisition write slice (`/picking/new`) are both implemented and verified
  against staging
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

Goal: Continue Phase 3 from the verified Picking read-only/create baseline
toward a full V1 replacement roadmap. `V2-0022` now frames the remaining work
as module waves: Main/Core portal, Picking closeout, PR/PO/GR, TRDAKRA/W5,
Returnitem, KPITracker, and full hardening/cutover.

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

## Next Actions

1. ~~Prepare and run the actual V1 core import script (writing profiles/user_roles/role_permissions to staging) based on `scripts/core-import-dry-run.mjs` validation report.~~ Done 2026-06-20.
2. ~~Execute `V2-0019`: implement permission-gated Picking read-only list/detail
   (`/picking` and `/picking/[id]`) against staging Supabase.~~ Done 2026-06-20.
3. ~~Review or execute `V2-0020`: create requisition write slice with
   shared-catalog bridge, transaction-safe daily bill number allocation,
   reference-data dry run/import, and `/picking/new`.~~ Done 2026-06-20.
4. Execute Phase 1 Main portal (`V2-0017`) unless the user explicitly changes
   priority. Recommended direction: redesign V2 Main while preserving V1 Main
   behavior and familiar module labels.
5. After Main portal is complete, execute Picking closeout in this order:
   status transitions (`pending -> picked -> sent`), problem reporting, LINE
   notification/failure recovery, then Picking cutover package.
6. After Picking cutover package, plan PR/PO/GR foundation before implementing
   PR, PO, or GR UI.
7. Keep `docs/plans/index.md` updated whenever a plan status or next action
   changes.
8. Keep `docs/handoff/work-log.md` as the active recent log; archive older
   entries under `docs/handoff/archive/` when it becomes long again.


## Open Questions

- Should V2 use Supabase Auth from day one, or temporarily bridge existing Main
  SSO during migration?
- Should Vercel production be private/protected until first cutover?
- Which module should be the pilot if the user prefers something other than
  `Picking`?
- How should V1 users without email addresses be represented in Supabase Auth?
- Will V1 Sheets remain read-only archives after each module cutover, or should
  there be a temporary sync window?
- Should V2 Main require sign-in immediately, or show a signed-out portal state
  with a Sign In action?
- Should queued modules be visible to ordinary users during migration, or only
  to admins/internal testers?
- Should every V1 module history be imported before cutover, or should some
  V1 Sheets remain read-only archives after V2 operational replacement?

## Safety Notes

Do not modify V1 repos, GAS deployments, production Sheets, or production URLs
while working in V2 unless the user explicitly approves a cutover task.

Do not commit real Supabase keys. The service role key must only be stored in
local ignored env files, Vercel environment variables, or a secure secret
manager.
