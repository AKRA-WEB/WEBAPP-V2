# Archived Work Log: 2026-06-22 (Migration 0013 Apply Through KPI Mockup)

Archived from `docs/handoff/work-log.md` on 2026-06-23 to keep the active
log under its context budget. Covers, newest first: PR/PO/GR migration
`0013` applied to staging and verified (`V2-0036`), migration `0013`
drafted (`V2-0036`), PR/PO/GR schema/RLS lock (`V2-0036`), today work
closeout commit/push, and the KPI frontend mockup (`V2-0038`).

## 2026-06-22 - PR/PO/GR Migration 0013 Applied To Staging (V2-0036)

Context:

- User sent `ok go next`, continuing the same `Go:` slice to its
  recommended next step: apply migration `0013` to staging and verify
  (task breakdown items 5-6), then close out docs (item 7).

Changes:

- Applied `supabase/migrations/0013_pr_po_gr_foundation.sql` to staging via
  `npm run db:apply-migrations -- 0013_pr_po_gr_foundation.sql` (had to pass
  the bare filename — the script matches against `readdirSync` names, a
  full relative path fails with "Migration file not found").
- Checked which roles currently hold `purchasing.*`/`receiving.*`
  permissions (direct read-only SQL query): only `.write` variants exist
  (`ADMIN`/`SUPERVISOR`/`AKRA`/`WAREHOUSE`, from the real V1 import), no
  role has `.read` specifically — the select policies treat read-or-write as
  equivalent, so this still grants access once data exists.
- No verification tooling changes needed: `check:migrations` and
  `db:verify-staging-schema` already derive their expected-table/policy
  lists from the migration files dynamically (regex over
  `create table public.*`), so they picked up the 9 new tables with zero
  script edits.
- Updated `docs/migration/database-strategy.md`,
  `docs/migration/module-inventory.md`,
  `docs/plans/V2-0036-pr-po-gr-foundation.md` (task items 5-6 marked done,
  handoff notes, next action), `docs/plans/index.md`,
  `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md` to record the apply +
  verification and that `V2-0036`'s foundation work (task items 4-7) is now
  fully complete.

Verification:

- `npm run db:apply-migrations -- 0013_pr_po_gr_foundation.sql`:
  `Sanity: public_tables=36, permissions=13, apps=8, private_functions=4`.
- `npm run db:verify-staging-schema`: `Schema verification passed (36
  public tables, 34 policies)`.
- Live anon Data API check (not just a static grant inspection): `curl`
  against `purchasing_purchase_requests` and `receiving_goods_receipts`
  with only the publishable `apikey` header (no auth) both returned
  `HTTP 401` / `permission denied for table`, matching `V2-0008`'s
  `public.apps` anon-denial precedent exactly.
- Did not confirm a permission-holding role can read **real rows** — there
  are zero rows in any of the 9 new tables (no data import yet). Deferred
  to whenever the first write path/UI lands, matching how Picking's
  RLS-with-real-rows proof happened alongside `V2-0019`/`V2-0020`'s UI, not
  at `V2-0006`'s schema-creation time. No new `SECURITY DEFINER` functions
  exist in this migration, so the "service-role-only functions not
  executable by browser roles" check doesn't apply yet either.
- No data import, no `src/app/purchasing`/`src/app/receiving` routes, no
  transaction RPCs, no V1 production files, no secrets changed.
- No specific next PR/PO/GR command is queued: further work needs a fresh
  PR CSV export and a release-shape decision first.

## 2026-06-22 - PR/PO/GR Migration 0013 Draft (V2-0036)

Context:

- User sent `Go: draft V2-0036 migration 0013 schema/RLS foundation only`,
  scoping execution to task breakdown item 4 of the `V2-0036` plan only
  (write the migration; do not apply to staging, extend verification
  tooling, or close out docs — those are items 5-7).

Changes:

