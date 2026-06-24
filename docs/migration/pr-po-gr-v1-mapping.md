# PR/PO/GR V1 Mapping

This document records V1 source findings for the PR/PO/GR foundation
(`V2-0036`). It is a planning artifact only; no production V1 Sheets are
exported or modified here. Findings below come from reading the V1 backend
source (`Code.gs.txt`, read-only reference) and the current
`import-data/po-pr-gr/` CSV snapshot, plus running
`scripts/pr-po-gr-import-dry-run.mjs`.

## V1 Sources

Read-only references:

- `C:\dev\WEBAPP\PR\Code.gs.txt`, `C:\dev\WEBAPP\PR\index.html`
- `C:\dev\WEBAPP\PO\Code.gs.txt`, `C:\dev\WEBAPP\PO\index.html`
- `C:\dev\WEBAPP\GR\Code.gs.txt`, `C:\dev\WEBAPP\GR\index.html`
- `C:\dev\WEBAPP\development_context.md`

All three modules share one spreadsheet
(`SPREADSHEET_ID = "1iJlJM1Lb2grWBpahpYjwIABTtSHqSdDHXHPxO34b_Z4"`) with sheet
tabs `PR`, `PO`, `GR`, plus shared `Vendor`/`ProductName` masters and a legacy
`TrackingPO` sheet referenced by `getVendorDeliveryInsights()`.

## Open Question Resolved: Authoritative PR Source

**Finding:** a live `PR` sheet tab exists in the same spreadsheet as `PO`/`GR`
(`PR/Code.gs.txt`'s `setupDatabase()` defines its header). **No PR CSV has
been exported** into `import-data/po-pr-gr/` — only `PO.csv`, `GR.csv`,
`ProductName.csv`, and `Vendor.csv` are present.

This is not a missing-data-source problem; it is a missing-export problem.
Full historical PR import needs a fresh CSV export of the live `PR` tab
(`import-data/po-pr-gr/Trackingpo - webapp - PR.csv` or similar), which is out
of scope for this slice (no V1 Google Sheets access from this repo). The PR
schema below is captured from the GAS source so the V2 schema draft can still
account for it; `scripts/pr-po-gr-import-dry-run.mjs` profiles PO/GR/Product/
Vendor only and reports the missing PR CSV as a blocker for any future PR-row
import (not a blocker for this profiling slice).

V1 `PR` sheet header (`PR/Code.gs.txt` `setupDatabase()`):

```text
PR_UID, PR_Date, PR_Number, Requester, Warehouse, SKU, Product, Request_Qty,
Unit, Remark, Status, Approver_Remark
```

`PR_Number` format: `"PR-" + yyyyMMdd + "-" + 4-digit-random` (`createPR`).
`Status` values seen in code: `Pending`, `Approved`, `Rejected` (`rejectPR`
appends to `Remark` and sets `Status` to a caller-supplied value, default
`Rejected`).

## PR -> PO Linkage (`approvePR`)

`approvePR` reads the source PR row's real `PR_UID` and `PR_Number`, marks the
PR row `Status = "Approved"`, then inserts one new `PO` row per approved line
with `Ref_PR_UID = <the real PR_UID>` (not `"DIRECT"`). This is the
PR-derived path. The Direct PO path (`createPO`) never touches `PR`; it writes
`Ref_PR_UID = "DIRECT"` directly (legacy behavior — see below).

## V1 `PO` Sheet

GAS-documented header (`PO/Code.gs.txt`, `GR/Code.gs.txt` `setupDatabase()`):

```text
PO_UID, Ref_PR_UID, PO_Date, PO_Number, Vendor, Warehouse, SKU, Product,
PO_Qty, Unit, Expected_Date, Status, Remark
```

**Mismatch found:** the actual `import-data/po-pr-gr/Trackingpo - webapp -
PO.csv` header is:

```text
PO_UID, Ref_PR_UID, PO_Date, PO_Number, Vendor, Warehouse, SKU, Product,
PO_Qty, Unit, Remark, Status, PR_Number
```

There is **no `Expected_Date` column** in the exported snapshot, and the
trailing column is `PR_Number` (a label), not present in the GAS header
constant at all. The dry-run profiler reads columns by header name (not
position) to stay correct against the real export, but this is flagged as a
manual-review item: either the export predates an `Expected_Date` column
add, the export tool reordered/renamed columns, or the live sheet has
diverged from `setupDatabase()`'s documented shape. Vendor expected-delivery
modeling (used by `getVendorDeliveryInsights()` in V1, and by the GR mock-up's
"vendor confirmed/estimated" pills) should not be finalized until this is
resolved — likely by re-exporting current sheet headers directly before the
schema-drafting task.

### PO Row Granularity And Bill Grouping

Each `PO` row is one **line item** (its own `PO_UID`), not a bill header. V1
groups line rows into a logical "bill" for **display** purely in memory,
using `PO/index.html`'s `poBillGroupKey()` (line ~557, paired with
`usableBillRefUid()` line ~547):

