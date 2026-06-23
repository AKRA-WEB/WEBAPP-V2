# Plan V2-0036: PR/PO/GR Foundation

Status: In progress — source profiling + dry-run report, schema/RLS lock,
migration `0013` draft, and staging apply + verification are all complete
(2026-06-22). Remaining: task breakdown item 7 (docs close-out, in
progress) and all future PR/PO/GR data import / runtime UI slices.

Architect command:

```text
Architect: ทำ PR/PO/GR foundation
Architect: ล็อก schema/RLS ของ V2-0036 จาก dry-run report ก่อน migration
```

## 1. Goal

- Primary objective: plan the shared data, import, permission, and verification
  foundation for PR, PO, and GR before any PR/PO/GR runtime UI or workflow
  writes are implemented.
- Success definition: the next `Go:` slice can draft migration `0013` from a
  locked schema/RLS decision, add verification tooling, and apply the
  foundation to staging without changing V1 production systems.
- User/business reason: PR, PO, and GR are tightly coupled in V1 through shared
  purchasing behavior, Direct PO identity, vendor expected dates, receiving,
  matching, reset/recall, split storage, and APV closeout. Designing them
  separately would risk breaking real purchasing and receiving workflows.

## 2. Requirement And Scope Definition

### Problem

- V2 has core/auth, shared catalog/warehouse baseline, and a complete Picking
  implementation path, but PR/PO/GR still have no workflow schema or import
  dry-run in V2.
- V1 has recent critical parity fixes for Direct PO grouping:
  new Direct PO rows use stable `Ref_PR_UID = DIRECT-<uuid>` and legacy
  `DIRECT` rows keep a fallback grouping behavior. V2 must preserve this
  distinction.
- The current V2 snapshot folder has `PO.csv`, `GR.csv`, `ProductName.csv`, and
  `Vendor.csv`, but no dedicated PR CSV. The first implementation slice must
  confirm the PR source/export path before finalizing PR import mapping.

### Users

- Primary users: purchasing officers creating Direct POs and PR-derived POs,
  warehouse/receiving staff receiving goods, and supervisors approving or
  correcting workflows.
- Secondary users: accounting/admin users closing POs and preparing APV
  records.
- Admin/support users: admins managing permissions, imports, reconciliation,
  and cutover/UAT evidence.

### MVP Features

- Profile V1 PR/PO/GR sources without writing to V1:
  - `import-data/po-pr-gr/Trackingpo - webapp - PO.csv`
  - `import-data/po-pr-gr/Trackingpo - webapp - GR.csv`
  - `import-data/po-pr-gr/Trackingpo - webapp - ProductName.csv`
  - `import-data/po-pr-gr/Trackingpo - webapp - Vendor.csv`
  - confirmed PR source/export, if not already represented by PO fields.
- Create a repeatable dry-run script and report for PR/PO/GR row counts,
  headers, duplicate keys, Direct PO grouping, status values, date parsing,
  product/vendor/warehouse matching, split location evidence, lift-fee tags,
  and missing/ambiguous relationships.
- Draft the grouped schema foundation for purchasing and receiving:
  PR headers/lines, PO headers/lines, PO events, vendor confirmation/expected
  delivery data, GR headers/lines, GR split locations, lift-fee/remark
  metadata, and receiving events.
- Preserve legacy traceability with `legacy_source`, `legacy_uid`,
  `legacy_row`, raw status/date/location fields, and import batch metadata.
- Define RLS, explicit grants, and server-only mutation boundaries before any
  app page writes to these tables.
- Update migration/database docs so future PR, PO, and GR UI plans build on a
  single source of truth.

### Nice-To-Have Features

- Full historical PR import if a clean PR source is not available in the first
  slice.
- PR/PO/GR runtime pages, server actions, notification sends, or cutover
  package.
- Vendor delivery analytics beyond validating expected date, ATA, lead-time,
  and enough data fields to support the later PO insight page.
- Warehouse stock movement writes from GR; this should be decided with the
  later warehouse foundation unless the user explicitly wants stock impact in
  the first GR slice.

