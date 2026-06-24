# Master Data Vocabulary

Last updated: 2026-06-24

This file standardizes naming for V2 source provenance, matching status, and
module folder boundaries. It exists to prevent PR/PO/GR import work from
drifting away from the shared catalog decisions already applied in staging.

## Principles

- Store raw legacy values beside normalized values.
- Do not fabricate product, vendor, warehouse, PR, PO, or GR links when the
  legacy evidence is ambiguous.
- Use nullable foreign keys plus explicit `match_status` when a row is
  importable but needs manual review.
- Keep source provenance separate from module visibility.

## Provenance Fields

| Field | Meaning | Example values |
| --- | --- | --- |
| `source_app` | The legacy source family or source file family that produced the row/alias. | `po-pr-gr`, `picking`, `returnitem`, `akra-trd`, `akra-w5` |
| `source_file` | The concrete CSV/snapshot file name when available. | `Trackingpo - webapp - ProductName.csv` |
| `legacy_source` | Runtime/import row origin for transactional rows. | `v1_import`, `v2_fixture`, `v2_app` |
| `raw_*` | Original V1 text/date/status/name value. | `raw_status`, `raw_expected_date`, `raw_location` |
| `*_id` nullable FK | Trusted normalized relationship when resolved. | `catalog_product_id`, `warehouse_id`, `purchase_order_line_id` |

`source_app` should name the source family, not the V2 module permission. For
example, ProductName/Vendor/PO/GR CSV evidence stays `po-pr-gr`; module
visibility belongs in `catalog_product_scopes` as `scope_type = 'module'` with
values such as `purchasing` or `receiving`.

## Source App Vocabulary

| Value | Meaning | Current use |
| --- | --- | --- |
| `po-pr-gr` | Shared V1 Trackingpo source family: `PR`, `PO`, `GR`, `ProductName`, `Vendor`. | Canonical product/vendor seed, purchasing/receiving evidence. |
| `picking` | V1 Picking source family. | Picking ProductName aliases and Picking reference data. |
| `returnitem` | V1 Returnitem source family. | Return product aliases and future returns scope evidence. |
| `akra-trd` | V1 TRDAKRA/W1 source family. | TRD warehouse/product/location/par/movement evidence. |
| `akra-w5` | V1 AKRA W5 source family. | W5 stock snapshot and movement evidence. |
| `transform` | Synthetic scope evidence created by importer transformation logic. | Existing catalog scope rows where evidence is derived from multiple source rows. |

If a new source family appears, add it here before using it in an import script.

## Match Status Vocabulary

Use the narrowest accurate value. Avoid vague statuses such as `ok` or
`unknown`.

| Status | Meaning | Blocks import? |
| --- | --- | --- |
| `matched_code` | Matched by stable legacy/canonical code. | No |
| `matched_exact_name` | Matched by exact normalized display name. | No, but less strong than code. |
| `manual_review` | Row is preserved, but a human must review the mapping. | No by itself |
| `pr_link_unverified` | PO row has a PR UID/label but no structured PR row to link. | No; ADR `0022` accepted nullable linkage. |
| `orphan_ref_po_uid` | GR row references a PO UID absent from the current PO source. | No by itself; preserve raw reference and null FK. |
| `no_catalog_match` | Product/SKU could not resolve to catalog product/alias. | Warning unless a workflow requires the FK. |
| `no_vendor_match` | Vendor name/code could not resolve to `catalog_vendors`. | Warning unless a workflow requires the FK. |
| `no_warehouse_match` | Warehouse/location evidence could not resolve. | Warning unless a workflow requires the FK. |
| `invalid_source_row` | Required legacy identity is blank/duplicate/malformed, or a required positive measure (e.g. ordered quantity) is zero/blank for that row. | Yes for that row; may block batch depending on scope. |

PR/PO/GR import should report counts for each status after preview and after
apply. New statuses require updating this file and the relevant mapping doc.

## Normalized Status Rules

- Preserve V1 status text in `raw_status` or the table's equivalent raw status
  column.
- Store normalized workflow status separately when the table has a normalized
  status field.
- Do not collapse business states just to make UI simpler; the UI can group
  multiple normalized statuses for display.
- Do not store client-derived display states such as "Overdue" if they can be
  computed from dates/status at read time.

## Canonical vs Alias Rules

- `catalog_products` is the canonical product table.
- `catalog_product_aliases` preserves each legacy app/file name and code.
- V2 modules should reference `catalog_products`/`catalog_product_aliases`
  rather than creating their own product masters.
- If a module needs module-specific display names, store them as aliases or
  presentation logic, not as duplicated products.
- W5 name-only rows with ambiguous matching stay manual-review aliases until a
  human maps them.

## PR/PO/GR Import Rules

- The V1 `po-pr-gr` source family remains one provenance source even though it
  feeds both `purchasing` and `receiving` modules.
- New V2 Direct PO writes must use a stable identity. Legacy bare `DIRECT` is
  import/display fallback only.
- The 3 PR-derived PO rows accepted by ADR `0022` use:
  - `legacy_ref_pr_uid` on the PO header;
  - `pr_number_label` on PO lines;
  - `purchase_request_line_id = null`;
  - `match_status = 'pr_link_unverified'` or a stricter manual-review variant
    if the implementation chooses one and records it here.
- Orphan GR rows use nullable PO-line links with raw `legacy_ref_po_uid`
  preserved and `match_status = 'orphan_ref_po_uid'`.
- Import verification must include counts for manual-review PR links, orphan
  GR rows, unmatched catalog links, unmatched vendors, and unmatched
  warehouses.

## Folder Boundary Rules

- Route files under `src/app/**` should stay thin.
- Domain read models, server actions, formatting, validation, and reference
  data helpers belong under `src/modules/<module>/`.
- Cross-module/shared infrastructure stays in `src/lib/` or an explicit shared
  module. Do not copy shared logic between modules.
- Import parsing/matching helpers shared by dry-run/apply/verify scripts belong
  under `scripts/lib/`.
- Script helpers must not read secrets or write the database by themselves.
  Apply scripts own write gates (`--confirm-*` plus staging project-ref
  checks).

