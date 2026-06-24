# ADR 0022: PR-Derived PO Rows With No Source PR Row

Date: 2026-06-24

## Status

Accepted

## Context

`V2-0040`'s reconciliation dry-run found 1 bill group / 3 PO line rows whose
`Ref_PR_UID` is real (non-`DIRECT`), against a PR source confirmed by the
user to be genuinely empty (`Trackingpo - webapp - PR.csv` has the current
header and 0 data rows). `docs/migration/pr-po-gr-v1-mapping.md` framed the
open choice as: accept nullable/manual-review PR linkage, or recover
historical PR rows from another source.

Inspecting the raw rows (`import-data/po-pr-gr/Trackingpo - webapp - PO.csv`)
shows all 3 lines share one `Ref_PR_UID`
(`343d0d75-68db-4ce1-aa9a-e13e7e7f6837`), one vendor (`บจก. เม่งฮง`), one
warehouse (`W3`), one date (`5/5/2026`), `Status = GR Completed` (already
received/closed), and each line's `PR_Number` column already carries the
human-readable breadcrumb `อ้างอิง PR: PR-20260504-7703`. The PR linkage is
not actually lost — only a structured PR *row* (requester, requested qty,
PR-level approval trail) is missing, for a single already-closed PR
affecting 3 already-received line items.

The locked schema (`supabase/migrations/0013_pr_po_gr_foundation.sql`, ADR
`0020`) already has columns for exactly this case, confirmed by inspection:

- `purchasing_purchase_orders.legacy_ref_pr_uid` (nullable text) holds the
  raw `Ref_PR_UID`; `bill_identity_kind = 'pr_uid'` is one of the four
  allowed values.
- `purchasing_purchase_order_lines.pr_number_label` (nullable text) holds
  the human-readable `PR_Number` breadcrumb per line.
- `purchasing_purchase_order_lines.purchase_request_line_id` (nullable FK)
  stays `null` when no structured PR row exists to link to.

No schema change is required to import these 3 rows as manual-review/nullable
PR linkage.

## Decision

Import the 3 PR-derived PO line rows (1 bill group) as manual-review,
nullable PR linkage:

- `legacy_ref_pr_uid` = the raw `Ref_PR_UID` value.
- `pr_number_label` = the raw `PR_Number` breadcrumb text, per line.
- `purchase_request_line_id` = `null` (no structured PR row to link to).
- `bill_identity_kind = 'pr_uid'`, `bill_identity_value` = the
  `Ref_PR_UID`, matching V1's own bill-grouping key for this case.

Do not pursue historical PR-row recovery from another source. The PR is
already closed (status `GR Completed`) and its human-readable reference
survives on every PO line; reconstructing a full structured PR row (with no
new business value, since nothing is pending approval) is not worth the
effort for 1 bill group out of 254.

This resolves the only remaining open question blocking `V2-0040`. If the
business later needs PR-level audit detail for closed POs at scale, full
structured-PR recovery from another source can be revisited as a deferrable
follow-up — not a blocker for PR/PO/GR import planning.

## Consequences

- PR/PO/GR staging import planning can proceed without waiting on a
  PR-recovery effort.
- `purchasing_purchase_order_lines.match_status` for these 3 lines should be
  set to a manual-review value (e.g. `pr_link_unverified`) at import time so
  the gap stays visible without blocking the row.
- No `supabase/migrations` change needed — `0013`'s nullable legacy bridge
  columns already cover this case.

## Related

- Plan: `docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`
- ADR: `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
- ADR: `docs/decisions/0021-pr-po-gr-grouped-release-shape.md`
- Mapping: `docs/migration/pr-po-gr-v1-mapping.md`
- Report: `import-reports/pr-po-gr-dry-run-report.md` (git-ignored, regenerate
  with `npm run pr-po-gr:import-dry-run`)
