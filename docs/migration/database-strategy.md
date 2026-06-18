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
- Do not use user-editable metadata for authorization.
- Do not expose `service_role` or secret keys to the browser.
- Use server-side routes/actions for privileged mutations and notification
  sends.
- Keep security-definer functions in private schemas.

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

## Transaction-Sensitive Workflows

These workflows should be backed by database transactions or RPC functions:

- Daily bill number generation
- GR save/reset/recall replacement snapshots
- PO direct bill identity preservation
- Stock movement and dispatch state changes
- Claim/return workflow transitions