```text
ref = usableBillRefUid(Ref_PR_UID)   // "" if blank or bare "DIRECT", else the ref itself
key = ref ? ("bill:" + ref)
            : ("legacy:" + [PO_Number, Vendor, PO_Date, Warehouse].join("|"))
```

In other words: a non-blank, non-bare-`"DIRECT"` `Ref_PR_UID` (a
`DIRECT-<uuid>` or a real PR `PR_UID`) **is** the bill identity by itself —
no other field matters. Only the ambiguous legacy case falls back to the
four raw fields. (`PO/Code.gs.txt`'s separate `readCurrentLeadSamples_`,
line ~342, uses a different 5-field key including `Ref_PR_UID` for its own
vendor lead-time/insights aggregation only — not the canonical bill
grouping. The two happen to produce identical group counts on the current
snapshot, verified empirically, but `poBillGroupKey()` is the one the
schema should follow.)

`Ref_PR_UID` is one of:

- `"DIRECT"` — **legacy** Direct PO marker. Ambiguous: any two unrelated
  Direct POs sharing the same blank/duplicate `PO_Number`, vendor, date, and
  warehouse collapse into the same V1 "group" by coincidence. This is V1's
  existing behavior, not a bug to fix in V2 — just a fallback grouping that
  must not be reused for new V2-created Direct POs.
- `"DIRECT-" + uuid` — **current** Direct PO marker (`resolvePoBillRefUid_`,
  `dryRunBillRefUid_`). Always unique per bill-creation call, reused across
  all line rows added in that same call/edit, never collides.
- any other non-empty value — the real `PR_UID` of the approving PR (PR-derived
  PO).

V2 must always assign a stable, unique identity to new Direct POs (matching
`DIRECT-<uuid>`, or a V2 UUID) and must only use the bare `"DIRECT"`-equivalent
fallback grouping for **legacy data display**, never for new writes — this
matches the constraint already recorded in `V2-0036`'s plan.

## V1 `GR` Sheet

GAS-documented header and the exported CSV header agree (unlike `PO`):

```text
GR_UID, Ref_PO_UID, GR_Date, ATA, Receiver, SKU, Product, GR_Qty, Unit,
Loc_IN, Exp_Date, Leadtime(_Days), Remark, Status, Old.Qty/Old_Stock
```

