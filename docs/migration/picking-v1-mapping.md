# Picking V1 Mapping

This document maps the V1 Picking app into the V2 Picking pilot schema. It is a
planning artifact only; no production V1 Sheets are exported or modified here.

## V1 Sources

Read-only references:

- `C:\dev\WEBAPP\Picking\index.html`
- `C:\dev\WEBAPP\Picking\problem.html`
- `C:\dev\WEBAPP\Picking\Code.gs.txt` (git-ignored backend source)
- `C:\dev\WEBAPP\conductor\plans\20260617-001-picking-bulk-entry-flex-card-billno.md`

V1 sheets:

| Sheet | Headers / Shape | Purpose |
| --- | --- | --- |
| `ProductName` | `id`, `name`, `defaultUnit`, `active`; backend also recognizes legacy product-code/subname/unit aliases | Product autocomplete |
| `Staff` | `name`, `lineUserId`, `active` | Assignee list and LINE mention target |
| `Requisition` | `uid`, `timestamp`, `billType`, `requester`, `assignee`, `itemsJSON`, `lineStatus`, `doneBy`, `doneAt`, `token`, `sentBy`, `sentAt`, `problemItems`, `problemBy`, `problemAt`, `cardQuoteToken`, `billNo` | Picking bills and LINE workflow state |

## Target Tables

| V2 Table | Import / Mapping Rule |
| --- | --- |
| `picking_products` | Import active and inactive product rows. Store V1 product code in `legacy_product_id`, product display name in `name`, unit in `default_unit`, and active flag in `is_active`. |
| `picking_staff` | Import staff display names and active flags. Link to `profiles` later when the assignee is also a V2 user. |
| `picking_staff_line_accounts` | Store `lineUserId` by staff row. Do not expose to authenticated client reads. |
| `picking_requisitions` | One row per V1 `Requisition.uid`. Preserve `legacy_uid`, `requested_at`, `bill_type`, `status`, `bill_date`, `bill_no`, requester/assignee display names, and timestamps for pick/send/problem events. |
| `picking_requisition_lines` | Expand `itemsJSON` into one row per requested item. Preserve product display name, quantity, unit, and whether it was free-text/unmatched. |
| `picking_requisition_secrets` | Store hashes of capability tokens and server-only LINE quote tokens for backend workflows only. Never import plaintext capability tokens into committed files. |
| `picking_problem_reports` | One row per problem submission, using V1 `problemBy`/`problemAt`. |
| `picking_problem_report_lines` | Expand `problemItems` into requested vs actual quantities and notes. |
| `picking_requisition_events` | Record normalized lifecycle events such as `created`, `picked`, `problem_reported`, `sent`, and `line_push_failed`. |
| `picking_daily_sequences` | Owns future V2 daily `#NNN` counters by date. V1 `billNo` values are imported into requisitions, not into this counter table. |

## Workflow Mapping

- `saveRequisition` becomes a server-side transaction:
  create requisition, allocate daily `bill_no`, insert lines, create secret
  token hashes, send LINE, then record a notification/event result.
- LINE `pick` postback maps `pending -> picked`.
- LINE `ship` postback maps `picked -> sent`; `pending -> sent` is blocked.
- `problem.html` shortage report writes problem report rows. If status is
  `pending`, V1 also marks the bill as `picked`; V2 intentionally diverges
  from that behavior per ADR `0018`: a problem report does not mark a
  `pending` requisition as `picked`.
- Repeat taps and stray postbacks stay idempotent/no-op unless the UI later
  needs explicit feedback.

## Status And Type Values

V1 bill types:

- `บิลจัด`
- `บิลด่วน`
- `บิลสินค้าเรียงหน้าร้าน`
- `จัดเตรียมไว้ก่อน`

V1 line statuses:

- `pending`
- `picked`
- `sent`

V2 additionally reserves:

- `cancelled`
- `line_push_failed`

## Validation Before Import

- Every requisition has a non-empty `uid`, valid timestamp, bill type, requester,
  assignee, and `itemsJSON` array.
- Every line has non-empty product name, positive requested quantity, and unit.
- `billNo` uniqueness is checked per local bill date when present.
- `problemItems` must reference known product names from the bill or be flagged
  as legacy mismatch.
- Staff names in requisitions should map to `picking_staff`; unmatched names are
  blockers unless explicitly allowed as legacy display-only data.
- Capability tokens and LINE quote tokens are treated as sensitive. Import
  tooling must hash or omit capability tokens and keep LINE quote tokens
  server-only; plaintext token values must never be committed.

## Open Decisions

- Whether to keep V1 role-fallback permissions for the first V2 pilot or require
  strict `picking.read` / `picking.write` assignments from day one.
- Whether to support historical `billNo` gaps exactly or only preserve visible
  numbers on imported rows.

## Resolved Decisions

- Problem reporting does not change a `pending` requisition to `picked`
  (ADR `0018`).
- LINE staging starts with disabled send/dry-run behavior; real sends require
  later explicit approval (ADR `0018`).
- V1 Picking history remains a read-only archive for the first cutover package
  rather than being imported into V2 (ADR `0018`).
