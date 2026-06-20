# Plan V2-0018: Shared Catalog And Warehouse Data Structure

Status: Complete after 2026-06-20 correction

Completion note:

- Initial plan, grill review, dry-run transformer, SQL migration, and staging
  import were completed on 2026-06-19.
- A 2026-06-20 review found the transformer/import script did not apply the
  resolved scope rule that TRDAKRA Product entries default to `akra_trd`, and
  still treated W3/C1 as TRD in the preview/mapping path.
- The correction updates transformer/import logic so W1 is TRD, W2/W3/W4/W5/C1/C2
  are AKRA, TRDAKRA Product entries create both TRD and AKRA business scopes,
  and destructive staging scripts require explicit confirmation flags.

User request:

```text
Design the V2 product data structure from the new import-data snapshots so
products can be separated as TRD-only, AKRA-only, AKRA-TRD, and W5 stock while
preserving per-app product names, warehouse locations, and mismatched legacy
details.
```

## 1. Goal

- Primary objective: define the shared catalog, alias, warehouse, location,
  stock, and import-staging model before writing product/warehouse migrations or
  import scripts.
- Success definition: V2 can answer "TRD only", "AKRA only", "AKRA-TRD", and
  "in W5" without losing source-specific product names, units, locations, par
  levels, vendors, or transaction history.
- User/business reason: V1 product files are split by app and contain similar
  but not always identical product names, causing merge risk if V2 treats one
  source file as the only product master.

## 2. Requirement And Scope Definition

### Problem

- Product data currently lives in many CSV snapshots under `import-data/`.
- Some files are product masters, some are app-specific lookup lists, and some
  are warehouse stock/history records.
- TRD/AKRA/W5 location details have different meanings and should not be stored
  as one flat product row.
- W5 has product names and stock quantities but no product codes, so exact
  product-code matching cannot cover W5.

### Users

- Primary users: operators and admins who need accurate product search,
  warehouse stock, request, purchase, receive, and return workflows in V2.
- Secondary users: migration agents validating whether legacy rows map to
  canonical V2 products.
- Admin/support users: future catalog maintainers resolving aliases and
  source-name conflicts.

### MVP Features

- Shared product catalog seeded from the broadest coded source.
- Product source aliases for every legacy product name/code/unit combination.
- Product scope/coverage table that supports TRD-only, AKRA-only, AKRA-TRD, and
  W5 queries.
- Warehouse and location tables that keep source-specific raw location strings.
- W5 stock balances and W5 history as warehouse data, not product-master data.
- Dry-run import report that lists unmatched W5 and transaction product names.

### Nice-To-Have Features

- Admin UI for alias approval and conflict resolution.
- Fuzzy matching suggestions for W5 and transaction-only product names.
- Full stock ledger across PO/GR/TRDAKRA/W5/Returnitem.
- Product category cleanup and vendor preference ranking.
- Derived analytics views for movement velocity and par-level recommendations.

### Initial Planning Out Of Scope

- Runtime app changes.
- Production database writes.
- Editing V1 apps, Google Apps Script deployments, production Sheets, URLs, or
  LINE tokens.
- V1 production cutover.

## 3. Import Snapshot Findings

Current snapshots inspected on 2026-06-19:

| Source | Rows | Product identity notes |
| --- | ---: | --- |
| `po-pr-gr/Trackingpo - webapp - ProductName.csv` | 4,793 | Broadest coded product source; every row has a product code. |
| `returnitem/Returned item - ProductName.csv` | 5,265 | 4,734 usable product codes; 531 blank rows; all usable codes are present in PO/GR; vendor/location cells are `#REF!` and should not override PO/GR metadata. |
| `akra-trd/เบิกย้าย Request - Product.csv` | 1,791 | All product codes are present in PO/GR and Returnitem; includes TRDAKRA floor/location/par metadata. |
| `akra-w5/ประวัติคลังสินค้า W5 - W5.csv` | 116 | No product code; exact-name match finds 95 rows against PO/GR/Returnitem/TRDAKRA and leaves 21 rows for alias/manual review. |

Other data-quality notes:

- TRDAKRA Product has 871 blank `Floor` rows, 933 blank `Location` rows, and
  only 163 rows with `Par Level`; these fields are warehouse/location settings,
  not canonical product fields.
- TRDAKRA W1 transaction CSV has duplicate `หมายเหตุ` headers and blank trailing
  headers; import tooling must supply stable custom headers.
- TRDAKRA W1 transactions contain 844 rows; 39 rows do not exact-match the PO/GR
  product-name list.