- One `GR` row per received line, linked to a specific `PO` line via
  `Ref_PO_UID` (the PO line's `PO_UID`), not the bill group key.
- **Split storage:** `Loc_IN` joins multiple raw locations with `" | "` (e.g.
  `"W2-2F | W5-1F"`). The actual storage warehouse for each piece is the
  segment before the first `-` (`GR/Code.gs.txt` comment, line ~565-572).
  Preserve the raw string; do not assume a single warehouse per GR line.
- **Lift fee (W2 only):** not a separate column. Encoded as a tag inside
  `Remark`, parsed client-side (`GR/index.html` `parseReceivingRemark`):
  - current format: `[ค่าลิฟท์ <rounds>? รอบ (จ่ายสด|เชื่อ)]`
  - legacy format: `[ค่าลิฟท์: (จ่ายสด|เชื่อ)]`
  - Only rendered/edited when `group.warehouse === "W2"`.
- **Extra/free items not on the original PO:** tagged with the literal prefix
  `[นอกบิล/ของแถม]` inside `Remark` (`GR/Code.gs.txt` ~line 677).
- Status values seen in code: `Draft GR`, `Pending Review`, `GR Completed`
  (plus PO-side `Pending GR`, `PO Closed - Ready for APV`, and a derived
  client-only `Overdue` display state when a `Pending GR` PO is >7 days old).

## V1 `ProductName` / `Vendor` Masters (shared with PO/GR)

- `ProductName.csv` header: `Product code, Product name, Category, Unit,
  Vendor Code, Vendor Name, Location 1, Location 2(W5), Storage Type, Lead
  Time`. Same file family already profiled for the shared catalog
  (`V2-0018`); PO/GR-sourced `SKU` values are expected to match `Product
  code` here, not the shared-catalog `canonical_code` directly — bridge
  through `catalog_product_aliases` the same way Picking did
  (`source_app = "purchasing"`/`"receiving"`), not a new product table.
- `Vendor.csv` header: `Code, Vendor Name, Phone Number, Email, Address, Tax
  ID, Price Level, Avg.Lead Time 2025, Avg.Lead Time 2026, SUM`. `PO.Vendor`
  stores a free-text vendor **name**, not `Code` — matching against
  `Vendor.csv` must be by exact `Vendor Name`, with unmatched names reported
  rather than fabricated.

## Status Normalization (Draft)

| Raw V1 status | Normalized V2 status (draft) |
| --- | --- |
| `Pending` (PR) | `pr_pending` |
| `Approved` (PR) | `pr_approved` |
| `Rejected` (PR) | `pr_rejected` |
| `Pending GR` (PO) | `po_pending_receipt` |
| `Draft GR` (GR/PO) | `gr_draft` |
| `Pending Review` (GR/PO) | `gr_pending_review` |
| `GR Completed` (GR/PO) | `gr_completed` |
| `PO Closed - Ready for APV` (PO) | `po_closed_apv_ready` |
| *(client-derived)* `Overdue` | not stored; compute the same way at read time |

Raw status strings must still be preserved verbatim per row (`AGENTS.md`/plan
constraint: "preserve raw legacy status values while also mapping normalized
V2 statuses"); this table is the mapping, not a replacement.

## Validation Before Any Future Import

- Every `PO`/`GR` row needs a non-empty, unique `PO_UID`/`GR_UID`.
- Every `GR.Ref_PO_UID` should resolve to a known `PO.PO_UID`; orphan rows are
  blockers for that row, not for the whole import.
- `PO_Date`/`GR_Date`/`ATA`/`Exp_Date` use `D/M/YYYY` (no leading zeros seen in
  the snapshot); confirm parsing handles single-digit day/month.
- Bare-`"DIRECT"` bill groups with more than a handful of line rows are a
  manual-review flag (possible false merge of unrelated Direct POs), not an
  automatic blocker.
- Vendor names referenced in `PO.Vendor` but absent from `Vendor.csv`, and
  product codes/names in `PO`/`GR` that don't resolve against
  `ProductName.csv` or the shared `catalog_products`/`catalog_product_aliases`
  staging tables, are warnings requiring manual alias review (same posture as
  `V2-0018`/`V2-0020`), not blockers.

## Open Decisions (Carried From `V2-0036`)

- How to handle the 3 PR-derived PO rows when the current PR source has 0
  rows: accept nullable PR linkage/manual review for import, or recover
  historical PR rows from another backup/source before import.
- Whether the `Expected_Date` mismatch means the live sheet truly lacks that
  column today, or the export needs to be redone.
- Whether PR/PO/GR ship as one combined cutover or can go live in stages
  (e.g. PR/PO before GR).
- Whether GR receiving should write warehouse stock movements in the first
  release or wait for the warehouse foundation.

## Schema/RLS Lock Follow-Up (2026-06-22)

ADR `0020` locks the migration `0013` direction based on this mapping and the
dry-run report. The warnings above do not block schema creation:

- empty/missing PR source does not block schema creation; PR header/line
  tables are still created now, and PR-derived PO rows without source PR rows
  stay nullable/manual-review on import;
- missing `Expected_Date` means V2 keeps nullable `expected_date`,
  `raw_expected_date`, and `expected_date_source`;
- bare legacy `DIRECT` stays legacy-only and ambiguous; new V2 Direct POs must
  use stable identity;
- orphan GR `Ref_PO_UID` rows keep raw references and nullable PO-line FKs
  instead of fabricated links.

Those issues still block final import/cutover decisions until manual review
and UAT evidence exist.

## V2-0040 Reconciliation Dry-Run (2026-06-23, Empty PR Source)

`import-data/po-pr-gr/Trackingpo - webapp - PR.csv` now exists locally with
the real V1 `PR` header (`PR_UID,PR_Date,PR_Number,Requester,Warehouse,SKU,
Product,Qty,Unit,Remark,Status`) and **0 data rows**. The user confirmed this
is the real current PR source state, not a missing export. For PR -> PO
matching purposes, an empty source still has no usable PR rows to verify
against, but it is reported distinctly from a missing file.

Extended `scripts/pr-po-gr-import-dry-run.mjs` per `V2-0040` task breakdown
items 3-4:

- Parses the PR CSV when present (optional — does not hard-block like
  PO/GR/ProductName/Vendor).
- New **PR Profiling** section: row count, blank/duplicate `PR_UID`, status
  distribution (all necessarily zero against the current empty source).
- New **PR -> PO Reconciliation** section: classifies every `pr_derived` PO
  row (real, non-`DIRECT` `Ref_PR_UID`) as matched / genuinely unmatched
  (PR source has rows but ref not found — a real blocker) / unverifiable (PR
  source has no rows — a warning, not a blocker). Against the current
  empty source: **1 bill group, 3 PO line rows** carry a real `Ref_PR_UID`
  and are unverifiable/manual-review because no source PR rows exist.
- New **PO -> GR line coverage** metric (doesn't depend on PR data at all):
  **706 / 750 PO lines (94.1%) have at least one GR row** referencing them
  via `Ref_PO_UID`; the remaining 44 (5.9%) are reported as a warning
  ("expected for open/pending POs, not necessarily a data issue").

Result with the empty PR source: **0 blockers, 9 warnings** (up from 7 in the
`V2-0036` slice-1 run — the two new warnings are the empty-PR-source notice
and the 3-row unverifiable-coverage count; all other PO/GR/Product/Vendor
numbers are unchanged from the prior run on the same snapshot).

This resolves the file-presence question for the current snapshot: the PR
source is empty. The remaining decision is how to handle the exact PR-derived
legacy count (**3 PO rows / 1 bill group**) when planning import: accept
nullable/manual-review PR linkage, or recover historical PR rows from another
source if the business needs that relationship reconstructed.

**Resolved (ADR `0022`, 2026-06-24):** import as manual-review/nullable PR
linkage; do not pursue historical PR-row recovery. Inspecting the raw rows
shows the linkage is not actually lost — all 3 lines share one
`Ref_PR_UID` (`343d0d75-68db-4ce1-aa9a-e13e7e7f6837`), one vendor (`บจก.
เม่งฮง`), one warehouse (`W3`), one date (`5/5/2026`), `Status = GR
Completed` (already closed), and each line's `PR_Number` column already
carries the human-readable breadcrumb `อ้างอิง PR: PR-20260504-7703`. Only a
structured PR row (requester/requested-qty) is missing, for a single
already-closed PR. The locked schema
(`supabase/migrations/0013_pr_po_gr_foundation.sql`) already has the needed
nullable columns (`purchasing_purchase_orders.legacy_ref_pr_uid`,
`purchasing_purchase_order_lines.pr_number_label`,
`purchasing_purchase_order_lines.purchase_request_line_id`), so no schema
change is needed to import these 3 rows.
