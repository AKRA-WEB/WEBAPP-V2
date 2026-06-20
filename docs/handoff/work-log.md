# Work Log

This file keeps only recent handoff entries for quick resume.

Older entries are archived:

- `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`

Resume order:

1. `CONDUCTOR.md`
2. `docs/plans/index.md`
3. `docs/handoff/current-state.md`
4. The latest entries below

Open an archive only when investigating a historical plan, decision, or verification detail.

## 2026-06-20 - V2-0018 Completion Correction

Context:
- User asked to check completed work and then requested the V2-0018 issues be
  fixed.
- Review found that the V2-0018 transformer/import did not apply the resolved
  business rule that TRDAKRA Product entries default to `akra_trd`; W3/C1 were
  still treated as TRD in the preview/mapping path.
- Review also found two safety issues: destructive staging scripts lacked
  explicit confirmation flags, and `requirePermission({})` allowed any
  authenticated user when a caller omitted a requirement.

Changes:
- Updated `scripts/product-catalog-import-transformer.mjs` and
  `scripts/product-catalog-import-apply.mjs` so W1 is TRD; W2, W3, W4, W5, C1,
  and C2 are AKRA; TRDAKRA Product entries create both TRD and AKRA business
  scopes.
- Added `--confirm-staging-import` to the real catalog import script and
  staging project checks before truncating/reloading catalog/warehouse tables.
- Changed `scripts/check-locks.mjs` to dry-run by default and require
  `--terminate --confirm-staging-lock-cleanup` before terminating sessions.
- Added `scripts/verify-product-catalog-import.mjs` and
  `npm run db:verify-catalog-import` for repeatable read-only validation of
  catalog row counts, warehouse business units, and TRDAKRA scope classification.
- Updated `requirePermission()` so callers must provide an explicit non-empty
  permission requirement; empty guard calls now fail closed.
- Updated stale plan, migration, mapping, README, and handoff docs to reflect
  `0008` and the corrected staging catalog baseline.
- Re-ran the corrected catalog import against staging.

Verification:
- Official Supabase docs/changelog were rechecked before touching the staging
  Supabase baseline; current docs still require RLS on exposed tables and
  explicit grants for Data API access.
- `node scripts/product-catalog-import-transformer.mjs` now reports 45
  `trd_only`, 36 `akra_only`, 1,791 `akra_trd`, and 2,921 `unassigned`.
- `node scripts/product-catalog-import-apply.mjs` refuses to run without
  `--confirm-staging-import`.
- `node scripts/check-locks.mjs` lists sessions but does not terminate them by
  default.
- `node scripts/product-catalog-import-apply.mjs --confirm-staging-import`
  successfully reloaded staging catalog/warehouse data.
- `npm run db:verify-staging-schema` passed after the reimport.
- `npm run db:verify-catalog-import` passed after the reimport.
- Staging aggregate verification passed: 4,793 products, 173 vendors, 11,433
  aliases, 3,760 scope entries, 126 locations, 1,791 par configs, 116 balances,
  and 1,660 movements. All 1,791 TRDAKRA alias products are now `akra_trd`;
  `trd_alias_products_trd_only` is 0.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or V1
  production data were changed.

## 2026-06-20 - Real V1 Core Import (V2-0009 Next Action 1)

- Found real V1 `User`/`AppConfig`/`RoleConfig`/`PermConfig` exports already
  on disk under `import-data/main/` (gitignored), in a different shape than
  the synthetic fixtures `scripts/core-import-dry-run.mjs` was built against:
  `User.csv` header is `ID,Name,Roles,Password` (capitalized), `RoleConfig.csv`
  keys roles by `val` instead of `role`, and real `PermConfig.csv` has more
  `app-ret.*` keys than the original V1-to-V2 permission map covered.
- Checked V1 `Main/Code.gs` (local, gitignored) for a live bulk-export path
  before assuming one was needed: confirmed it has none (only per-user SSO
  lookups and write-only admin actions behind a JWT), so the real exports
  already on disk were the only practical data source; no Google Sheets API
  credentials were set up.
