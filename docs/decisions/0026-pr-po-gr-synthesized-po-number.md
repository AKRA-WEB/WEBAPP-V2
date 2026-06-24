# ADR 0026: Synthesized `po_number` For Legacy PO Bills Without A Source Value

Date: 2026-06-24

## Status

Accepted

## Context

`V2-0044`'s staging import (`scripts/pr-po-gr-import-apply.mjs`) found a real
gap the dry-run report never surfaced: `purchasing_purchase_orders.po_number`
is `not null` with a not-blank check (`0013_pr_po_gr_foundation.sql`), but the
real V1 `PO.csv` `PO_Number` column is blank on **746 of 750 PO line rows**,
and only **3 of the 254 bill groups** have any line carrying a real
`PO_Number` value at all. V1's own PO module barely uses this field in
practice; the real bill identity comes from `Ref_PR_UID`/the legacy grouping
key (`docs/migration/pr-po-gr-v1-mapping.md`), not `PO_Number`.

## Decision

When no line in a bill group carries a non-blank `PO_Number`, the import
synthesizes `po_number = "LEGACY-" + <bill identity>`:

- `LEGACY-<bill_identity_value>` when the bill has a stable identity
  (`pr_uid` or `direct_stable` kind — the real `Ref_PR_UID` or
  `DIRECT-<uuid>` value).
- `LEGACY-<legacy_group_key with "|" replaced by "-">` when the bill has no
  stable identity (`legacy_direct` kind — the ambiguous bare-`DIRECT`
  fallback grouping).

This affected 251 of 253 imported bill headers. The real source value is used
verbatim whenever any line in the group has one (3 headers).

## Consequences

- `po_number` is always non-blank and deterministic across re-runs (same
  input always produces the same synthesized value), satisfying the
  truncate-then-reload idempotency requirement.
- The synthesized value is clearly marked (`LEGACY-` prefix) so it is never
  mistaken for a real V1-issued PO number in any future UI.
- No information is lost: `legacy_group_key`, `bill_identity_kind`,
  `bill_identity_value`, and every line's `raw_po_date`/`raw_status` remain
  the authoritative legacy identity; `po_number` is a display convenience
  only.
- A future read-only/write UI slice should not present `po_number` as a
  user-meaningful business number for legacy-imported bills without
  explaining the `LEGACY-` prefix, or should derive a friendlier label from
  `bill_identity_kind`/`legacy_group_key` instead.

## Related

- Plan: `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`
- ADR: `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
- ADR: `docs/decisions/0023-pr-po-gr-staging-import-scope.md`
- Script: `scripts/pr-po-gr-import-apply.mjs`
