# Archived Work Log: 2026-06-24 (PR-Derived PO Decision Through Import Slice Plan)

Archived from `docs/handoff/work-log.md` to keep the active log under the
context budget. Covers `V2-0040`'s ADR `0022` decision through `V2-0044`'s
planning entry (the import execution entry itself stays in the active log).

## 2026-06-24 - PR/PO/GR Staging Import Slice Plan (V2-0044)

Context:

- User asked to "plan PR/PO/GR staging import slice" — treated as an
  `Architect:`-equivalent planning-only request (no runtime/schema
  changes), the natural next slice now that schema (`V2-0036`) and
  reconciliation (`V2-0040`, ADR `0022`) are both done.

Changes:

- Added `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`: plans a
  gated, idempotent staging-only import of the current V1 PO (750
  lines/254 bill groups)/GR (1868 rows)/PR (0 rows) snapshot into the
  locked `0013` schema. Key design choices:
  - Extract shared parsing/bill-identity/date-classification/Remark-tag
    logic out of `scripts/pr-po-gr-import-dry-run.mjs` into a shared
    module, reused by a new `scripts/pr-po-gr-import-apply.mjs` and
    `scripts/verify-pr-po-gr-import.mjs`, so the schema's bill-identity
    uniqueness logic can't silently drift between dry-run and apply.
  - Apply ADR `0022` explicitly to the 3 PR-derived manual-review PO
    lines (`legacy_ref_pr_uid`/`pr_number_label`/null
    `purchase_request_line_id`).
  - Gate the writer the same way as every prior import-apply script:
    `--confirm-pr-po-gr-import` + staging-project-ref check on
    `DATABASE_URL`.
  - One `purchasing_events`/`receiving_events` "imported" row per header
    (not per line), to avoid ~2,600 redundant audit rows.
  - Closes the `V2-0036`-deferred check: a `purchasing.read`/
    `receiving.read` test account reading real imported rows (impossible
    before, since 0 rows existed).
- Advisor review before this slice was committed caught two real plan
  gaps, both fixed in the plan before commit (no implementation existed
  yet, so no code fix was needed):
  - The plan originally claimed re-run safety via "idempotent upsert" on
    `legacy_po_uid`/`legacy_gr_uid`/the PO bill-identity unique index.
    That index is **partial** (`where bill_identity_value is not null`)
    and does not cover the 233 legacy-bare-`DIRECT` bill groups; GR
    headers have no `legacy_*_uid` or unique key at all (they're a
    synthesized group key). Corrected the plan to truncate-then-reload
    inside one transaction for this first full-snapshot import, instead
    of an upsert that can't actually fire for header rows.
  - The plan implied GR header grouping (PO bill + date/ATA/receiver/
    status/remark per ADR `0020`) was already proven by the dry-run
    script. It isn't — the dry-run only counts GR rows, it never groups
    them into headers. Flagged this as new, unvalidated logic that task
    breakdown item 3 must define and sanity-check at `Go:` time.
- Added proposed ADR `docs/decisions/0023-pr-po-gr-staging-import-scope.md`:
  recommends importing the **full current snapshot** (not active/open
  rows only) in one pass — the dry-run already proves it clean at full
  scale, and an active-only first pass would still need a second backfill
  pass later for historical/closed rows with no clear benefit. Left
  **Proposed**, not Accepted — this is a real open decision (unlike the
  ADR `0022` case, where raw-row evidence made the answer obvious), so it
  is surfaced for explicit user confirmation before the next `Go:` rather
  than decided unilaterally.
- Updated `docs/plans/index.md` (new entry 36, Open Decisions section),
  `docs/handoff/current-state.md` (status paragraph, Plan IDs list, Next
  Actions item 16), and `docs/project-management/decision-board.md`
  (Recommended Next Move, Near-Term Queue item 6, Open Decisions section).

Verification:

- Documentation/planning-only; no runtime code, Supabase schema, staging
  data, V1 production files, GAS deployments, Sheets, URLs, LINE tokens,
  or secrets changed. No new script files written yet — this slice only
  plans them.
- `git diff --check` passes.

Next action: user confirms (or redirects) the ADR `0023` import-scope
recommendation, then `Go:` task breakdown items 1-3 (shared parsing module
+ PO import) as the smallest safe slice.

## 2026-06-24 - PR-Derived PO 3-Row Decision (V2-0040, ADR 0022)

Context:

- User asked to "decide PR/PO/GR 3-row handling next" — the open decision
  left by `V2-0040`'s reconciliation dry-run: 1 bill group / 3 PO line rows
  carry a real `Ref_PR_UID` with no matching PR row, since the current PR
  source is confirmed genuinely empty. The mapping doc framed this as accept
  nullable/manual-review linkage vs. recover historical PR rows from
  another source.

Investigation:

- Inspected the raw rows in `import-data/po-pr-gr/Trackingpo - webapp -
  PO.csv` directly rather than reasoning from the report summary alone: all
  3 lines share one `Ref_PR_UID` (`343d0d75-68db-4ce1-aa9a-e13e7e7f6837`),
  one vendor (`บจก. เม่งฮง`), one warehouse (`W3`), one date (`5/5/2026`),
  `Status = GR Completed` (already received/closed), and each line's
  `PR_Number` column already carries the human-readable breadcrumb
  `อ้างอิง PR: PR-20260504-7703`. The PR reference is not actually lost —
  only a structured PR row (requester, requested qty) is missing, for a
  single already-closed PR.
- Verified (not assumed) that the locked schema already has columns for
  this case by reading `supabase/migrations/0013_pr_po_gr_foundation.sql`:
  `purchasing_purchase_orders.legacy_ref_pr_uid` (nullable text),
  `purchasing_purchase_order_lines.pr_number_label` (nullable text), and
  `purchasing_purchase_order_lines.purchase_request_line_id` (nullable FK)
  all already exist. No migration change is needed to import these 3 rows.

Decision (ADR `0022`, Accepted):

- Import the 3 rows as manual-review/nullable PR linkage
  (`legacy_ref_pr_uid` + `pr_number_label`, `purchase_request_line_id =
  null`, `bill_identity_kind = 'pr_uid'`).
- Do not pursue historical PR-row recovery from another source — the PR is
  already closed and its reference survives as text; reconstructing a full
  PR row for 1 of 254 bill groups has no business value at this scale. Full
  recovery stays a deferrable later step if the business later needs
  PR-level audit detail for closed POs, not a blocker.

Changes:

- Added `docs/decisions/0022-pr-po-gr-3-row-pr-linkage.md`.
- Updated `docs/migration/pr-po-gr-v1-mapping.md` (resolution note under the
  "V2-0040 Reconciliation Dry-Run" section), `docs/plans/index.md` (`V2-0040`
  marked Complete, Open Decisions section), `docs/handoff/current-state.md`
  (status paragraph, work-record note, Next Actions item 13), and
  `docs/project-management/decision-board.md` (Recommended Next Move,
  Near-Term Queue, Open Decisions -> Resolved Decisions).

Verification:

- Documentation/decision-only; no runtime code, Supabase schema, staging
  data, V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets changed. No migration file added — confirmed `0013`'s existing
  nullable columns already cover the decision instead of asserting it.
- Next action: plan the PR/PO/GR staging import slice (no further blockers
  from this decision).
