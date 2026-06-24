# Plan V2-0044: PR/PO/GR Staging Import Slice

Status: Complete — see `docs/plans/index.md` entry 36 and
`docs/migration/pr-po-gr-v1-mapping.md`'s "V2-0044 Staging Import Result"
section for the executed outcome (2026-06-24).

Architect command:

```text
plan PR/PO/GR staging import slice
```

## 1. Goal

- Primary objective: plan the next concrete PR/PO/GR slice — a gated,
  idempotent, staging-only import of the proven V1 PO/GR (and PR, once
  non-empty) data into the locked `0013` schema, building directly on
  `V2-0036`'s schema and `V2-0040`/ADR `0022`'s clean reconciliation result.
- Success definition: the next `Go:` can run a confirm-gated import script
  that loads real PO/GR rows into staging with every legacy field, raw
  value, and match-status preserved, no fabricated links, idempotent on
  re-run, plus a repeatable post-import verification script — without
  touching V1, without runtime UI, and without declaring cutover-ready.
- User/business reason: `ADR 0021` sequences PR/PO/GR as
  import -> read-only screens -> write actions -> UAT -> grouped cutover.
  Data import is the next unblocked link in that chain now that schema
  (`V2-0036`) and reconciliation (`V2-0040`, ADR `0022`) are both done.

## 2. Requirement And Scope Definition

### Problem

- `supabase/migrations/0013_pr_po_gr_foundation.sql` exists and is verified
  in staging, but holds zero rows in all 9 tables.
- `scripts/pr-po-gr-import-dry-run.mjs` already proves the data is clean
  enough to import: 0 blockers, 9 warnings, against the current snapshot
  (750 PO line rows / 254 bill groups, 1868 GR rows, 0 PR rows).
- No import script exists yet that actually writes PO/GR rows to staging —
  only the read-only profiler/reconciler.

### Users

- Primary users (of the import tooling itself): the agent/operator running
  the gated `Go:` import command against staging.
- Secondary users (once a later UI slice lands): purchasing officers,
  receiving staff, supervisors — unaffected by this slice, since there is
  still no runtime route.
- Admin/support users: whoever reviews the post-import verification report
  before approving the next (read-only UI) slice.

### MVP Features

- Reuse, not re-derive, the dry-run script's already-proven parsing,
  `billGroupKey()`/`usableBillRefUid()`/`classifyRefPrUid()` bill-identity
  logic, `classifyDateField()` date classification, lift-fee/extra-item
  Remark regexes, and catalog/vendor/warehouse matching — extract them into
  a small shared module so the apply script and the dry-run script cannot
  silently drift apart (the schema's bill-identity uniqueness depends on
  this logic matching exactly).
- Import PO bill headers (`purchasing_purchase_orders`) + lines
  (`purchasing_purchase_order_lines`), using the locked
  `bill_identity_kind`/`bill_identity_value`/`legacy_ref_pr_uid`/
  `legacy_group_key`/`is_legacy_ambiguous` fields exactly as ADR `0020`
  specified.
- Import GR headers (`receiving_goods_receipts`, grouped conservatively per
  ADR `0020`: by PO bill + date/ATA/receiver/status/remark) + lines
  (`receiving_goods_receipt_lines`) + split-location rows
  (`receiving_line_splits`, parsed from `Loc_IN`).
- Apply ADR `0022` explicitly to the 1 bill group / 3 PO lines with a
  PR-derived `Ref_PR_UID` and no source PR row: populate
  `legacy_ref_pr_uid` + `pr_number_label`, leave
  `purchase_request_line_id` null, set a manual-review `match_status`.
- Import PR headers/lines too (currently 0 rows) so the same code path
  handles PR with no special-casing once a real PR export exists later.
- Resolve `catalog_product_id`/`catalog_alias_id`,
  `catalog_vendor_id`/`warehouse_id` wherever the dry-run already proved a
  confident match; leave null + raw fields + a manual-review `match_status`
  for the 2 unmatched products, 0 unmatched vendors, 5 unmatched SKUs, and
  10 orphan GR `Ref_PO_UID` rows — never fabricate a link.
- Record one `purchasing_events`/`receiving_events` row per imported
  header (not per line) with `event_type = 'imported'` for audit.
