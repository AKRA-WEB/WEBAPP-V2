# V2 Database Schema Catalog

Last updated: 2026-06-24

This catalog is a human-readable index of the schema that exists in
`supabase/migrations/`. It does not replace the SQL migrations. When this file
and the migration SQL disagree, the migration SQL is authoritative.

Supabase guidance was rechecked on 2026-06-24 against official Supabase
changelog/docs before this catalog was added. Relevant current guidance remains
the same for this project: public-schema tables need explicit grants plus RLS,
and RLS must be enabled on tables in exposed schemas.

## Current Staging Baseline

- Migration range: `0001` through `0013`
- Verified staging shape: 36 public tables, 34 RLS policies
- Production impact: none; V1 remains live
- Current state:
  - Core/auth, Picking, shared catalog/warehouse, and PR/PO/GR foundation
    tables exist.
  - Shared catalog/warehouse reference data is imported to staging.
  - PR/PO/GR transaction rows are not imported yet.

## Security And Access Pattern

- All exposed `public.*` tables created by project migrations enable RLS.
- Browser-facing reads require both:
  - explicit `grant select` to `authenticated`; and
  - a permission-gated RLS select policy.
- `anon` is intentionally denied on operational tables.
- Server-only writes/imports use `service_role` through local scripts or
  server-side code. Service-role keys must never be exposed to browser code.
- Privileged transactional functions in `public` use default
  `SECURITY INVOKER` posture and revoke execution from
  `public`/`anon`/`authenticated`; server actions call them with
  service-role access after server-side permission checks.

## Core / Auth

Source migrations:

- `0001_core_identity_schema.sql`
- `0002_core_rls_policies.sql`
- `0003_core_seed.sql`
- `0006_core_grant_hardening.sql`

| Table | Purpose | Important relationships / notes |
| --- | --- | --- |
| `public.profiles` | Supabase Auth-linked user profile plus V1 identity bridge. | `id` matches `auth.users.id`; stores `legacy_uid` and display fields. |
| `public.roles` | Role catalog. | V1 role tokens are imported here; `ADMIN` remains an app-level bypass in server permission helpers. |
| `public.permissions` | Canonical V2 permission catalog. | Keys such as `picking.read`, `purchasing.write`, `core.admin`. |
| `public.role_permissions` | Role-to-permission join table. | Drives permission snapshots and RLS helper checks. |
| `public.user_roles` | User-to-role join table. | Supports multiple roles per user. |
| `public.apps` | Main portal module registry. | Route metadata and required permission per module. |
| `public.audit_logs` | Future privileged-action audit trail. | Existing schema only; broad runtime audit coverage is still future work. |

Private helper functions under the private schema support permission checks.
Do not move security-definer permission helpers into exposed schemas.

## Picking

Source migrations:

- `0004_picking_pilot_schema.sql`
- `0005_picking_rls_policies.sql`
- `0009_picking_catalog_bridge.sql`
- `0010_picking_status_transitions.sql`
- `0011_picking_problem_reports.sql`
- `0012_picking_line_notifications.sql`

| Table / function | Purpose | Important relationships / notes |
| --- | --- | --- |
| `public.picking_products` | Legacy Picking product reference table. | Kept for compatibility; new create flow uses shared catalog bridge columns. |
| `public.picking_staff` | Picking assignee/staff list. | May link to `profiles`; display names are preserved for legacy parity. |
| `public.picking_staff_line_accounts` | Server-only LINE contact metadata. | No authenticated read policy; keep LINE identifiers server-side. |
| `public.picking_requisitions` | Picking bill header. | Stores `legacy_source`, requester/assignee display text, bill number/date, status. |
| `public.picking_requisition_lines` | Picking line items. | Bridges to `catalog_products` and `catalog_product_aliases` through nullable columns added in `0009`. |
| `public.picking_requisition_secrets` | Server-only token hashes / LINE quote metadata. | Never expose capability tokens or LINE quote tokens to client reads. |
| `public.picking_problem_reports` | Problem report header. | Problem reporting does not mutate requisition status by design. |
| `public.picking_problem_report_lines` | Problem report detail rows. | Preserves requested vs actual quantities and notes. |
| `public.picking_requisition_events` | Lifecycle/event ledger. | Stores created/picked/sent/problem/LINE notification outcomes. LINE failure is an event, not a requisition status change. |
| `public.picking_daily_sequences` | Atomic daily bill number counter. | Used by private `next_picking_bill_no(date)`. |
| `public.create_picking_requisition(...)` | Atomic create transaction. | Service-role only. |
| `public.transition_picking_requisition_status(...)` | Atomic status transition. | Enforces `pending -> picked -> sent` only. |
| `public.report_picking_problem(...)` | Atomic problem-report insert. | Service-role only; no status side effect. |