### Out Of Scope

- Changing V1 repos, Google Apps Script deployments, Google Sheets schemas,
  GitHub Pages deployments, live GAS URLs, or LINE tokens.
- Implementing PR, PO, or GR Next.js routes beyond existing placeholders.
- Importing data into production or declaring any PR/PO/GR cutover readiness.
- Adding secrets or exposing `service_role`, database URLs, LINE tokens, or
  vendor contact secrets to the browser.
- Treating same-day vendor/warehouse as a Direct PO identity for new V2 data.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: future Next.js App Router routes under `src/app/purchasing/*` and
  `src/app/receiving/*`, using the existing app shell and permission guard
  patterns.
- Backend/server boundary: server components for read models; server actions or
  route handlers for writes; service-role-only RPCs for multi-row transactions.
- Database: Supabase Postgres migrations under `supabase/migrations`.
- Auth/permissions: Supabase Auth, `requirePermission()`, DB-backed
  role/permission grants, and RLS for exposed reads.
- Deployment: staging/Preview/Development first; V1 remains live until a
  PR/PO/GR cutover package is separately approved.

### Data Model / Schema

Schema/RLS lock from the 2026-06-22 dry-run report and current Supabase docs:

- Migration `0013` should create the PR/PO/GR foundation as schema-only
  operational tables, indexes, RLS, grants, and policies. It should not import
  PR/PO/GR data, add UI routes, send notifications, or implement transaction
  RPCs in the first pass.
- Keep the project pattern of `public.<module>_*` tables until custom exposed
  schemas are configured. Every table below lives in `public`, has RLS
  enabled, and has explicit grants in the same migration.
- Primary keys remain UUIDs for consistency with existing V2 tables. Legacy
  row IDs stay as nullable/unique source columns and must not become V2
  primary keys.

Locked table set for migration `0013`:

- `public.purchasing_purchase_requests`
  - PR header grouped by `PR_Number` when a real PR CSV exists.
  - Key fields: `id`, `request_number`, `request_date`, `requester_name`,
    nullable `requester_profile_id`, normalized `status`, `raw_status`,
    approval metadata, `legacy_source`, `source_file`, `source_row`, and
    `metadata`.
  - PR CSV is still missing, so all import fields must be nullable enough to
    allow the table to exist before PR history import.
- `public.purchasing_purchase_request_lines`
  - PR row/line records keyed by nullable unique `legacy_pr_uid`.
  - Key fields: `purchase_request_id`, `line_no`, product/catalog references
    (`catalog_product_id`, `catalog_alias_id`), raw `sku`, raw `product_name`,
    `requested_qty`, `unit`, requester `warehouse_id`/`raw_warehouse`,
    `remark`, approval result, and match status.
- `public.purchasing_purchase_orders`
  - Logical PO bill header, not one row per V1 line.
  - Key fields: `po_number`, `po_date`, vendor reference plus `raw_vendor_name`,
    warehouse reference plus `raw_warehouse`, nullable `expected_date`,
    `raw_expected_date`, `expected_date_source`, normalized `status`,
    `raw_status`, close/APV metadata, and legacy identity fields.
  - Identity fields: `bill_identity_kind` in
    `('pr_uid', 'direct_stable', 'legacy_direct', 'v2_direct')`,
    `bill_identity_value`, `legacy_ref_pr_uid`, `legacy_group_key`,
    `is_direct`, and `is_legacy_ambiguous`.
  - Add a unique index on `(legacy_source, bill_identity_kind,
    bill_identity_value)` where `bill_identity_value is not null`.
- `public.purchasing_purchase_order_lines`
  - V1 PO line rows keyed by nullable unique `legacy_po_uid`.
  - Key fields: `purchase_order_id`, optional `purchase_request_line_id`,
    `line_no`, product/catalog references, raw `sku`, raw `product_name`,
    `ordered_qty`, `unit`, `remark`, `pr_number_label`, normalized `status`,
    raw status/date fields, and match status.