- Added `supabase/migrations/0013_pr_po_gr_foundation.sql`: the 9 tables
  locked by ADR `0020` — `purchasing_purchase_requests`,
  `purchasing_purchase_request_lines`, `purchasing_purchase_orders`,
  `purchasing_purchase_order_lines`, `purchasing_events`,
  `receiving_goods_receipts`, `receiving_goods_receipt_lines`,
  `receiving_line_splits`, `receiving_events`. All 9 are RLS-enabled with a
  revoke-then-grant posture (`authenticated` select-only, `service_role`
  full table privileges, no `anon` grant) and a select policy combining
  `purchasing.read/write`/`receiving.read/write` per the two locked
  permission groupings (PR tables + `purchasing_events` use the narrower
  2-permission check; PO tables and all receiving tables use the
  4-permission check). No data import, no UI routes, no new permissions, no
  views, no `SECURITY DEFINER` functions/RPCs.
- Implemented every locked legacy-bridge field: nullable
  `expected_date`/`raw_expected_date`/`expected_date_source` on the PO
  header; `bill_identity_kind`/`bill_identity_value`/`legacy_ref_pr_uid`/
  `legacy_group_key`/`is_direct`/`is_legacy_ambiguous` plus the locked
  partial unique index on `(legacy_source, bill_identity_kind,
  bill_identity_value)`; nullable `purchase_order_line_id` plus raw
  `legacy_ref_po_uid` on GR lines for the 10 known orphan rows; a
  `date_parse_status` check (`parsed`/`placeholder`/`epoch_artifact`/
  `malformed`) on GR lines mirroring the dry-run script's
  `classifyDateField` categories; nullable catalog/vendor/warehouse FK
  columns throughout (never fabricated); FK indexes on every
  nullable/non-null foreign key per the locked index rule.
