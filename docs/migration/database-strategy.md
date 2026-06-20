# Database Strategy

## Goals

- Replace Google Sheets as the primary database with Supabase/Postgres.
- Preserve V1 traceability through legacy IDs and import metadata.
- Use database constraints and transactions instead of client-side coordination.
- Enforce authorization through server-side checks and RLS where appropriate.

## Schema Principles

- Use UUID primary keys for V2 records.
- Keep legacy references such as `legacy_uid`, `legacy_row`, and
  `legacy_source` during migration.
- Model shared master data once: users, roles, permissions, products, vendors,
  warehouses.
- Use audit logs for sensitive state changes.
- Prefer normalized workflow tables over wide spreadsheet-shaped tables.
- Use explicit status enums or check constraints for workflow states.

## Supabase Security Rules

- Enable RLS on tables exposed through Supabase APIs.
- Add explicit `GRANT` statements where needed for exposed tables.
- Revoke broad/default table grants from `public`, `anon`, and `authenticated`
  before granting the intended least-privilege access.
- Do not use user-editable metadata for authorization.
- Do not expose `service_role` or secret keys to the browser.
- Use server-side routes/actions for privileged mutations and notification
  sends.
- Keep security-definer functions in private schemas.
- Revoke direct execute access for trigger-only helper functions that should not
  be callable through the Data API.
- **The `private` schema is not exposed through the Data API at all** (verified
  empirically against staging on 2026-06-20: PostgREST returns `PGRST106`,
  "Only the following schemas are exposed: public, graphql_public", for any
  `private.*` RPC call, qualified or not). A function that must be callable via
  `supabase.rpc()` from app server code therefore has to live in `public`,
  declared `SECURITY INVOKER` (the default — omit `SECURITY DEFINER`), with
  `EXECUTE` revoked from `public`/`anon`/`authenticated` and granted only to
  `service_role`. It does not need privilege escalation because it only ever
  runs as `service_role` (which already has `BYPASSRLS` plus table grants and
  its own `EXECUTE` grants on any `private.*` helper it calls internally). Keep
  `private.*` reserved for helpers called only from other SQL (RLS policies,
  triggers, other functions) or a direct Postgres connection
  (`DATABASE_URL`/`pg`, local scripts only). See ADR `0015`.

## Initial Domain Schemas

Proposed logical schemas:

- `core`: users, roles, permissions, app registry, audit logs
- `catalog`: products, vendors, warehouses, locations
- `purchasing`: PR, PO, PO lines, vendor delivery insights
- `receiving`: GR headers, GR lines, receiving events
- `warehouse`: requests, dispatches, stock movements, surveys
- `returns`: return records, claims, damaged goods workflow
- `picking`: requisitions, requisition lines, issue reports
- `analytics`: derived reporting tables or secured views

Exact schema names may change after Supabase exposure and RLS strategy is
finalized.

## Import Strategy

1. Export V1 Sheets to CSV snapshots.
2. Store raw imports in staging tables.
3. Validate row counts, required IDs, date formats, and duplicate keys.
4. Transform into normalized V2 tables.
5. Keep import batches auditable.
6. Compare V1 and V2 behavior before cutover.

The initial core import mapping is documented in
`docs/migration/core-v1-import-mapping.md`. It covers V1 `User`, `AppConfig`,
`RoleConfig`, and `PermConfig` only and explicitly excludes passwords, secrets,
and live production mutations.

## Transaction-Sensitive Workflows

These workflows should be backed by database transactions or RPC functions:

- Daily bill number generation
- GR save/reset/recall replacement snapshots
- PO direct bill identity preservation
- Stock movement and dispatch state changes
- Claim/return workflow transitions

## Picking Pilot Assumptions

- Picking tables use `public.picking_*` names until custom exposed schemas are
  configured for the Supabase project.
- Authenticated reads require `picking.read` or `picking.write`; operational
  mutations remain server-side/service-role only until route actions exist.
- Capability tokens, LINE quote tokens, LINE user IDs, and daily sequence
  counters are stored in server-only tables with no authenticated grants.
- V2 daily bill numbers come from `picking_daily_sequences` via the private
  `next_picking_bill_no(date)` function, not by counting existing rows.
- V1 plaintext capability tokens must be hashed or omitted during import; token
  values must never be committed.
- The create-requisition transaction (`V2-0020`) is one atomic
  `public.create_picking_requisition(...)` RPC function (migration `0009`)
  that allocates the bill number via `private.next_picking_bill_no(date)` and
  inserts the requisition, lines, and `created` event in a single function
  call. The Next.js server action calls it through `createAdminClient()`
  (service-role key) only after `requirePermission({ permission:
  "picking.write" })` allows the request. See ADR `0015` for why this
  function lives in `public` instead of `private`.
- Picking lines bridge to the shared catalog (`V2-0018`) via nullable
  `catalog_product_id`/`catalog_alias_id` columns on
  `picking_requisition_lines` (migration `0009`); the legacy `product_id` ->
  `picking_products` column is kept for compatibility but unused by the new
  create flow. Picking-source product aliases live in
  `catalog_product_aliases` with `source_app = 'picking'`.

## Shared Catalog And Warehouse Product Assumptions

- Product master data should be modeled once in a shared catalog, but legacy app-specific product names must be preserved as aliases.
- Product membership in TRD, AKRA, AKRA-TRD, W5, and app modules should be represented as scope/evidence rows, not as destructive overwrites on a single product row.
- PO/GR `ProductName` is the best initial coded seed because it covers all currently observed TRDAKRA and Returnitem product codes in `import-data/`.
- TRDAKRA `Floor`, `Location`, and `Par Level` are warehouse placement/par metadata, not canonical product fields.
- W5 current stock has no product code, so W5 rows require exact-name, alias, or manual-review mapping before they can be trusted as canonical products.
- Raw import rows, source file names, source row numbers, and import batch IDs should remain auditable during migration.
- **Confirmed Business Rules (2026-06-19):**
  - **Warehouse Affiliation:** W1 is TRD. W2, W3, W4, W5, C1, C2 are AKRA (where C1 is W4 cold room, C2 is W5 freezer).
  - **Default TRDAKRA Scope:** Products from the TRDAKRA list without transaction evidence default to `akra_trd`.
  - **W5 Unmatched Names:** Will remain as `manual_review` aliases and be manually mapped referencing AKRA products.
  - **Display Names:** V2 product display names default to the canonical PO/GR product name for all departments.
  - **Catalog Edit Authority:** Restricted to `core.admin` roles initially; custom roles will be planned later.
  - **Picking Integration:** The Picking pilot will transition directly to using the new `catalog_products` and locations instead of keeping an isolated table.

## Staging Apply Status

- Migrations `0001`-`0009` have been applied to the staging Supabase project.
- `0009_picking_catalog_bridge.sql` adds the Picking-to-catalog nullable bridge
  columns and `public.create_picking_requisition(...)`.
- `0006_core_grant_hardening.sql` corrects broad default grants discovered
  during staging verification after the initial `0001`-`0005` apply.
- `0008_shared_catalog_schema.sql` adds the shared catalog and warehouse
  baseline tables with RLS, explicit grants, and permission-gated reads.
- Database verification passed for expected public tables, RLS, table grants,
  RLS policies, structural seeds, and private functions.
- Shared catalog and warehouse snapshot data from `import-data/` has been
  imported into staging only. V1 core users, V1 Picking workflow data, and V1
  production systems have not been imported or changed.