- W5 history contains 816 rows; 120 rows do not exact-match the PO/GR product
  names and 17 rows do not exact-match current W5 names.
- PO `Warehouse` contains values such as `W1`, `W2`, `W3`, `W5`, `C1`, `W4`,
  and `C2`; GR `Loc_IN` contains mixed raw values such as `W2-2F`, `W5-1F`,
  `w1/3f`, `ชั้น4`, and `F4`. These require normalization while preserving raw
  values.

## 4. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js + TypeScript, unchanged in this planning slice.
- Backend/server boundary: future import and catalog mutation logic should run
  server-side or through scripts using server credentials.
- Database: Supabase Postgres.
- Auth/permissions: catalog and warehouse reads can be RLS-gated by module
  permissions; writes/imports should remain server-side/service-role only.
- Deployment: no deployment change for this planning slice.

Supabase check on 2026-06-19 confirmed current guidance still requires RLS on
tables in exposed schemas, explicit grants for Data API access, least-privilege
grants, and fixed `search_path` for `security definer` functions.

### Proposed Tables

Use `public.*` prefixed names initially, consistent with the current staging
baseline, unless a later schema-exposure decision moves catalog tables into a
custom exposed schema.

#### `catalog_products`

Canonical product identity.

- `id uuid primary key default gen_random_uuid()`
- `canonical_code text null`
- `canonical_name text not null`
- `name_key text not null`
- `default_unit text`
- `category text`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints/indexes:

- Check non-blank `canonical_name` and `name_key`.
- Unique partial index on `canonical_code` where not null.
- Index `(is_active, name_key)`.

Initial seed rule:

- Seed from PO/GR `ProductName` because it is the broadest coded source.
- Do not create separate canonical rows for Returnitem/TRDAKRA records when
  product code matches a PO/GR row.
- W5-only names create either unresolved alias rows or temporary catalog rows
  marked for manual review, depending on the dry-run result.

#### `catalog_product_aliases`

Every source-specific product identity and name variant.

- `id uuid primary key default gen_random_uuid()`
- `product_id uuid null references catalog_products(id)`
- `source_app text not null`
- `source_file text not null`
- `legacy_code text`
- `source_name text not null`
- `source_name_key text not null`
- `source_unit text`
- `source_category text`
- `source_vendor_code text`
- `source_vendor_name text`
- `match_status text not null`
- `match_confidence numeric(5,2)`
- `import_batch_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Allowed `match_status` values:

- `matched_code`
- `matched_exact_name`
- `suggested_fuzzy`
- `manual_review`
- `ignored_blank`
- `rejected`

Purpose:

- Preserve app-specific product names without forcing all apps to use the same
  display name immediately.
- Allow W5 name-only rows and transaction-only legacy names to exist before
  final manual mapping.

#### `catalog_product_scopes`

Answers "TRD only", "AKRA only", "AKRA-TRD", "W5", and module visibility.

- `product_id uuid not null references catalog_products(id)`
- `scope_type text not null`
- `scope_key text not null`
- `source_app text not null`
- `evidence text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Scope examples:

- `business_unit/trd`
- `business_unit/akra`
- `warehouse/w1`
- `warehouse/w2`
- `warehouse/w5`
- `module/purchasing`
- `module/receiving`
- `module/warehouse`
- `module/returns`

Recommended summary view:

- `catalog_product_scope_summary`
  - `product_id`
  - `has_trd`
  - `has_akra`
  - `has_w5`
  - `has_po_gr`
  - `has_returnitem`
  - `business_bucket`: `trd_only`, `akra_only`, `akra_trd`, or
    `unassigned`

Initial classification rule:

- PO `Warehouse` and GR `Loc_IN` should add warehouse evidence after
  normalization.
- W1 is treated as TRD and W2 as AKRA only after user confirmation. V1 context
  strongly suggests W1 = TRD and W2 = AKRA, but the import should preserve raw
  evidence either way.
- W5 current stock adds `warehouse/w5`.
- TRDAKRA Product presence should not by itself decide whether a product is
  TRD-only or AKRA-only; it should add `module/warehouse` and source alias
  evidence, then derive business coverage from W1/W2/warehouse evidence.

#### `catalog_vendors` and `catalog_product_vendors`

Vendor master and product-vendor relationship.

- Vendor data should seed from PO/GR `Vendor.csv` and PO/GR ProductName vendor
  columns.
- Returnitem ProductName `#REF!` vendor codes should be ignored for canonical
  vendor linking.