- `public.purchasing_events`
  - Purchasing audit/lifecycle events for PR and PO actions.
  - Key fields: nullable `purchase_request_id`, `purchase_request_line_id`,
    `purchase_order_id`, `purchase_order_line_id`, `event_type`, actor profile
    and name, `metadata`, and `created_at`.
- `public.receiving_goods_receipts`
  - GR header grouped conservatively from V1 rows by PO bill plus receipt
    date/ATA/receiver/status/remark until a stronger receipt identity exists.
  - Key fields: `purchase_order_id`, `receipt_date`, `raw_receipt_date`,
    `ata_date`, `raw_ata`, receiver profile/name, normalized `status`,
    `raw_status`, raw/clean remark, lift-fee summary, reset/recall metadata,
    `legacy_group_key`, `legacy_source`, `source_file`, `source_row`, and
    `metadata`.
- `public.receiving_goods_receipt_lines`
  - V1 GR rows keyed by nullable unique `legacy_gr_uid`.
  - Key fields: `goods_receipt_id`, nullable `purchase_order_line_id`,
    raw `legacy_ref_po_uid`, product/catalog references, raw `sku`,
    raw `product_name`, `received_qty`, `unit`, `old_qty`, nullable
    `expiry_date`, `raw_expiry_date`, `date_parse_status`,
    `location_summary`, raw `Loc_IN`, raw remark, extra/free-item flag, and
    match status.
- `public.receiving_line_splits`
  - Structured split receiving locations parsed from `Loc_IN`.
  - Key fields: `goods_receipt_line_id`, `split_no`, nullable `warehouse_id`,
    `warehouse_key`, `raw_location`, parsed floor/zone when known, nullable
    `qty`, `unit`, and `metadata`.
- `public.receiving_events`
  - Receiving lifecycle events: draft save, submit for review, confirm,
    reset, recall, split-location update, and correction events.

Locked import/legacy handling:

- Missing PR CSV does not block migration `0013`. PR tables are created now;
  PR row import waits for a fresh `PR` export.
- `PO.csv` has no `Expected_Date` column, so `expected_date` stays nullable
  and paired with `raw_expected_date` plus `expected_date_source`.
- Legacy bare `Ref_PR_UID = "DIRECT"` imports as
  `bill_identity_kind = 'legacy_direct'` with `is_legacy_ambiguous = true`.
  It may use V1's fallback key for display/import grouping only. New V2 Direct
  PO writes must use `v2_direct` or `DIRECT-<uuid>` style stable identity and
  must never fall back to vendor/date/warehouse grouping.
- `DIRECT-<uuid>` imports as `direct_stable`; real PR UID references import as
  `pr_uid`. Nullable PR FKs can be backfilled after PR CSV import.
- The 10 orphan GR `Ref_PO_UID` rows stay importable with
  `purchase_order_line_id = null`, raw `legacy_ref_po_uid`, and
  `match_status = 'orphan_ref_po_uid'`. Do not fabricate a PO line.
- Pre-1980 spreadsheet epoch artifacts and `-` date placeholders import as
  null parsed dates with a `date_parse_status` marker; genuinely malformed
  dates keep their raw text for manual review.
- Product, vendor, and warehouse references are nullable. Preserve raw names
  and use match-status fields instead of creating canonical catalog data during
  this migration.
- Do not aggregate quantities across unlike units until conversion rules
  exist. Quantity columns use `numeric(12, 3)` unless a later dry-run proves a
  wider precision is needed.

Locked normalized statuses:

- PR: `pr_pending`, `pr_approved`, `pr_rejected`.
- PO/receiving progress: `po_pending_receipt`, `gr_draft`,
  `gr_pending_review`, `gr_completed`, `po_closed_apv_ready`.
- V1's `Overdue` remains a computed read-model state, not stored.
- Raw V1 status strings are stored alongside normalized status values.

Locked indexes for the migration draft:

- Add FK indexes for every nullable/non-null foreign key, including PR line to
  PR, PO line to PO, GR line to receipt, GR line to PO line, split to GR line,
  and all catalog/vendor/warehouse FKs.
- Add worklist indexes:
  - `purchasing_purchase_requests (status, request_date desc)`
  - `purchasing_purchase_orders (status, po_date desc)`
  - `purchasing_purchase_orders (warehouse_id, status, po_date desc)`
  - `purchasing_purchase_orders (vendor_id, po_date desc)`
  - `receiving_goods_receipts (status, receipt_date desc)`
  - `receiving_goods_receipts (purchase_order_id)`
- Add legacy lookup indexes:
  - unique partial index on PR `legacy_pr_uid`
  - unique partial index on PO line `legacy_po_uid`
  - unique partial index on GR line `legacy_gr_uid`
  - index PO line `source_ref_pr_uid`/`pr_number_label` fields if used by the
    import script.

RLS/security lock:

- Revoke all table privileges from `public`, `anon`, and `authenticated`
  before granting intended access.
- Grant `select` to `authenticated` only on operational tables that browser
  reads need. Grant `select, insert, update, delete` to `service_role` for
  server actions/import tooling.
- No `anon` grants or policies in this foundation.
- No authenticated insert/update/delete policies in migration `0013`; writes
  stay behind server-side `requirePermission()` plus service-role code.
- PR tables and purchasing events read policy:
  `purchasing.read OR purchasing.write`.
- PO header/line read policy:
  `purchasing.read OR purchasing.write OR receiving.read OR receiving.write`,
  because receiving needs PO worklists/details.
- Receiving header/line/split/event read policy:
  `receiving.read OR receiving.write OR purchasing.read OR purchasing.write`,
  because purchasing needs receiving state for close/APV workflows.
- Use the existing RLS performance pattern:
  `(select private.has_permission((select auth.uid()), '<permission>'))`.
- If transaction functions are added in later UI slices, follow ADR `0015`:
  public schema, default `SECURITY INVOKER`, `EXECUTE` revoked from
  `public`/`anon`/`authenticated`, and granted only to `service_role`.
- No views in migration `0013`. If a later read model introduces views, use
  `security_invoker = true` where supported or keep the view out of exposed
  schemas.
- No new granular permissions in `0013`. Keep the existing
  `purchasing.read/write` and `receiving.read/write` keys; add
  `purchasing.approve`, `purchasing.close`, or `receiving.approve` only when
  a UI/action slice proves the split is needed.

### Integration Points

- V1 references:
  - `C:\dev\WEBAPP\development_context.md`
  - `C:\dev\WEBAPP\PR\index.html`
  - `C:\dev\WEBAPP\PO\index.html`
  - `C:\dev\WEBAPP\GR\index.html`
  - V1 GAS behavior remains reference-only unless the user explicitly approves
    a production V1 task.
- Supabase:
  - migration preflight, explicit grants, RLS policies, staging apply, staging
    verification, and role-based Data API smoke checks.
- Vercel:
  - no dependency for the foundation dry-run; later UI slices verify on local
    and deployed Preview/Development.
- LINE/GAS/Sheets/API:
  - no notification sends in this foundation. Future PO/GR notification parity
    must start in disabled/dry-run mode, matching the Picking pattern.
- Secrets/env vars:
  - use local ignored `.env.local`/process env only; do not commit secrets.

## 4. UI/UX And User Flow

### User Flow

Foundation work does not implement user-facing workflows. It prepares these
future flows:

1. Requester creates a PR.
2. Supervisor approves/rejects the PR.
3. Purchasing creates a PO either from an approved PR or as a Direct PO.
4. Vendor expected delivery date is recorded and drives the incoming calendar.
5. Receiving opens a PO group, records actual quantities, locations, split
   storage, exp dates, remarks, and lift-fee metadata.
6. Supervisor/admin resets or recalls GR when correction is needed.
7. Purchasing closes completed PO groups and marks APV when accounting is ready.

### Screens / States

- Screen: future PR list/detail/new, PO dashboard/detail/new/edit/insights, GR
  dashboard/detail/receive/reset.