- **Re-run safety is truncate-then-reload, not upsert.** Migration
  `0013`'s bill-identity unique index is partial
  (`where bill_identity_value is not null`) and does not cover the 233
  legacy-bare-`DIRECT` bill groups (`bill_identity_value is null`,
  deduplicated only by the plain, non-unique `legacy_group_key` column);
  GR headers have no `legacy_*_uid` at all — they are a *synthesized*
  group key (PO bill + date/ATA/receiver/status/remark) with no unique
  constraint behind it. Only PO lines (`legacy_po_uid`) and GR lines
  (`legacy_gr_uid`) have a real unique key to upsert against. Given the
  full-snapshot, first-import scope (ADR `0023`), the import script
  truncates all 9 tables immediately before inserting, then inserts
  fresh — safe and simple for a one-shot full reload, and avoids relying
  on an upsert key that doesn't exist for headers. This also means a
  re-run after a refreshed export reflects the new export exactly, rather
  than leaving stale header rows whose synthesized GR group key no longer
  matches (e.g. if a GR row's `Status` changed since the last export).
- Gate the writer exactly like every prior import-apply script: a
  `--confirm-pr-po-gr-import` flag plus a staging-project-ref check on
  `DATABASE_URL` (same `STAGING_PROJECT_REF` constant pattern as
  `picking-reference-import-apply.mjs`/`product-catalog-import-apply.mjs`).
- Add a repeatable read-only post-import verification script (row/bill-group
  counts match the dry-run report, orphan-GR count still 10, `anon` still
  denied, and — finally provable now that real rows exist — a
  `purchasing.read`/`receiving.read` test account can read them; this
  closes the check `V2-0036` deferred for lack of data).
- Define and validate the GR header grouping rule itself. ADR `0020`'s
  "group conservatively by PO bill + date/ATA/receiver/status/remark" is
  not yet implemented or tested anywhere — the dry-run script only counts
  GR *rows*, it never groups them into headers. This is new logic for
  this slice, not a reuse of already-proven dry-run code, and needs its
  own row-count/sanity check against the dry-run report before being
  trusted.

### Nice-To-Have Features

- Resolving the missing `Expected_Date` column (still absent from the
  exported `PO.csv`) — stays nullable; revisit only if a fresh export adds
  it.
- A preview/"would-import N rows" dry pass of the apply script itself
  before the real `--confirm` write, mirroring how prior import scripts
  were hand-verified.
- Splitting purchasing vs receiving import into two scripts if one combined
  script becomes unwieldy during implementation.

### Out Of Scope

- Any `/purchasing` or `/receiving` runtime route, server action, or
  transaction RPC.
- Any write/approve/close workflow logic.
- Any V1 production change (Sheets, GAS, URLs, LINE tokens).
- Production import — staging only.
- Declaring PR/PO/GR cutover-ready.
- Warehouse stock-movement writes from GR (explicitly deferred to the
  warehouse foundation per `V2-0036`/`V2-0039`).

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: none — no UI in this slice.
- Backend/server boundary: one-off Node import/verification scripts run
  locally against staging via `DATABASE_URL`, same pattern as every prior
  import-apply script. No `src/` changes expected.
- Database: existing `supabase/migrations/0013_pr_po_gr_foundation.sql`
  schema, staging project only. No new migration expected unless
  implementation surfaces a real gap.
- Auth/permissions: no permission changes; verification re-uses existing
  `purchasing.read/write`/`receiving.read/write` roles.
- Deployment: no Vercel dependency.

### Data Model / Schema

No schema change planned. If implementation finds a real gap (e.g. a
column too narrow for a real value), record it as a small follow-up
migration rather than silently reinterpreting data.

Import order (respects FKs, all read-only catalog/vendor/warehouse lookups
first):

1. Shared catalog/vendor/warehouse lookups (`catalog_products`,
   `catalog_product_aliases`, `catalog_vendors`, `warehouse_warehouses`) —
   read-only, already populated by `V2-0018`.
2. `purchasing_purchase_requests` / `_lines` — 0 rows today; same code path
   as a non-empty future run.
3. `purchasing_purchase_orders` (254 bill groups) / `_lines` (750 rows).
4. `receiving_goods_receipts` (grouped) / `_lines` (1868 rows) /
   `receiving_line_splits` (2 known split rows).
5. `purchasing_events` / `receiving_events` — one `imported` row per header
   created in steps 2-4.

### Integration Points

- V1 references: none beyond the already-profiled
  `import-data/po-pr-gr/Trackingpo - webapp - {PR,PO,GR,ProductName,Vendor}.csv`
  snapshot; no V1 Sheets/GAS access from this repo.
- Supabase: staging `DATABASE_URL` only, same as all prior import scripts.
- Vercel: none.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: none new; existing local `.env.local`/process
  `DATABASE_URL` only.

## 4. UI/UX And User Flow

Not applicable — no runtime UI in this slice.

### System Logic / Pseudocode

```text
load PO/GR/ProductName/Vendor/PR csvs (reuse dry-run parsing helpers)
resolve catalog product/vendor/warehouse ids (reuse dry-run matching, read-only)
require --confirm-pr-po-gr-import and a staging-project-ref DATABASE_URL

run inside one transaction:
  truncate the 9 purchasing_*/receiving_* tables (first full-snapshot import; see ADR 0023)

  group PO lines into bill headers via the locked billGroupKey()/classifyRefPrUid()
  for each bill group:
    insert purchasing_purchase_orders (bill_identity_kind/value, legacy_group_key, ...)
    for each line: insert purchasing_purchase_order_lines (unique legacy_po_uid)
    apply ADR 0022 fields for the 3 known PR-derived/unverifiable lines

  group GR rows by the new (unproven) conservative key per ADR 0020:
    PO bill identity + GR_Date + ATA + Receiver + Status + Remark
  for each GR group:
    insert receiving_goods_receipts
    for each line: insert receiving_goods_receipt_lines (unique legacy_gr_uid)
      resolve purchase_order_line_id via Ref_PO_UID, else null + match_status = 'orphan_ref_po_uid'
    parse Loc_IN split locations -> receiving_line_splits

  insert one purchasing_events / receiving_events row per imported header (event_type = 'imported')

commit
write an import summary report (counts, manual-review samples) under import-reports/
```

## 5. Task Breakdown

1. Extract shared parsing/matching/classification helpers from
   `scripts/pr-po-gr-import-dry-run.mjs` into a small shared module (e.g.
   `scripts/lib/pr-po-gr-parsing.mjs`) so the dry-run, apply, and verify
   scripts share one source of truth for bill-identity grouping, date
   classification, and Remark-tag parsing.
2. Build `scripts/pr-po-gr-import-apply.mjs`: PO header/line import using
   the locked bill-identity logic, gated on `--confirm-pr-po-gr-import` +
   staging project-ref check, wrapped in one transaction that truncates
   the 9 tables before inserting (see the re-run-safety note in section
   2 — header dedup keys have no real unique constraint to upsert
   against).
3. Define and implement the GR header grouping rule (PO bill identity +
   `GR_Date`/`ATA`/`Receiver`/`Status`/`Remark`, per ADR `0020`) — this is
   new logic, not already present in the dry-run script — then extend the
   same apply script for GR header/line/split import, preserving
   lift-fee/extra-item Remark tags and all three date classifications
   (`valid`/`placeholder_dash`/`epoch_artifact`/`malformed`).
4. Apply ADR `0022` explicitly to the 3 PR-derived PO lines (verify by
   name, not just by count, that the same `Ref_PR_UID` rows land with the
   right fields).
5. Add `purchasing_events`/`receiving_events` "imported" audit rows
   (one per header).
6. Add `scripts/verify-pr-po-gr-import.mjs` (+ `package.json` alias
   `pr-po-gr:import-apply` / `pr-po-gr:verify-import`): row/bill-group
   counts match the dry-run report exactly, GR header count matches the
   new grouping rule's own expected count, orphan-GR count is still 10,
   `anon` Data API access is still denied, and a `purchasing.read`/
   `receiving.read` test account can read real imported rows (closes the
   check `V2-0036` deferred for lack of data).
7. Run the apply script's preview path (count-only, no writes) against
   staging, inspect the would-import numbers against the dry-run report
   before the real `--confirm` run.
8. Run the real staging import (`Go:`), run verification, re-run the
   import script once more and confirm the truncate-then-reload produces
   identical row counts both times (proves the script is safe to re-run
   on a refreshed export, not that it skips already-imported rows), then
   update `docs/migration/pr-po-gr-v1-mapping.md`,
   `docs/migration/database-strategy.md`,
   `docs/migration/module-inventory.md` (PR/PO/GR import phase),
   `docs/plans/index.md`, and handoff docs.

## 6. Files Expected To Change

This `Architect:`-equivalent planning step changes only:

- `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`
- `docs/decisions/0023-pr-po-gr-staging-import-scope.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/project-management/decision-board.md`

Future `Go:` implementation is expected to change:

- `scripts/lib/pr-po-gr-parsing.mjs` (new shared module)
- `scripts/pr-po-gr-import-apply.mjs` (new)
- `scripts/verify-pr-po-gr-import.mjs` (new)
- `scripts/pr-po-gr-import-dry-run.mjs` (refactor to use the shared module)
- `package.json` (new script aliases)
- `docs/migration/pr-po-gr-v1-mapping.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md`
- `docs/plans/index.md`, `docs/handoff/current-state.md`,
  `docs/handoff/work-log.md`, `docs/project-management/decision-board.md`
  for closeout notes
- `import-reports/` (git-ignored output)

## 7. Verification Steps

For this planning step:

- `git diff --check`.
- Confirm no runtime app code, Supabase schema, staging data, V1 production
  files, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.

For future implementation:

- Preview/count-only pass of the apply script before the real `--confirm`
  run.
- `npm run pr-po-gr:import-apply -- --confirm-pr-po-gr-import` against
  staging only.
- `npm run pr-po-gr:verify-import`.
- `npm run db:verify-staging-schema`.
- Targeted SQL spot checks: 254 PO bill groups, 750 PO lines, 1868 GR
  lines, 10 orphan GR rows, the 3 ADR-`0022` manual-review PO lines visible
  with the right `legacy_ref_pr_uid`/`pr_number_label`.
- Re-run the import script a second time against the same export and
  confirm identical row counts (truncate-then-reload is deterministic on
  unchanged input — this is not an upsert-skip-duplicates proof, since
  header rows have no real unique key to skip against; see section 2).
- `anon` Data API access still denied; a `purchasing.read`/`receiving.read`
  test account can read the real imported rows (the deferred `V2-0036`
  check, now finally provable).
- `npm run lint`, `npm run typecheck` (script-only changes expected, no
  `src/` changes).
- `git diff --check`.

## 8. Rollback / No-Production-Impact Note

Staging-only. Rollback is deleting the imported rows (this is the first
import, so a full `truncate` of the 9 tables is safe) and re-running after
a fix — no production system is touched. V1 stays live and unmodified as
the fallback throughout.

## 9. Open Questions

- **Import scope** (carried from `V2-0039`/`V2-0040`): import the full
  current snapshot (all 750 PO / 1868 GR rows) in one pass, or active/open
  rows first? Recommended (see ADR `0023`, Proposed): import the full
  snapshot in one pass — the dry-run already proves it clean at full scale
  (0 blockers), and an artificial active/closed split would still need a
  second backfill pass later with no clear benefit. **Needs user
  confirmation before `Go:`.**
- Per-header vs per-batch granularity for the "imported" audit event —
  recommended: per-header (avoids ~2,600 redundant line-level event rows
  for a one-time import). Low-stakes, can be decided at `Go:` time if the
  user disagrees.
- Whether one combined `pr-po-gr-import-apply.mjs` or two scripts
  (purchasing vs receiving) is clearer — recommended: one script for now,
  mirroring `product-catalog-import-apply.mjs`'s precedent of importing
  several related tables in one pass; revisit only if it grows unwieldy
  during implementation.
- Still no fresh PR export. The import script must handle 0 PR rows today
  with no code path that needs to change once a real PR CSV exists —
  validate this assumption once a real export lands, even by hand-testing
  with a synthetic 1-row PR CSV first.
- GR header grouping (PO bill identity + `GR_Date`/`ATA`/`Receiver`/
  `Status`/`Remark`, per ADR `0020`) is **new logic for this slice** — the
  dry-run script only counts GR rows, it never groups them into headers.
  Task breakdown item 3 must define and sanity-check this grouping's
  resulting header count before the apply script is trusted, not assume
  it is already proven.

## 10. Handoff Notes

- Next action: confirm the import-scope open question above (full snapshot
  vs active-only), then `Go:` task breakdown items 1-3 (shared parsing
  module + PO import) as the smallest safe slice; defer GR/events/
  verification (items 3-6) to a follow-up `Go:` only if the PO slice alone
  proves large enough to want a checkpoint.
- Blockers: none technical. The only blocker is the open import-scope
  confirmation above.
- Related plans: `V2-0036`, `V2-0039`, `V2-0040`.
- Related ADRs: `0015`, `0016`, `0018`, `0020`, `0021`, `0022`, `0023`.