- Product-vendor link can store `is_primary`, `lead_time_days`, and source
  metadata.

#### `warehouse_warehouses`

Warehouse/site dimension.

- `id uuid primary key default gen_random_uuid()`
- `warehouse_key text not null unique`
- `display_name text not null`
- `business_unit text`
- `legacy_code text`
- `is_active boolean not null default true`

Initial keys:

- `w1` / TRD candidate
- `w2` / AKRA candidate
- `w3`
- `w4`
- `w5`
- `c1`
- `c2`

#### `warehouse_locations`

Normalized and raw location values per warehouse/source.

- `id uuid primary key default gen_random_uuid()`
- `warehouse_id uuid references warehouse_warehouses(id)`
- `location_code text`
- `floor text`
- `zone text`
- `raw_location text not null`
- `source_app text not null`
- `created_at timestamptz not null default now()`

Purpose:

- Keep TRDAKRA `Floor`/`Location`, PO `Warehouse`, and GR `Loc_IN` separate but
  queryable.
- Preserve messy legacy values such as `w1/3f`, `ชั้น4`, and `F4` for audit and
  later cleanup.

#### `warehouse_product_locations`

Product placement/par rules by warehouse/location.

- `product_id uuid not null references catalog_products(id)`
- `warehouse_id uuid not null references warehouse_warehouses(id)`
- `location_id uuid null references warehouse_locations(id)`
- `location_role text not null`
- `par_level numeric(12,3)`
- `source_app text not null`
- `is_active boolean not null default true`

Examples:

- TRDAKRA `Floor`/`Location`/`Par Level` becomes placement data.
- PO/GR receiving locations become receiving/storage evidence.

#### `warehouse_inventory_balances`

Current stock snapshot by warehouse.

- `product_id uuid null references catalog_products(id)`
- `warehouse_id uuid not null references warehouse_warehouses(id)`
- `qty_on_hand numeric(12,3) not null`
- `unit text not null`
- `source_name text not null`
- `source_app text not null`
- `as_of timestamptz not null`
- `import_batch_id uuid`

Initial source:

- W5 current `W5.csv`. Rows without a resolved `product_id` stay import-visible
  with `source_name` and `match_status` in aliases until resolved.

#### `warehouse_stock_movements`

Stock/event ledger for historical movement.

- `id uuid primary key default gen_random_uuid()`
- `product_id uuid null references catalog_products(id)`
- `warehouse_id uuid null references warehouse_warehouses(id)`
- `movement_type text not null`
- `qty numeric(12,3)`
- `unit text`
- `occurred_at timestamptz`
- `actor_name text`
- `source_app text not null`
- `legacy_id text`
- `source_name text not null`
- `metadata jsonb not null default '{}'::jsonb`

Initial sources:

- W5 History `in` / `out` / `adjust`.
- TRDAKRA W1 request statuses.
- Later: PO/GR and Returnitem workflows when their migration plans are active.

#### Import Traceability

Add or reuse import metadata tables for:

- `import_batches`
- `import_raw_rows` or source-specific staging tables
- `import_mapping_issues`

Every imported alias, balance, and movement should be traceable back to
`source_file`, source row number, and import batch.

### Constraints And RLS Notes

- Use `text` for source strings and `numeric(12,3)` for quantities.
- Store all timestamps as `timestamptz`; normalize Bangkok-local legacy dates in
  import code.
- Index every foreign key used in joins.
- Add composite indexes for common filters such as `(scope_type, scope_key,
  is_active)`, `(warehouse_id, product_id)`, and `(source_app, source_name_key)`.
- Enable RLS on all exposed `public` tables.
- Revoke broad/default grants from `public`, `anon`, and `authenticated` before
  granting intended privileges.
- Authenticated reads should require the relevant module permission
  (`warehouse.read`, `purchasing.read`, `receiving.read`, `returns.read`, or a
  future `catalog.read`).
- Imports, alias approval, stock adjustments, and catalog writes should be
  server-side/service-role only until a dedicated admin UI is designed.

## 5. Classification Logic

Conceptual summary logic:

```text
for each canonical product:
  has_trd = exists active scope business_unit/trd or warehouse/w1
  has_akra = exists active scope business_unit/akra or warehouse/w2
  has_w5 = exists active scope warehouse/w5

  if has_trd and has_akra:
    business_bucket = akra_trd
  else if has_trd:
    business_bucket = trd_only
  else if has_akra:
    business_bucket = akra_only
  else:
    business_bucket = unassigned
```

W5 is intentionally orthogonal:

- A product can be `trd_only` and also `has_w5`.
- A product can be `akra_trd` and also `has_w5`.
- A W5-only name with no canonical match stays in `manual_review` until mapped.

## 6. Task Breakdown

1. Add a dry-run product profiling script for `import-data/` that parses all
   product-like files and transaction product references without database
   writes.
2. Generate a report with product counts, code overlaps, exact-name matches,
   unmatched rows, blank/#REF rows, duplicate headers, and date parsing issues.
3. Draft the shared catalog/warehouse migration in a plan branch or draft SQL
   file, including RLS/grants but do not apply until reviewed.
4. Draft import mapping docs for PO/GR ProductName, Returnitem ProductName,
   TRDAKRA Product/W1 history, W5 current stock/history, and vendor data.
5. Confirm business mapping for W1/TRD and W2/AKRA with the user.
6. Build a no-write dry-run transformer that outputs canonical products,
   aliases, scopes, warehouse locations, balances, and movements as preview
   JSON/CSV/Markdown.
7. Review manual-match candidates, especially the 21 W5 current rows and
   transaction-only product names.
8. After confirmation, create real migrations and staging import scripts.

## 7. Grill Review / Decision Gate

This section pressure-tests the plan before any schema or import code is
written. Treat these as blockers for `Go:` on catalog migrations.

### Critical Risks

1. TRD-only and AKRA-only cannot be derived safely from Product master presence
   alone.
   - TRDAKRA Product is shared by the warehouse module and currently contains
     placement/par metadata. It is not enough evidence that a product belongs to
     TRD, AKRA, or both.
   - Required rule: derive TRD/AKRA buckets from confirmed warehouse/business
     mapping plus transaction evidence, not from a product list existing in an
     app.

2. W5 has no product codes.
   - Auto-creating canonical products from W5 names risks duplicates caused by
     spelling drift, extra slashes, `[ยกเลิก]`, typos, and packaging variants.
   - Required rule: unresolved W5 rows must stay aliases/manual-review rows by
     default. Temporary canonical products require explicit user approval.

3. Units are not safe to aggregate yet.
   - The same product may appear as `ลัง`, `แพ็ค`, `กก.`, `กส.`, or source
     spelling variants.
   - Required rule: preserve source units first. Do not compute cross-warehouse
     stock totals until a unit conversion policy exists.

4. Current stock and movement history may not reconcile.
   - W5 current stock is a snapshot. W5 history and TRDAKRA request history may
     be incomplete or have legacy corrections.
   - Required rule: import balances as snapshots and movements as historical
     events with confidence/source metadata. Do not assume replaying movements
     equals current balance.

5. Location normalization can corrupt meaning.
   - Values such as `W2-2F`, `w1/3f`, `ชั้น4`, `F4`, TRDAKRA `Floor`, and
     TRDAKRA `Location` are not one format.
   - Required rule: store raw location always, normalize into warehouse/floor/
     zone only as a separate parsed layer with parse status.

6. Product active status is source-specific.
   - A product can be active for purchasing but inactive or absent in W5, or
     present in historical Returnitem data only.
   - Required rule: keep global `catalog_products.is_active` conservative and
     add source/module active flags in aliases/scopes where needed.

7. Picking already has `picking_products`.
   - A shared catalog introduced later can create duplicate product identity if
     Picking imports separately first.
   - Required rule: decide whether Picking stays isolated for the pilot or gets
     a bridge table to shared catalog before any production import.

8. Permissions need a catalog owner.
   - Reusing `warehouse.write` for catalog edits may give warehouse operators
     too much master-data authority. Using only `core.admin` may block useful
     catalog maintenance.
   - Required rule: decide whether to add `catalog.read` / `catalog.write`, or
     explicitly document which existing permission owns catalog operations.

### Evidence Priority

Use this priority order when deriving product identity and scope:

1. Exact product code match from a trusted coded source.
2. Confirmed manual alias mapping.
3. Exact normalized-name match within the same source family.
4. Exact normalized-name match across source families.
5. Fuzzy suggestion only; never auto-merge.

Use this priority order for business/warehouse scope:

1. User-confirmed warehouse-to-business mapping, such as W1/TRD and W2/AKRA if
   confirmed.
2. Explicit transaction source where the workflow semantics are known.
3. Warehouse stock/balance source.
4. App lookup-list presence as availability evidence only.

### Go / No-Go Questions (Resolved 2026-06-19)