## Shared Catalog And Warehouse Baseline

Source migration:

- `0008_shared_catalog_schema.sql`

| Table | Purpose | Important relationships / notes |
| --- | --- | --- |
| `public.catalog_products` | Canonical product master. | Seeded primarily from the PO/GR `ProductName` coded list. |
| `public.catalog_product_aliases` | Legacy/source-specific product names and codes. | Stores `source_app`, `source_file`, raw source values, and `match_status`. This is the main bridge for V1 naming differences. |
| `public.catalog_product_scopes` | Product visibility/evidence by business unit, warehouse, or module. | Use scopes for module/business membership instead of overloading `source_app`. |
| `public.catalog_vendors` | Vendor master. | Seeded from the PO/GR `Vendor` snapshot. |
| `public.catalog_product_vendors` | Product/vendor relationship. | Preserves vendor product code/name and lead-time data where available. |
| `public.warehouse_warehouses` | Static warehouse master. | Current keys: `w1`, `w2`, `w3`, `w4`, `w5`, `c1`, `c2`. |
| `public.warehouse_locations` | Normalized/raw warehouse locations. | Preserves raw location strings; normalization is best-effort. |
| `public.warehouse_product_locations` | Product placement/par configuration. | Includes TRDAKRA placement/par evidence. |
| `public.warehouse_inventory_balances` | Snapshot balances. | Current W5 snapshot is imported to staging. |
| `public.warehouse_stock_movements` | Historical movement ledger. | Current W1/W5 historical movements are imported to staging. |

Reference data currently imported to staging:

- 4,793 products
- 173 vendors
- 11,433 aliases
- 3,760 scope entries
- 126 locations
- 1,791 par configs
- 116 balances
- 1,660 movements

## Purchasing / Receiving Foundation

Source migration:

- `0013_pr_po_gr_foundation.sql`

This is schema/RLS only. No PR/PO/GR transaction data has been imported yet.

| Table | Purpose | Important relationships / notes |
| --- | --- | --- |
| `public.purchasing_purchase_requests` | PR header. | Supports future PR import even though current PR source has 0 rows. |
| `public.purchasing_purchase_request_lines` | PR lines. | Nullable catalog/warehouse links allow manual-review import posture. |
| `public.purchasing_purchase_orders` | PO bill/header grouping. | Uses stable bill identity columns plus raw legacy fields; legacy bare `DIRECT` remains display/import fallback only. |
| `public.purchasing_purchase_order_lines` | PO line rows. | Unique legacy `PO_UID`; nullable PR-line FK supports ADR `0022` manual-review linkage. |
| `public.purchasing_events` | PR/PO event ledger. | Future import/write workflows should add audit events at header/action granularity. |
| `public.receiving_goods_receipts` | GR header/grouping. | `purchase_order_id` is nullable to preserve orphan GR cases without fabricated links. |
| `public.receiving_goods_receipt_lines` | GR line rows. | Unique legacy `GR_UID`; nullable PO-line FK supports orphan `Ref_PO_UID` preservation. |
| `public.receiving_line_splits` | Split-location rows parsed from `Loc_IN`. | Preserves per-location receiving split evidence. |
| `public.receiving_events` | GR event ledger. | Future import/write workflows should add audit events. |

Current PR/PO/GR source proof:

- PR CSV: header exists, 0 data rows.
- PO: 750 line rows / 254 bill groups.
- GR: 1868 rows.
- Dry-run result: 0 blockers, 9 warnings.
- ADR `0022`: 3 PR-derived PO rows with no structured PR row import as
  manual-review/nullable PR linkage.
- ADR `0023` is still proposed: full-snapshot import scope needs user
  confirmation before `V2-0044` execution.

## Known Schema Gaps / Deferred Items

- PR/PO/GR import script and post-import verification are planned but not
  implemented.
- PR/PO/GR read-only UI and write RPCs/actions are not implemented.
- Warehouse runtime workflows, Returns runtime workflows, and KPI runtime data
  model remain future slices.
- No cross-module reporting/views have been added yet. If views are introduced,
  keep them RLS-aware (`security_invoker` where supported) or outside exposed
  schemas.
- Full role test matrix is still needed for PR/PO/GR once real rows exist:
  no-permission, read, write, and admin cases.