- Empty state: no PR source found, no active PO rows, no pending GR rows, no
  matched products/vendors/warehouses.
- Loading state: server-rendered lists where possible; no client-side auth
  flicker for permission checks.
- Error state: failed imports report blockers and warnings; failed writes must
  not display success.
- Permission-denied state: server-side route guard plus reusable `AccessDenied`.
- Mobile behavior: future GR screens must be mobile-first at 390px with large
  touch targets, split-location bottom sheets, no horizontal overflow, and
  decimal numeric keypads.

### System Logic / Pseudocode

```text
foundation execution:
  read V1 PR/PO/GR source references and snapshot headers
  confirm whether a dedicated PR snapshot exists
  parse PO, GR, ProductName, Vendor, and PR source if available
  normalize dates in Bangkok local time
  validate unique legacy IDs and Direct PO grouping
  match products/vendors/warehouses against shared catalog baseline
  classify status values into raw legacy status + normalized V2 status
  emit dry-run report with blockers/warnings
  draft migration using explicit grants + RLS + service-role write posture
  apply to staging only after preflight passes
  verify counts, RLS, grants, and no V1 production impact
```

## 5. Task Breakdown

1. Confirm V1 source inventory — done 2026-06-22
   - Read V1 PR/PO/GR frontend references and available backend notes.
   - Confirm whether PR rows have a separate export or are only visible through
     the shared purchasing backend / PO fields in current snapshots.
   - Record source assumptions in `docs/migration/pr-po-gr-v1-mapping.md`.

2. Build PR/PO/GR dry-run profiler — done 2026-06-22
   - Add `scripts/pr-po-gr-import-dry-run.mjs`.
   - Parse the current CSV snapshots using robust header aliases.
   - Validate row counts, required columns, duplicate legacy IDs, date formats,
     Direct PO grouping, status values, expected dates, ATA, product/vendor
     matches, warehouse matches, split-location evidence, and lift-fee tags.
   - Generate a git-ignored report under `import-reports/`.

3. Decide schema details from the report — done 2026-06-22
   - Finalize table names, keys, normalized statuses, nullable legacy bridges,
     and PR source handling.
   - Add or update an ADR if the schema changes module boundaries or release
     shape beyond ADR `0016`.

4. Draft the staging schema migration — done 2026-06-22
   - Use the next migration slot after `0012`.
   - Include explicit grants, RLS, indexes for active worklists, foreign keys to
     shared catalog/vendor/warehouse tables, and server-only write posture.
   - Keep the first migration on current permissions only:
     `purchasing.read/write` and `receiving.read/write`.
   - Do not add PR/PO/GR data import or transaction RPCs in the schema-only
     migration unless a verification blocker proves they are required.
   - Done: `supabase/migrations/0013_pr_po_gr_foundation.sql` — see section 10
     handoff notes for the full table list and one schema judgment call
     (nullable `receiving_goods_receipts.purchase_order_id`). Not yet applied
     to any environment.

5. Add verification tooling — done 2026-06-22, no new tooling needed
   - `npm run check:migrations` and `npm run db:verify-staging-schema`
     already derive their expected-table/policy lists from the migration
     files dynamically (regex over `create table public.*`), so the 9 new
     tables were picked up with no script changes. No new RLS/grant/function
     assumptions outside what those scripts already check (no new
     `SECURITY DEFINER` functions, no new server-only tables added to this
     migration).