- Updated `scripts/core-import-dry-run.mjs` to prefer real data under
  `import-data/main/` over the synthetic fixtures, with case-insensitive /
  alias header lookups (`role`/`val`, `ID`/`id`, etc.) so real V1 header
  naming doesn't trip header validation. Fixed a synthetic-email collision
  bug: email is now keyed on the V1 row's unique `ID`
  (`name.id@akra-v2.test`), not display name alone, after the synthetic
  fixture proved two same-named users would otherwise collide into one
  Supabase Auth account. Extended `v1ToV2PermissionMap` with six previously
  unmapped `app-ret.*` keys (`ADD_CLM`, `WH_CLM`, `AUDIT_CREATE`,
  `AUDIT_REVIEW`, `BATCH_RET`, `TRACK_CUST`) → `returns.write`.
  `app-akra.manageProducts` was deliberately left unmapped (see ADR `0011`).
- Ran the dry run against the real data: 15 users, 0 blockers, 1 warning
  (`app-akra.manageProducts` unmapped). Report at
  `import-reports/dry-run-report.md` (local only, git-ignored).
- User reviewed the report and confirmed at the checkpoint: create the 5
  missing V2 roles (`SUPERVISOR`, `AKRA`, `TRD`, `WAREHOUSE`, `CASHIER`), drop
  `app-akra.manageProducts` from this import, and import all 15 V1 users
  as-is (including four with non-numeric/test-looking IDs the agent flagged
  for confirmation). Recorded in ADR `0011`.
- Added `scripts/core-import-apply.mjs`: idempotent write script gated on
  `--confirm-core-import` and on `NEXT_PUBLIC_SUPABASE_URL` matching the known
  staging project ref. Creates missing roles from `RoleConfig.csv`, upserts
  `role_permissions`, and creates/links `auth.users` (email_confirm: true, no
  password — the V1 `Password` column is never read or stored) + `profiles` +
  `user_roles` per real V1 user, keyed on `legacy_uid`/`legacy_source` for
  safe re-runs.
- Ran `node scripts/core-import-apply.mjs --confirm-core-import` against
  staging: created 5 roles, upserted 18 `role_permissions` grants, and
  created/linked 15 users. Apply report at
  `import-reports/core-import-apply-report.md` (local only, git-ignored).

Verification:

- `node --check` passed on both updated/new scripts.
- Running `scripts/core-import-apply.mjs` without `--confirm-core-import`
  refuses to write (exit 1).
- `npm run db:verify-staging-schema` passed (27 public tables, 25 policies)
  after the write.
- Targeted query against staging confirmed: 15 `profiles` rows with
  `legacy_source = 'v1-main'`, exactly the 5 new role keys present in
  `roles`, 22 total `user_roles` rows, 21 total `role_permissions` rows
  (consistent with 18 new grants plus pre-existing `V2-0014` staging test
  role grants).
- `npm run lint` and `npm run typecheck` passed.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or V1
  production data were changed. Real V1 export CSVs and generated reports
  stayed local/gitignored throughout.

## 2026-06-20 - Picking Read-Only Pilot Planning (V2-0019)

- User asked to lay out today's work plan after the core import and catalog
  baseline were completed.
- Completed the `V2-0010` Picking product/user-flow gate for the first
  implementation slice: start with read-only list/detail only.
- Added plan `V2-0019` for the first Picking UI execution slice:
  permission-gated `/picking` list, `/picking/[id]` detail, server-only read
  helpers, compact mobile-friendly UI states, and optional staging-only
  synthetic fixtures if no requisitions exist.
- Added ADR `0012` recording the decision to defer create requisition, daily
  bill number allocation, status/problem workflows, and LINE integration until
  after the read-only path is verified.
- Updated `V2-0009`, `docs/plans/index.md`,
  `docs/migration/migration-plan.md`, and `docs/handoff/current-state.md` so
  the next action points to `V2-0019` and stale core-import status is removed.

Verification:

- Planning/docs-only change in V2 repo.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed.

## 2026-06-20 - Picking Read-Only Pilot Execution (V2-0019)

- User sent `Go:` to execute plan `V2-0019`.
- Read the `0004`/`0005` Picking staging migrations to confirm exact table
  names/columns (`picking_requisitions`, `picking_requisition_lines`,
  `picking_requisition_events`) and confirmed `picking.read`/`picking.write`
  are already correctly granted to `PICKING_READER`/`PICKING_WRITER` via
  `role_permissions`.
- Queried staging directly: `picking_requisitions` and related tables all had
  0 rows, so the fixture step in the plan was required.