1. Confirm: W1 means TRD and W2 means AKRA for V2 catalog classification?
   **Resolution:** W1 is TRD. W2, W3, W4, W5, C1, C2 are AKRA (where C1 is W4 cold room, C2 is W5 freezer).
2. If a product appears in TRDAKRA Product but has no W1/W2 transaction evidence, should it be `akra_trd`, or `unassigned` with `module/warehouse` evidence?
   **Resolution:** Should default to `akra_trd`.
3. For the 21 W5 current rows that do not exact-match PO/GR, should V2 keep them unresolved until manual mapping, or create temporary catalog products marked `manual_review`?
   **Resolution:** Keep as unresolved aliases, manually map referencing AKRA products.
4. Should product display names in V2 default to PO/GR ProductName, or should each module keep its source display name until catalog cleanup?
   **Resolution:** Default to PO/GR ProductName for all departments.
5. Who is allowed to approve aliases and edit catalog data: only `core.admin`, warehouse managers, purchasing managers, or a new catalog role?
   **Resolution:** Restrict to `core.admin` initially; plan roles later.
6. Is stock quantity reporting required in the first warehouse slice, or is product/location search enough before unit conversion is designed?
   **Resolution:** Stock quantity reporting is required.
7. Should Picking product data be bridged to shared catalog now, or left isolated until the Picking pilot proves the workflow?
   **Resolution:** Bridge directly to shared catalog now.

## 8. Files Expected To Change

Planning/current slice:

- `docs/plans/V2-0018-shared-catalog-warehouse-data-structure.md`
- `docs/plans/index.md`
- `docs/decisions/0009-shared-catalog-source-scoped-products.md`
- `docs/migration/database-strategy.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

Future execution slice:

- `scripts/product-catalog-import-dry-run.mjs`
- `docs/migration/product-catalog-v1-mapping.md`
- `supabase/migrations/<new shared catalog migration>.sql`
- Possibly `scripts/check-migrations.mjs` updates for catalog/warehouse tables.

## 9. Verification Steps

Current documentation slice:

- Run `git diff --check`.

Future dry-run slice:

- Run the product profiling script against `import-data/`.
- Confirm reported counts match the known baseline:
  - PO/GR ProductName: 4,793 rows/codes.
  - Returnitem ProductName: 4,734 usable codes and 531 blank rows.
  - TRDAKRA Product: 1,791 rows/codes.
  - W5 current stock: 116 rows, 95 exact-name matches, 21 unmatched.
- Confirm no script writes to V1, Supabase, or production files.

Future schema slice:

- Run `npm run check:migrations`.
- Run Supabase staging migration verification before any real import.
- Test RLS/grants with non-admin staging users.

Completion verification:

- `node scripts/product-catalog-import-transformer.mjs` reports 45 `trd_only`,
  36 `akra_only`, 1,791 `akra_trd`, and 2,921 `unassigned` after the
  2026-06-20 correction.
- `node scripts/product-catalog-import-apply.mjs --confirm-staging-import`
  successfully reloaded staging catalog/warehouse data.
- `npm run db:verify-staging-schema` passes with 27 public tables and 25
  policies.
- `npm run db:verify-catalog-import` passes for catalog counts, warehouse
  business-unit mapping, and TRDAKRA scope classification.
- Staging aggregate verification shows all 1,791 TRDAKRA alias products are
  `akra_trd`; `trd_alias_products_trd_only` is 0.

## 10. Rollback / No-Production-Impact Note

This plan modifies V2 docs/scripts and the V2 staging Supabase project only. It
does not modify V1 apps, Google Apps Script deployments, production Sheets,
live URLs, LINE tokens, runtime app routes, or production databases.

The staging catalog import is rebuildable from `import-data/` snapshots using
`scripts/product-catalog-import-apply.mjs --confirm-staging-import`. The script
truncates only the shared catalog/warehouse staging tables before reloading
them, and now refuses to run unless it targets the known staging project or an
explicit override is supplied.

## 11. Open Questions (All Resolved)

- All initial planning questions are resolved. See the Go / No-Go Questions section above for the exact resolutions.

## 12. Handoff Notes

- Next action: Use the corrected staging catalog baseline when planning the
  Picking bridge and future warehouse/catalog UI. Manual alias review remains
  required for unmatched W5 and transaction-only names.
- Blockers: None for the staging baseline; production cutover remains blocked
  until module-specific verification and user approval.
- Related plans: `V2-0015` core import dry run, `V2-0016` server permission guard, `V2-0010` Picking scope gate.
- Related ADRs: `0009-shared-catalog-source-scoped-products`.