6. Apply and verify in staging only — done 2026-06-22
   - Ran `npm run check:migrations` (preflight, static) — passed.
   - Applied via `npm run db:apply-migrations -- 0013_pr_po_gr_foundation.sql`
     — `Sanity: public_tables=36, permissions=13, apps=8,
     private_functions=4`.
   - Ran `npm run db:verify-staging-schema` — `Schema verification passed
     (36 public tables, 34 policies)`.
   - Confirmed `anon` is denied via a live Data API call (not just a static
     grant check): `curl` against
     `purchasing_purchase_requests`/`receiving_goods_receipts` with only the
     publishable `apikey` header (no auth) returned `HTTP 401` /
     `permission denied for table`, matching `V2-0008`'s
     `public.apps` anon-denial precedent exactly.
   - Did not confirm "assigned purchasing/receiving roles can read intended
     rows" with real rows — there are zero rows in any of the 9 tables (no
     data import yet), so that check is deferred to whenever the first
     write path/UI lands and inserts real data, matching how the Picking
     pilot's RLS-with-real-rows checks happened alongside `V2-0019`/
     `V2-0020`'s UI, not at `V2-0006`'s schema-creation time. No new
     `SECURITY DEFINER` functions exist in this migration, so the
     "service-role-only functions not executable by browser roles" check
     does not apply yet either.

7. Close out docs
   - Update `docs/migration/database-strategy.md`,
     `docs/migration/module-inventory.md`, `docs/plans/index.md`,
     `docs/handoff/current-state.md`, and `docs/handoff/work-log.md`.
   - Keep V1 production isolation explicit.

## 6. Files Expected To Change

This `Architect:` step changes only planning/handoff docs:

- `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
- `docs/plans/V2-0036-pr-po-gr-foundation.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md`
- `docs/project-management/decision-board.md`

Future `Go:` implementation is expected to change:

- `docs/migration/pr-po-gr-v1-mapping.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md`
- `supabase/migrations/0013_pr_po_gr_foundation.sql` or the next generated
  migration name if the Supabase CLI is used
- `scripts/pr-po-gr-import-dry-run.mjs`
- `scripts/verify-pr-po-gr-foundation.mjs` if staging verification needs a
  repeatable checker
- `package.json` if new repeatable npm scripts are added
- `docs/plans/V2-0036-pr-po-gr-foundation.md`, `docs/plans/index.md`,
  `docs/handoff/current-state.md`, `docs/handoff/work-log.md`,
  `docs/migration/database-strategy.md`,
  `docs/migration/module-inventory.md`, and
  `docs/project-management/decision-board.md` for closeout notes

## 7. Verification Steps

For this planning step:

- Run `git diff --check`.
- Confirm no runtime app code, Supabase schema, staging data, V1 production
  files, GAS deployments, Google Sheets schemas, URLs, LINE tokens, or secrets
  changed.

For future implementation:

- `npm run check:migrations`
- `npm run db:apply-migrations -- <new migration>` against staging only
- `npm run db:verify-staging-schema`
- `node scripts/pr-po-gr-import-dry-run.mjs` and inspect the generated report
- Targeted SQL checks for row counts, duplicate legacy IDs, Direct PO grouping,
  unmatched product/vendor/warehouse references, status mappings, RLS, and
  grants
- Role/Data API checks:
  - `anon` cannot read any PR/PO/GR table.
  - a user with `purchasing.read` can read PR/PO tables and receiving state
    needed for close/APV review.
  - a user with `receiving.read` can read PO worklists/details and receiving
    tables.
  - authenticated users without those permissions get zero rows.
  - no service-role-only function is executable by `anon` or `authenticated`
    if a later slice adds one.
- Browser checks only when a later UI slice changes PR/PO/GR routes

## 8. Rollback / No-Production-Impact Note

This plan is documentation only. It does not change runtime V2 code, Supabase
schema, staging data, V1 production files, GAS deployments, Google Sheets
schemas, live URLs, LINE tokens, or secrets.

Future foundation implementation remains staging-only. Rollback is limited to
dropping/reverting the new V2 staging tables/functions before any PR/PO/GR
cutover. V1 remains the production fallback and must not be modified by this
work.

## 9. Open Questions

- ~~Where is the authoritative PR row export for V2 import?~~ Resolved
  2026-06-22: a live V1 `PR` sheet tab exists in the same spreadsheet as
  `PO`/`GR` (confirmed by reading `PR/Code.gs.txt`'s `setupDatabase()`), but
  no CSV export of it exists in `import-data/po-pr-gr/`. Full PR-row import
  still needs a fresh export — see
  `docs/migration/pr-po-gr-v1-mapping.md`.
- ~~Should granular V2 permissions be added now (`purchasing.approve`,
  `purchasing.close`, `receiving.approve`) or mapped later when UI actions are
  implemented?~~ Resolved for migration `0013`: do not add granular
  permissions in the schema-only foundation. Keep existing
  `purchasing.read/write` and `receiving.read/write` until a UI/action slice
  proves the split is needed.
- ~~Does the missing `Expected_Date` column block the schema migration?~~
  Resolved for migration `0013`: no. Keep nullable `expected_date`,
  `raw_expected_date`, and `expected_date_source`; require a fresh export
  before vendor expected-delivery import/cutover.
- ~~Do orphan GR `Ref_PO_UID` rows block schema migration?~~ Resolved for
  migration `0013`: no. Keep nullable PO-line FK plus raw
  `legacy_ref_po_uid` and match status.
- Should the first import target active/open PR/PO/GR rows only, or all
  historical rows currently present in the snapshots? This does not block the
  schema-only migration.
- Should PR/PO/GR be cut over only as one grouped release after an end-to-end
  PR -> PO -> GR staging flow passes, or can PR/PO go live while GR remains on
  V1? `V2-0039` now drafts this decision and ADR `0021` proposes grouped
  operational cutover as the default, pending user confirmation.
- Which PO/GR notification paths need parity before cutover versus after
  operational replacement?
- Should GR create warehouse stock movements in the first receiving release, or
  wait for the warehouse foundation?
- Who owns APV closeout in V2: purchasing/admin only, accounting role, or the
  current V1 `closePO` permission equivalent?

## 10. Handoff Notes

- Done 2026-06-22 (`Go:` for this slice only): source profiling + dry-run
  report. Added `docs/migration/pr-po-gr-v1-mapping.md` (V1 source findings:
  PR sheet exists live but unexported; V1's own PO bill-grouping key;
  lift-fee/extra-item Remark tag formats; a real `PO.csv` header mismatch
  against `Code.gs.txt`'s documented schema — no `Expected_Date` column in
  the export) and `scripts/pr-po-gr-import-dry-run.mjs` (+ npm alias
  `pr-po-gr:import-dry-run`), profiling `PO.csv`/`GR.csv`/`ProductName.csv`/
  `Vendor.csv` and cross-matching against the staging shared
  catalog/vendor/warehouse tables. Result: 0 blockers, 7 warnings (no PR CSV
  export; 233 ambiguous bare-`DIRECT` bill groups, largest 21 lines; 10
  orphan GR `Ref_PO_UID`; 16 genuinely malformed GR dates plus 54 epoch-zero
  export artifacts and 7 `-`-placeholder dates classified separately; 5
  unmatched PO SKUs; 2 PO products needing manual catalog review). Report:
  `import-reports/pr-po-gr-dry-run-report.md` (git-ignored, regenerate with
  `npm run pr-po-gr:import-dry-run`). `lint`/`typecheck`/`build`/
  `git diff --check` all pass. No schema/migration, staging data, V1
  production files, or secrets changed.
- Done 2026-06-22 (`Architect:`): locked schema/RLS decisions from the dry-run
  report before migration. Added ADR `0020`, fixed the migration target table
  names, nullable legacy bridges, status mapping, expected-date handling,
  orphan-GR handling, index targets, and RLS/grant policy. No runtime code,
  SQL migration, staging data, V1 production files, or secrets changed.
- Done 2026-06-22 (`Go: draft V2-0036 migration 0013 schema/RLS foundation
  only`): drafted `supabase/migrations/0013_pr_po_gr_foundation.sql`,
  task breakdown item 4 only — schema/RLS, no data import, no UI, no
  transaction RPCs.
  - 9 tables: `purchasing_purchase_requests`,
    `purchasing_purchase_request_lines`, `purchasing_purchase_orders`,
    `purchasing_purchase_order_lines`, `purchasing_events`,
    `receiving_goods_receipts`, `receiving_goods_receipt_lines`,
    `receiving_line_splits`, `receiving_events` — exactly the ADR `0020`
    table family. All 9 have RLS enabled, revoke-then-grant posture
    (`authenticated` gets `select` only, `service_role` gets full table
    privileges, no `anon` grant), and a select policy combining
    `purchasing.read/write`/`receiving.read/write` per the locked groupings
    (PR tables + `purchasing_events` use the narrower 2-permission check; PO
    tables and all receiving tables use the 4-permission check). No new
    permissions, no views, no `SECURITY DEFINER` functions.
  - Implemented every locked legacy-bridge field: nullable
    `expected_date`/`raw_expected_date`/`expected_date_source` on PO header;
    `bill_identity_kind`/`bill_identity_value`/`legacy_ref_pr_uid`/
    `legacy_group_key`/`is_direct`/`is_legacy_ambiguous` on PO header plus the
    locked partial unique index on
    `(legacy_source, bill_identity_kind, bill_identity_value)`; nullable
    `purchase_order_line_id` plus raw `legacy_ref_po_uid` on GR lines for the
    10 orphan rows; a `date_parse_status` check
    (`parsed`/`placeholder`/`epoch_artifact`/`malformed`) on GR lines
    mirroring the dry-run script's `classifyDateField` categories; nullable
    catalog/vendor/warehouse FK columns throughout (never fabricated).
  - One schema judgment call beyond the plan's literal field list, made
    while drafting rather than re-running `Architect:`: re-reading
    `docs/migration/pr-po-gr-v1-mapping.md`'s GR section showed V1 GR rows
    resolve to a PO bill only by first resolving `Ref_PO_UID` to a specific
    PO **line** (`Ref_PO_UID` is a PO line's `PO_UID`, not a bill-level
    field) — so the 10 orphan rows that can't resolve a PO line also can't
    resolve a PO bill. Made `receiving_goods_receipts.purchase_order_id`
    nullable (the plan's field list didn't mark it nullable, only the
    line-level FK) so these orphan receipts stay importable without
    fabricating a bill link; documented inline in the migration with a
    comment citing the mapping doc. Indexes, RLS, and grants are otherwise
    exactly as locked, including the "index every FK" rule (added FK indexes
    on every nullable/non-null foreign key, including actor/profile columns,
    not just the explicitly named examples).
  - Verification for this slice: `npm run check:migrations` passes (36
    public tables, 13 permissions — up from 27/13 before this migration).
    `npm run lint` and `npm run typecheck` pass (no `src/` changes).
    `git diff --check` passes (pre-existing CRLF warnings only). Did not run
    `npm run db:apply-migrations` or `npm run db:verify-staging-schema` —
    out of scope for "draft ... schema/RLS foundation only"; task breakdown
    item 6 (apply and verify in staging) is still open.
  - No data import, no `src/app/purchasing`/`src/app/receiving` routes, no
    transaction RPCs, no V1 production files, no secrets changed.
- Done 2026-06-22 (`ok go next`, continuing the same `Go:` slice): applied
  migration `0013` to staging and verified it. See task breakdown items 5-6
  above for the full verification record (preflight, apply, schema
  verification, live anon Data API denial check). No new tooling was
  needed; no data import; no UI; no RPCs.
- Next action: task breakdown item 7 (docs close-out) is now done via this
  same update. The only remaining `V2-0036` work is future PR/PO/GR data
  import and runtime UI slices — those need a fresh PR CSV export and user
  confirmation of the `V2-0039` release-shape recommendation first. No
  specific runtime/data command is queued.
- Blockers: authoritative full PR history import and release-shape decision
  remain open; neither blocks schema drafting/apply, but both block final
  cutover.
- Related plans: `V2-0009`, `V2-0018`, `V2-0022`, `V2-0032`, `V2-0033`,
  `V2-0035`, `V2-0039`.
- Related ADRs: `0015`, `0016`, `0018`, `0020`, `0021`.
