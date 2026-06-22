# Plan V2-0036: PR/PO/GR Foundation

Status: In progress — source profiling + dry-run report slice complete
(2026-06-22); schema drafting (task breakdown items 3-7) not started.

Architect command:

```text
Architect: ทำ PR/PO/GR foundation
```

## 1. Goal

- Primary objective: plan the shared data, import, permission, and verification
  foundation for PR, PO, and GR before any PR/PO/GR runtime UI or workflow
  writes are implemented.
- Success definition: the next `Go:` slice can profile V1 data, produce a
  repeatable PR/PO/GR dry-run report, and draft/apply a staging-only schema
  foundation without changing V1 production systems.
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

Proposed table families for the implementation plan:

- `public.purchasing_purchase_requests`
  - PR header, requester, request date, status, approval metadata, legacy PR
    number/UID, raw payload metadata.
- `public.purchasing_purchase_request_lines`
  - PR line items, product/catalog references, free-text source names,
    requested quantity/unit, preferred vendor/warehouse, approval result.
- `public.purchasing_purchase_orders`
  - PO header, `po_number`, `po_date`, vendor, warehouse, `expected_date`,
    `status`, `ref_pr_uid`, `is_direct`, `direct_group_key`,
    `legacy_group_key`, close/APV metadata, raw status.
- `public.purchasing_purchase_order_lines`
  - PO line rows keyed by legacy `PO_UID`, product/catalog references, SKU,
    ordered quantity/unit, remarks, PR linkage, current receiving status.
- `public.purchasing_po_events`
  - approve/reject PR, create/update/delete PO, vendor expected-date update,
    close, APV, and correction events.
- `public.receiving_goods_receipts`
  - GR header, receipt date, ATA, receiver, status, source PO group, remark,
    lift-fee summary, reset/recall metadata.
- `public.receiving_goods_receipt_lines`
  - GR line rows keyed by legacy `GR_UID`, linked PO line where possible,
    received quantity/unit, old quantity, exp date, location summary, status.
- `public.receiving_line_splits`
  - structured split receiving rows: warehouse, location, raw location, qty,
    unit, and sort/order metadata.
- `public.receiving_events`
  - draft save, submit for review, confirm receive, edit, reset, recall,
    split-location update, and correction events.

Important constraints:

- New Direct POs must always receive a stable identity (`DIRECT-<uuid>` or V2
  UUID equivalent) and must never be merged only by vendor, warehouse, and date.
- Legacy `Ref_PR_UID = DIRECT` rows can use a fallback grouping key, but the
  fallback must be labelled legacy-only and not reused for new writes.
- Preserve raw legacy status values while also mapping normalized V2 statuses
  for UI logic.
- Do not aggregate quantities across unlike units until conversion rules exist.
- Keep product/vendor/warehouse references nullable where legacy data is
  ambiguous, and report unmatched rows instead of fabricating canonical data.
- Store split receiving as structured rows while preserving original raw
  location/remark text for audit.

RLS/security notes:

- Every new `public.*` table must enable RLS and include explicit grants for
  the intended roles. Supabase's 2026 Data API guidance makes grants part of
  the table-creation flow, not an afterthought.
- Operational reads can be exposed to `authenticated` only through
  `purchasing.read`, `purchasing.write`, `receiving.read`, or
  `receiving.write` policies.
- Operational writes should stay server-side. Multi-table operations such as PO
  creation, PR approval, receive/confirm, reset/recall, and APV closeout should
  use transaction-safe database functions or direct Postgres scripts.
- Data API-callable transaction functions should follow ADR `0015`: live in
  `public`, use default `SECURITY INVOKER`, revoke `EXECUTE` from
  `public`/`anon`/`authenticated`, and grant only to `service_role`.
- If any view is introduced later, use `security_invoker = true` where
  supported or keep the view out of exposed schemas.

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

1. Confirm V1 source inventory
   - Read V1 PR/PO/GR frontend references and available backend notes.
   - Confirm whether PR rows have a separate export or are only visible through
     the shared purchasing backend / PO fields in current snapshots.
   - Record source assumptions in `docs/migration/pr-po-gr-v1-mapping.md`.

2. Build PR/PO/GR dry-run profiler
   - Add `scripts/pr-po-gr-import-dry-run.mjs`.
   - Parse the current CSV snapshots using robust header aliases.
   - Validate row counts, required columns, duplicate legacy IDs, date formats,
     Direct PO grouping, status values, expected dates, ATA, product/vendor
     matches, warehouse matches, split-location evidence, and lift-fee tags.
   - Generate a git-ignored report under `import-reports/`.

3. Decide schema details from the report
   - Finalize table names, keys, normalized statuses, nullable legacy bridges,
     and PR source handling.
   - Add or update an ADR if the schema changes module boundaries or release
     shape beyond ADR `0016`.

4. Draft the staging schema migration
   - Use the next migration slot after `0012`.
   - Include explicit grants, RLS, indexes for active worklists, foreign keys to
     shared catalog/vendor/warehouse tables, and server-only write posture.
   - Consider extending permission catalog granularity only if needed for the
     foundation (`purchasing.approve`, `purchasing.close`,
     `receiving.approve`); otherwise keep the first schema using the current
     `purchasing.read/write` and `receiving.read/write` keys.

5. Add verification tooling
   - Add an npm script if the dry-run or staging verifier becomes repeatable.
   - Extend migration preflight rules if the new table family introduces new
     RLS/grant/function assumptions.

6. Apply and verify in staging only
   - Run migration preflight.
   - Apply the migration to staging.
   - Run staging schema verification and targeted SQL checks.
   - Confirm `anon` is denied, assigned purchasing/receiving roles can read
     intended rows after data import, and service-role-only functions are not
     executable by browser roles.

7. Close out docs
   - Update `docs/migration/database-strategy.md`,
     `docs/migration/module-inventory.md`, `docs/plans/index.md`,
     `docs/handoff/current-state.md`, and `docs/handoff/work-log.md`.
   - Keep V1 production isolation explicit.

## 6. Files Expected To Change

This `Architect:` step changes only planning/handoff docs:

- `docs/plans/V2-0036-pr-po-gr-foundation.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
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
- Possibly `src/modules/auth/permissions.ts` and `supabase/migrations/*` if
  granular purchasing/receiving permissions are added during the foundation

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
- Should the first import target active/open PR/PO/GR rows only, or all
  historical rows currently present in the snapshots?
- Should PR/PO/GR be cut over only as one grouped release after an end-to-end
  PR -> PO -> GR staging flow passes, or can PR/PO go live while GR remains on
  V1?
- Should granular V2 permissions be added now (`purchasing.approve`,
  `purchasing.close`, `receiving.approve`) or mapped later when UI actions are
  implemented?
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
- Next action: task breakdown items 3-7 (finalize schema details from the
  report, draft the `0013` migration, verification tooling, staging apply,
  docs close-out) remain undone — recommend `Architect:` to lock schema
  details before the next `Go:`, given the `Expected_Date` mismatch and
  bare-`DIRECT` grouping volume found above.
- Blockers: authoritative full PR history import and release-shape decision
  remain open; neither blocks schema drafting, but both block final cutover.
- Related plans: `V2-0009`, `V2-0018`, `V2-0022`, `V2-0032`, `V2-0033`,
  `V2-0035`.
- Related ADRs: `0015`, `0016`, `0018`.
