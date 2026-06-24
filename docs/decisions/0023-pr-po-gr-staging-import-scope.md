# ADR 0023: PR/PO/GR Staging Import Scope

Date: 2026-06-24

## Status

Accepted

## Context

`V2-0044` plans the next PR/PO/GR slice: a gated, idempotent staging import
of the current V1 PO/GR (and PR, currently 0 rows) snapshot into the
`0013` schema. `V2-0039`/`V2-0040` both carried forward an open question:
should the first import target the full historical snapshot, or
active/open rows only?

The current snapshot is small enough that the distinction matters mainly
for effort and risk, not data volume: 750 PO line rows across 254 bill
groups, 1868 GR rows. `scripts/pr-po-gr-import-dry-run.mjs` already proves
the full snapshot is clean enough to import (0 blockers, 9 warnings, all
already triaged as manual-review/non-blocking).

An "active rows only" first pass would still need a second pass later to
backfill closed/historical rows for audit/reporting completeness (vendor
lead-time insights, APV history), since V1's `GR Completed`/
`PO Closed - Ready for APV` rows are real operational history, not noise.
Drawing an active/closed line also requires picking an arbitrary
status/date cutoff that the dry-run report does not currently define or
need.

## Decision

Import the full current snapshot in one pass: all 750 PO line rows (254
bill groups) and all 1868 GR rows, plus 0 PR rows (no special-casing —
the same import code handles a future non-empty PR export unchanged).

## Consequences

- No second backfill pass is needed later for historical PO/GR rows.
- The import script must be idempotent (safe to re-run) since the same
  full-snapshot logic will also be used for any future refreshed export.
- Read-only and write UI slices that follow can rely on the staging
  dataset containing the complete current operational and historical
  picture, not a partial one.
- This does not change `ADR 0021`'s grouped-cutover gate — import
  completeness is a precondition for that gate, not a substitute for it.

## Related

- Plan: `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`
- ADR: `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
- ADR: `docs/decisions/0021-pr-po-gr-grouped-release-shape.md`
- ADR: `docs/decisions/0022-pr-po-gr-3-row-pr-linkage.md`
- Report: `import-reports/pr-po-gr-dry-run-report.md` (git-ignored,
  regenerate with `npm run pr-po-gr:import-dry-run`)