- One schema judgment call beyond the plan's literal field list, made while
  drafting rather than re-running `Architect:`: re-reading
  `docs/migration/pr-po-gr-v1-mapping.md`'s GR section showed V1 GR rows
  resolve a PO bill only by first resolving `Ref_PO_UID` to a specific PO
  **line** — so the 10 orphan rows that can't resolve a PO line also can't
  resolve a PO bill. Made `receiving_goods_receipts.purchase_order_id`
  nullable (the plan's field list only marked the line-level FK nullable) so
  these orphan receipts stay importable without fabricating a bill link;
  documented inline in the migration with a comment citing the mapping doc.
- Updated `docs/migration/database-strategy.md`,
  `docs/migration/module-inventory.md`, `docs/plans/V2-0036-...md`,
  `docs/plans/index.md`, `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md` to record the draft and the
  schema judgment call.

Verification:

- `npm run check:migrations` passes: 36 public tables, 13 permissions (up
  from 27 tables before this migration).
- `npm run lint` and `npm run typecheck` pass (no `src/` changes).
- `git diff --check` passes (pre-existing CRLF warnings only).
- Did not run `npm run db:apply-migrations` or
  `npm run db:verify-staging-schema` — applying to staging is task
  breakdown item 6, out of scope for this "draft ... only" slice. The
  migration is not applied to any environment yet.
- No data import, no `src/app/purchasing`/`src/app/receiving` routes, no
  transaction RPCs, no V1 production files, no secrets changed.
- Next recommended command: `Go: apply V2-0036 migration 0013 to staging
  and verify`.

## 2026-06-22 - PR/PO/GR Schema/RLS Lock (V2-0036)

Context:

- User requested `Architect: ล็อก schema/RLS ของ V2-0036 จาก dry-run report
  ก่อน migration`.
- Planning-only command. No runtime code, SQL migration, staging data, V1
  production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.

Changes:

- Rechecked current Supabase changelog/docs before locking the plan:
  explicit grants plus RLS remain the required Data API posture; public tables
  created through SQL need RLS enabled; functions should stay
  `SECURITY INVOKER` by default with narrow `EXECUTE` grants.
- Added ADR `0020` to lock the PR/PO/GR schema/RLS foundation for migration
  `0013`.
- Updated `V2-0036` with the locked table family:
  `purchasing_purchase_requests`, `purchasing_purchase_request_lines`,
  `purchasing_purchase_orders`, `purchasing_purchase_order_lines`,
  `purchasing_events`, `receiving_goods_receipts`,
  `receiving_goods_receipt_lines`, `receiving_line_splits`, and
  `receiving_events`.
- Locked dry-run warning handling: missing PR CSV and `Expected_Date` do not
  block schema; bare legacy `DIRECT` is legacy-only/ambiguous; orphan GR
  references stay auditable with nullable FKs; raw status/date/location/product
  values are preserved.
- Locked RLS/grants: no `anon` access, `authenticated` select only through
  current coarse permissions, no authenticated writes in `0013`, and
  service-role-only server writes later following ADR `0015`.
- Updated `docs/migration/database-strategy.md`,
  `docs/migration/pr-po-gr-v1-mapping.md`, `docs/plans/index.md`,
  `docs/handoff/current-state.md`, `docs/migration/module-inventory.md`, and
  `docs/project-management/decision-board.md`.

Verification:

- Documentation-only verification: `git diff --check` passed.
- Next recommended command:
  `Go: draft V2-0036 migration 0013 schema/RLS foundation only`.

## 2026-06-22 - Today Work Closeout Commit/Push

Context:

- User asked to resolve the final `V2-0034` review wording issue, then commit
  and push today's work.

Changes:

- Removed the remaining current-state "committed" wording from the Picking
  cutover evidence package and synced the related package/plan/index/decision
  board language so the reconciliation script is described by reproducibility,
  not by pre-commit status.
- Included today's frontend lane docs/mockups, PR/PO/GR foundation dry-run
  tooling, Picking cutover package/reconciliation script, handoff archives,
  and process docs in one closeout set.
- Updated current handoff state so Picking cutover remains **not approved**
  after the closeout. The still-open gates are deployed Vercel verification,
  one combined human UAT pass, a fresh V1 reference export/recheck, and the
  cutover runbook execution itself.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run pr-po-gr:import-dry-run` passed read-only: 750 PO rows, 1,868 GR
  rows, 0 blockers, 7 warnings.
- `npm run picking:verify-cutover-reconciliation` passed read-only: 4 fixture
  requisitions, 0 `v2_app` rows, 0 orphan lines/events, 1 known seed-fixture
  quirk.
- `npm run picking:reference-import-dry-run` passed read-only: 4,761 product
  rows, 3 manual-review rows, 0 blockers, 2 warnings.
- `git diff --check` passed after closeout edits (CRLF warnings only).
- No `src/` runtime app code, Supabase schema, staging writes, V1 production
  files, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed by
  the closeout edits themselves.

## 2026-06-22 - KPI Frontend Mockup (V2-0038)

Context:
- User requested KPI (KPITracker / Analytics) module mockup next.
- Mapped to preserve branch selection gates, daily record entries, and gamification leaderboards.

Changes:
- Added `docs/plans/V2-0038-kpi-frontend-mockup.md`.
- Added `docs/mockups/kpi-ui-ux-mockup.html`:
  - Static HTML/CSS mock-up demonstrating multi-tab navigation: บันทึก (Record), แดชบอร์ด (Dashboard), ภาพรวม (Admin Dash), ตั้งค่า (Admin Settings).
  - Branch selection switcher (AKRA vs TRD) that dynamically hides daily work volume adjusters for TRD, matching V1.
  - Role switcher (STAFF, SUPERVISOR, ADMIN) that gates tab visibility.
  - Device layout simulator (MOBILE 390px vs DESKTOP).
  - Record view: logs errors, daily work volume numbers, and weekly tasks check-offs.
  - Dashboard view: interactive SVG trend line charts showing daily errors, AI smart summary recommendations, and gamification leaderboard displaying employee HP rings (starting at 100 HP).
  - Executive / Admin Dash view: month, branch, and employee filters, monthly statistics summary, monthly Top 5 errors bar charts (drawn dynamically via SVG), and CSV export downloader.
  - Admin Settings view: employee profile roster builder allowing additions, edits, and deletions.
  - Local database synced to `localStorage` enabling dynamic data updates and calculations.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` to register `V2-0038`.

Verification:
- Opened `kpi-ui-ux-mockup.html` in the local browser and verified that:
  - Branch switching correctly toggles branch display in header and hides/shows WMS volumes.
  - Saving a daily record (errors, volumes, tasks) persists changes to the mock database.
  - Dashboard dynamically updates statistical cards, SVG line charts, AI summaries, weekly tasks check-offs, and employee HP rings based on saved data.
  - Supervisor and Admin roles expose "ภาพรวม" and "ตั้งค่า" tabs, where CSV export downloads a valid file, Top 5 charts redraw, and employees can be created or edited.
  - No horizontal overflow is observed at a 390px viewport width.
- No Next.js runtime code or database schema changed.
- `git diff --check` passed.