- Added `src/modules/picking/read-model.ts` (server-only `listRecentRequisitions`
  and `getRequisitionDetail`, normal authenticated Supabase reads so RLS stays
  in the verification path) and `src/modules/picking/format.ts` (bill label,
  status label/tone, Bangkok-timezone date/time, quantity formatting).
- Replaced `src/app/picking/page.tsx` (was the generic `ModuleLandingPage`
  placeholder) with a guarded list using
  `requirePermission({ anyOf: ["picking.read", "picking.write"] })`: status
  summary counts, recent requisition rows linking to detail, and an empty
  state.
- Added `src/app/picking/[id]/page.tsx`: guarded detail with bill
  header/status, a metadata grid (bill type, requester, assignee, requested,
  and conditionally picked/sent/problem-reported timestamps), a lines list,
  a lifecycle event timeline, and an inline not-found state.
- Added CSS for `.requisition-list`/`.requisition-row`,
  `.requisition-meta-grid`, `.requisition-lines`/`.requisition-line`, and
  `.requisition-timeline` in `src/app/globals.css`, reusing the existing
  `.summary-grid`/`.metric-panel`/`.module-detail` primitives where they
  already fit.
- Added `scripts/picking-seed-staging-fixtures.mjs` (new npm script
  `picking:seed-staging-fixtures`): gated on `--confirm-picking-fixtures` and
  on the known staging project ref, idempotent via `upsert` on
  `picking_requisitions.legacy_uid`. Seeded one fixture staff row and 4
  fixture requisitions (`legacy_source = "v2_fixture"`, all names prefixed
  "Fixture …") spanning `pending`/`picked`/`sent`/`line_push_failed`(with
  `problem_reported`) states, each with lines and lifecycle events, and
  synced `picking_daily_sequences` for today's `bill_date` so future real
  bill-number allocation will not collide with the fixture rows.
- Ran the seed script against staging once
  (`node scripts/picking-seed-staging-fixtures.mjs --confirm-picking-fixtures`).
- Found, during browser verification, a pre-existing mobile bug in the shared
  `AppShell`: the mobile `.sidebar` rule in `src/app/globals.css` had no
  `min-inline-size: 0`, so the horizontally scrollable `.side-nav` strip
  forced the whole document wider than the viewport at narrow widths
  (measured `document.documentElement.scrollWidth` of 1143px at a 390px
  viewport, on every page, not just Picking). Added
  `min-inline-size: 0` to `.sidebar` inside the existing
  `@media (max-width: 820px)` rule; this is a one-line CSS bug fix, not an
  app-shell redesign, so it stays in scope for this slice. Re-measured zero
  overflow afterward.

Verification:

- `npm run lint`, `npm run typecheck`, and `npm run build` all passed (routes
  `/picking` and `/picking/[id]` both compile as dynamic/server-rendered).
- `git diff --check` passed.
- Browser-verified against staging using a temporary local Playwright install
  (`npm install --no-save playwright`, `npx playwright install chromium`;
  both removed again after the run, same pattern as the 2026-06-19
  `/admin/permissions` check):
  - Signed-out: `/picking` shows the "Sign In Required" `AccessDenied` state.
  - `test-guest@akra-v2.test` (`GUEST`, no Picking permission): `/picking`
    shows "Access Denied".
  - `test-admin@akra-v2.test` (`ADMIN`), `test-picker-writer@akra-v2.test`
    (`PICKING_WRITER`), `test-picker-reader@akra-v2.test` (`PICKING_READER`):
    all see the "Recent Requisitions" list with the 4 fixture rows and
    correct status summary counts; opening a row renders the detail page with
    lines and lifecycle events.
  - Checked `/picking` and `/picking/[id]` at a 390px viewport for all three
    allowed accounts after the sidebar fix:
    `document.documentElement.scrollWidth === clientWidth` (390 === 390, zero
    overflow) in every case.
  - No browser console errors in any of the above checks.
  - Test account passwords were reset to a temporary known value via the
    service-role Admin API for this verification session only; the value was
    not written to any committed file. These are synthetic staging-only test
    accounts with no production use.
- No V1 production apps, GAS deployments, Sheets, GitHub Pages, live URLs,
  LINE tokens, or production data were touched. Staging writes were limited to
  the 4 clearly-marked fixture requisitions (plus their lines/events) and the
  `picking_daily_sequences` row for today.

