# Module Inventory

This file tracks V1 modules, their production dependencies, and recommended V2
migration order.

## Summary Table

| Module | V1 State | V1 Data Source | V1 Backend | V2 Target Module | Migration Priority |
| --- | --- | --- | --- | --- | --- |
| Main / SSO | Live | Google Sheets | GAS | `auth`, `core` | Foundation |
| Picking | Live, backend deploy pending in V1 | Google Sheets | GAS | `picking` | Pilot |
| PR | Live | Google Sheets | Shared purchasing GAS | `purchasing` | After core |
| PO | Live | Google Sheets | Shared purchasing GAS | `purchasing` | With PR/GR |
| GR | Live | Google Sheets | GR GAS | `receiving` | With PO |
| TRDAKRA | Live | Google Sheets | GAS | `warehouse` | Later |
| Returnitem | Live | Google Sheets | GAS | `returns` | Later |
| AKRA W5 | Live | Google Sheets | GAS | `warehouse` | Later |
| KPITracker | Live | Google Sheets | GAS | `kpi` | After data stabilizes |

## Current Recommended Order

1. Core auth and permissions
2. Picking pilot
3. PR/PO/GR as a grouped migration
4. Warehouse modules
5. Returns
6. KPI and analytics

## Inventory Fields To Fill Per Module

For each module, capture:

- V1 repo path
- V1 deployed URL
- GAS deployment URL
- Sheets/tabs used
- Read actions
- Write actions
- Permission keys
- Status values
- LINE notification paths
- Known legacy data quirks
- V2 table mapping
- Migration test cases
- Cutover checklist status

## V2 Progress

- `core` / `auth`: Phase 2 schema drafted and applied to staging (plans
  `V2-0003`, `V2-0008`) — `profiles`, `roles`, `permissions`,
  `role_permissions`, `user_roles`, `apps`, `audit_logs` with RLS and a
  structural seed. `0006_core_grant_hardening.sql` closes broad default grants
  found during staging verification. V1 `User` / `RoleConfig` / `PermConfig`
  import mapping is drafted in `docs/migration/core-v1-import-mapping.md`;
  the real V1 core identity import (15 users, 5 roles, role_permissions
  grants) was completed to staging on 2026-06-20 via
  `scripts/core-import-apply.mjs` (ADR `0011`). V1 `AppConfig` was not
  imported as data (the V2 `apps` registry is structurally seeded separately,
  plan `V2-0005`).
- `picking`: Phase 3 pilot schema and V1 mapping drafted (plan `V2-0006`) —
  products, staff, requisitions, lines, problem reports, lifecycle events,
  daily bill sequences, and server-only token/contact tables. Migrations have
  been applied to staging and DB-verified. First UI slice (plan `V2-0019`, ADR
  `0012`) is implemented and verified: permission-gated read-only `/picking`
  list and `/picking/[id]` detail against staging Supabase. Second UI slice
  (plan `V2-0020`, ADR `0013`/`0015`) is implemented and verified: migration
  `0009` adds a nullable `catalog_products`/`catalog_product_aliases` bridge
  on `picking_requisition_lines` and the atomic, service-role-only
  `public.create_picking_requisition(...)` RPC; real V1 Picking `ProductName`
  (4,758 `matched_code` + 3 `manual_review` aliases) and `Staff` ("Chen") were
  imported as shared-catalog aliases/`picking_staff`+LINE account rows;
  `/picking/new` (guarded by `picking.write`) creates real requisitions in
  staging. Staging requisitions are a mix of staging-only fixtures
  (`legacy_source = "v2_fixture"`) and real app-created rows
  (`legacy_source = "v2_app"`), not V1 `Requisition` history. Third UI/action
  slice (plan `V2-0023`) is implemented and verified: writer/admin-only
  `pending -> picked -> sent` transitions on `/picking/[id]` backed by
  service-role-only `public.transition_picking_requisition_status(...)`.
  Fourth UI/action slice (plan `V2-0025`) is implemented and verified:
  writer/admin-only problem reporting on `/picking/[id]/problem` (with a
  "Problem reports" read section on `/picking/[id]`) backed by
  service-role-only `public.report_picking_problem(...)`, which records
  per-line requested-vs-actual quantities without changing requisition
  status (ADR `0018`). Fifth UI/action slice (plan `V2-0027`) is implemented
  and verified: a writer/admin-only "Retry LINE notification" action on
  `/picking/[id]`, backed by `src/modules/picking/line-notification.ts`,
  which attempts a LINE push at create time (disabled/dry-run by default per
  ADR `0018`) and records the outcome (`line_notification_sent` /
  `line_notification_skipped` / `line_push_failed`) as a
  `picking_requisition_events` row only — notification outcome never changes
  requisition status, a deliberate divergence from the schema's reserved
  `line_push_failed` status value (V1's own push failure is non-blocking).
  Real LINE sends remain unproven (no staging credentials). The Picking
  cutover package (`V2-0034`) is prepared
  (`docs/migration/picking-cutover-package.md`) but not approved: deployed
  Vercel Preview/Development verification and one combined human UAT pass
  are open, user-gated items.

- `purchasing` / `receiving` (PR/PO/GR): no schema/migration yet. `V2-0036`'s
  first slice (2026-06-22) profiled V1 sources read-only: confirmed a live
  V1 `PR` sheet exists (same spreadsheet as `PO`/`GR`) but has no CSV export
  in `import-data/po-pr-gr/` yet; documented V1's own PO bill-grouping key
  and the bare-`DIRECT`-vs-`DIRECT-<uuid>` distinction; found the exported
  `PO.csv` is missing an `Expected_Date` column that the V1 code documents;
  ran `scripts/pr-po-gr-import-dry-run.mjs` against staging (0 blockers, 7
  warnings — see `docs/migration/pr-po-gr-v1-mapping.md` and
  `import-reports/pr-po-gr-dry-run-report.md`). No `public.purchasing_*` /
  `public.receiving_*` tables exist yet.

## Notes From V1 Context

- V1 uses Google Sheets as the primary database and GAS as backend.
- `Code.gs` / `Code.gs.txt` files are git-ignored in V1 to avoid leaking
  secrets.
- V1 apps have client-side version guards and module-specific versions.
- PO/PR/GR have recent work around stable Direct PO bill grouping.
- Picking has recent local backend changes around daily bill numbers that still
  need V1 GAS deployment verification.