Follow-up fix (same session): the plan's spec lists a distinct error state
("compact operational error with no secret details"), but the initial
implementation silently mapped a Supabase query error onto the empty/not-found
states, which would be misleading. Changed `listRecentRequisitions` and
`getRequisitionDetail` in `src/modules/picking/read-model.ts` to return a
discriminated result (`{ status: "ok" | "error" }`, plus `"not_found"` for
detail) instead of swallowing errors, and added a real error branch to
`/picking` and `/picking/[id]`. Re-ran `lint`/`typecheck`/`build` (all pass)
and re-verified against staging as `test-admin@akra-v2.test`: list ok-state,
detail ok-state, and a bogus-UUID not-found state all render correctly with no
console errors.

## 2026-06-20 - Picking Create Requisition Write Slice Plan (V2-0020)

Context:

- User reviewed the current state and asked for the next plan.
- Read the required V2 repo docs, current handoff, V1 development context, the
  existing Picking plans (`V2-0010`, `V2-0019`), Picking migrations/mapping, and
  the current read-only Picking code before drafting the plan.
- Checked current official Supabase docs/changelog before planning the next
  Supabase/Postgres write slice. The relevant guidance remains: explicit Data
  API grants and RLS on exposed tables, restricted execution for database
  functions with fixed `search_path`, and no trust in user-editable metadata or
  raw session objects for authorization.

Changes:

- Added `docs/plans/V2-0020-picking-create-requisition-write-slice.md`.
- Added ADR `docs/decisions/0013-picking-create-before-line-status-and-problem.md`.
- Updated `docs/plans/index.md`, `V2-0009`, `V2-0010`, `V2-0019`, and current
  handoff docs so the next action is discoverable from repo files.
- The plan selects create requisition as the next slice before LINE,
  in-app status transitions, or problem reporting.
- The plan records that Picking lines should bridge to the shared catalog now,
  matching the resolved `V2-0018` direction, and that the implementation should
  start with a gated Picking reference-data dry run/import for ProductName
  aliases and Staff.

Verification:

- Planning/docs-only change in V2 repo.
- `git diff --check` passed with line-ending warnings only for existing working
  tree files.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed by this plan.

## 2026-06-20 - Active Work Log Archive Policy (V2-0021)

Context:

- User asked to manage the documentation so old work-log entries do not consume
  excessive token/context budget during future resume.
- The active `docs/handoff/work-log.md` had become a long append-only history.
  `docs/handoff/current-state.md` and `docs/plans/index.md` already summarize
  the current state, so routine sessions do not need every historical log entry.

Changes:

- Added `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md` and moved
  older 2026-06-18 through 2026-06-19 entries there.
- Rewrote the active `docs/handoff/work-log.md` header with archive pointers
  and kept only recent 2026-06-20 entries.
- Added plan `V2-0021` and ADR `0014` documenting the active-log/archive
  policy.
- Updated `AGENTS.md`, `CONDUCTOR.md`, `README.md`, `docs/plans/index.md`, and
  `docs/handoff/current-state.md` so future agents read archive logs only when
  older historical detail is needed.

Verification:

- Documentation/process-only change.
- Historical entries were moved, not deleted.
- `git diff --check` passed with line-ending warnings only.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed.

## 2026-06-20 - Picking Create Requisition Write Slice Execution (V2-0020)

Context:

- User sent `Go:` (no plan ID given). Read `docs/handoff/current-state.md`
  Next Actions: item 3 was "review or execute `V2-0020`", the only
  approved-but-not-yet-executed plan, so executed it.
- Found prior `V2-0019`/`V2-0021` work already on disk but uncommitted; left
  it untouched per the resume protocol (did not revert or commit it).

Changes:

- Reconfirmed staging counts before building anything: 4 fixture
  requisitions/7 lines/9 events, 1 `picking_staff` row (fixture), 0
  Picking-source `catalog_product_aliases`.
- Added `supabase/migrations/0009_picking_catalog_bridge.sql`: nullable
  `catalog_product_id`/`catalog_alias_id` columns + indexes on
  `picking_requisition_lines`, and an atomic create-requisition function.
  Applied to staging (`npm run db:apply-migrations -- 0009_picking_catalog_bridge.sql`).
- While building the create function, verified empirically against staging
  that the `private` schema is not reachable via the Data API at all
  (`admin.rpc()` with default schema returns `PGRST202` searching `public`;
  with `db: { schema: "private" }` returns `PGRST106`, "Only the following
  schemas are exposed: public, graphql_public"). Revised the function from
  `private.create_picking_requisition` (`SECURITY DEFINER`) to
  `public.create_picking_requisition` (`SECURITY INVOKER`, `EXECUTE` revoked
  from `anon`/`authenticated`, granted only to `service_role`) and
  reconciled staging (dropped the old `private.*` function, created the
  `public.*` one) without re-running the whole migration file a second time.
  Recorded this as ADR `0015` and in
  `docs/migration/database-strategy.md`. Extended
  `scripts/verify-staging-schema.mjs` to assert the new function exists, is
  not `SECURITY DEFINER`, and that `anon`/`authenticated` are absent from its
  `EXECUTE` grantees while `service_role` is present.
- Smoke-tested the RPC directly (`admin.rpc("create_picking_requisition", ...)`)
  before building app code around it: confirmed it writes exactly 1
  requisition + 1 line + 1 `created` event atomically; deleted the smoke-test
  row after.
- Added `scripts/picking-reference-import-dry-run.mjs` (read-only) and ran it:
  4,761 `Picking - ProductName.csv` rows -> 4,758 `matched_code` (exact code
  match against `catalog_products.canonical_code`, since Picking codes are a
  subset of the PO/GR-sourced codes), 0 `matched_exact_name`, 3
  `manual_review`; 1 `Picking - Staff.csv` row ("Chen", active, LINE id
  present, not yet in staging). 0 blockers, 1 warning. Report at
  `import-reports/picking-reference-dry-run-report.md` (local only,
  git-ignored).
- Presented the dry-run report to the user as a checkpoint (matching the
  `V2-0009`/core-import precedent for staging writes) before running the
  gated apply. User confirmed "Apply now".
- Added `scripts/picking-reference-import-apply.mjs`
  (`--confirm-picking-reference-import` + staging project-ref check,
  mirrors `product-catalog-import-apply.mjs`'s `pg`+`bulkInsert` pattern).
  Ran it: replaced (`delete` by `source_app='picking'` then re-`insert`, so
  idempotent/re-runnable) 4,761 `catalog_product_aliases` rows and
  upserted `picking_staff`/`picking_staff_line_accounts` for "Chen".
  Verified via targeted staging queries.
- Added `src/lib/supabase/admin.ts` (server-only `createAdminClient()`,
  service-role key, `import "server-only"` guard against client-bundle
  leakage) and `src/modules/picking/reference-data.ts`
  (`listActivePickingStaff`, `listPickingProductSuggestions` — capped at 300,
  `matched_code` aliases only, since rich autocomplete/search is deferred).
- Added `src/modules/picking/create-action.ts`
  (`createPickingRequisition` server action): `requirePermission({
  permission: "picking.write" })`, server-side validation (bill type,
  assignee is an active staff row, every line has product
  name/qty>0/unit, catalog lines require a `catalogProductId`), looks up the
  signed-in profile's display name/email as `requester_name`, calls the new
  RPC via `createAdminClient()`, and `redirect()`s to `/picking/[id]` on
  success.
- Added `PICKING_BILL_TYPES` to `src/modules/picking/format.ts` (shared
  between server validation and the new form).
- Added `src/app/picking/new/page.tsx` (guarded by `picking.write`) and
  `src/modules/picking/new-requisition-form.tsx` (client component: bill
  type/assignee selects, add/remove line rows, each line is either a
  catalog-product `<select>` or a free-text product-name input, plus
  quantity/unit). Added a writer/admin-only "New requisition" link on
  `src/app/picking/page.tsx` (`can(guard.snapshot, "picking.write")`) and
  dropped the now-inaccurate "Read only" wording from its status pill.
- Added `.secondary-button`, `.workspace-header__actions`,
  `.requisition-form`, `.line-rows`/`.line-row`/`.line-row__grid`/`.line-row__footer`
  to `src/app/globals.css`, plus a `max-width: 560px` rule stacking
  `.line-row__grid` to one column, and extended the existing `.field input`
  rule to also cover `.field select`.

Verification:

- `npm run check:migrations`, `npm run db:verify-staging-schema`,
  `npm run lint`, `npm run typecheck`, `npm run build`, and
  `git diff --check` all pass.
- Fired 5 concurrent `create_picking_requisition` RPC calls: got 5 distinct
  `bill_no` values, each requisition had exactly 2 lines and 1 event;
  deleted all 5 test rows after.
- Browser-verified with a temporary local Playwright install
  (`npm install --no-save playwright` + `npx playwright install chromium`,
  both removed after, same pattern as `V2-0019`'s 2026-06-20 check). Test
  account passwords were reset to a temporary known value via the
  service-role Admin API for this verification session only (user explicitly
  approved this specific action after the harness flagged it as
  unauthorized auth-state mutation; value not recorded in any committed
  file) — same synthetic staging-only accounts as `V2-0019`.
  - Signed-out `/picking/new`: "Sign In Required".
  - `test-guest@akra-v2.test` (`GUEST`): "Access Denied" on both `/picking`
    and `/picking/new`.
  - `test-picker-reader@akra-v2.test` (`PICKING_READER`): no "New
    requisition" link on `/picking`; "Access Denied" on `/picking/new`.
  - `test-picker-writer@akra-v2.test` (`PICKING_WRITER`): "New requisition"
    link present; completed the full UI flow (select assignee, select a
    catalog product, set quantity, submit) and was redirected to
    `/picking/[id]` showing the new bill in `Pending` status. Deleted this
    browser-created requisition after the check.
  - `test-admin@akra-v2.test` (`ADMIN`): "New requisition" link present.
  - 390px viewport: `/picking` and `/picking/new` both measured zero
    horizontal overflow (`scrollWidth === clientWidth`).
  - No browser console errors across any of the above.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched. Staging writes were the migration, the
  Picking-source aliases/staff reference import, and clearly transient
  smoke/browser-test requisitions (all deleted after verification).
- Caught (via advisor review) and fixed a regression in an existing check:
  `scripts/verify-product-catalog-import.mjs` hardcoded
  `catalog_product_aliases` at 11,433 (the `V2-0018` baseline), which the new
  4,761 `source_app='picking'` aliases pushed to 16,194, failing
  `npm run db:verify-catalog-import`. Scoped that count to
  `where source_app <> 'picking'` so it keeps verifying only what `V2-0018`'s
  import owns, independent of future Picking reference re-imports. Re-ran:
  passes (4,793 products, 3,760 scopes).
- Note for future agents: the create flow is verified directly against the
  staging database (local dev + direct RPC calls) but has not been exercised
  through a deployed Vercel Preview/Development build. This is in-scope per
  the plan (`SUPABASE_SECRET_KEY` is already configured there;
  `DATABASE_URL` was never needed), but deployed-create itself is unproven.

## 2026-06-20 - Full V1 Parity Timeline Plan (V2-0022)

Context:

- User asked via `Architect:` for a timeline through the end of the V2 rewrite,
  split by phase/app/module, until V2 can be used like V1.
- Read the planning template, current plan index, current handoff state, active
  work log, migration/module inventory, database strategy, Picking mapping, and
  V1 development context/module status before drafting.

Changes:

- Added `docs/plans/V2-0022-full-v1-parity-timeline.md`.
- Added ADR `docs/decisions/0016-module-by-module-v1-parity-sequence.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` so the
  timeline is discoverable from the normal resume path.
- The plan sequences V1 parity as module waves: Main/Core portal, Picking
  closeout, PR/PO/GR, TRDAKRA/W5, Returnitem, KPITracker, and final
  hardening/cutover.
- The plan records two estimate bands: 7-9 weeks for aggressive operational
  replacement, or 10-12 weeks for safer full parity closeout, assuming one
  focused implementation stream and fast UAT.

Verification:

- Planning/docs-only change in V2 repo.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed.

Follow-up (same session): user asked to save exactly what should be done after
each job. Updated `V2-0022`, `docs/plans/index.md`, and
`docs/handoff/current-state.md` with a concrete next-step chain:

1. Phase 1 Main portal (`V2-0017`).
2. Picking status transitions.
3. Picking problem reporting.
4. Picking LINE notification/failure recovery.
5. Picking cutover package.
6. PR/PO/GR foundation.
7. PR, then PO, then GR.
8. Warehouse/TRDAKRA, then AKRA W5.
9. Returnitem.
10. KPITracker/analytics.
11. Full-system hardening, UAT, and cutover.

Also added a per-step closeout checklist requiring relevant checks, browser and
mobile verification, handoff updates, ADR updates when needed, a clear next
action, and confirmation that V1 production was not changed unless explicitly
approved.
