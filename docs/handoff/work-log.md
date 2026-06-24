# Work Log

This file keeps only recent handoff entries for quick resume.

Older entries are archived:

- `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`
- `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`
- `docs/handoff/archive/work-log-2026-06-20-status-transitions-through-operating-model.md`
- `docs/handoff/archive/work-log-2026-06-20-data-flow-html-through-problem-reporting.md`
- `docs/handoff/archive/work-log-2026-06-22-management-summary-through-cutover-package.md`
- `docs/handoff/archive/work-log-2026-06-22-po-mockup-through-roadmap.md`
- `docs/handoff/archive/work-log-2026-06-22-cutover-review-through-gr-mockup.md`
- `docs/handoff/archive/work-log-2026-06-22-migration-apply-through-kpi-mockup.md`

Resume order:

1. `CONDUCTOR.md`
2. `docs/plans/index.md`
3. `docs/handoff/current-state.md`
4. The active recent entries below

Context budget:

- Treat `docs/plans/index.md` and `docs/handoff/current-state.md` as the compact source of truth.
- Keep this active log to the latest 3-5 entries or roughly 400 lines.
- Move older entries to `docs/handoff/archive/` with a dated pointer here.
- Open an archive only when investigating a historical plan, decision, bug, or verification detail.

## Active Recent Entries

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

## 2026-06-23 - App Flow Diagrams (V2-0043)

Context:

- User asked (Thai): "ช่วยทำ Flow ของทุกแอปเบื้องต้นมาให้หน่อยได้มั้ย
  สำหรับใช้ใน Mermaid live" (basic flow for every app, for use in Mermaid
  Live). Documentation-only slice.

Changes:

- Added `docs/architecture/app-flow-diagrams.md`: one Mermaid flowchart per
  module (Main/Auth, Picking, Purchasing PR, Purchasing PO, Receiving GR,
  Warehouse TRDAKRA+W5, Returns, KPI), sourced from
  `docs/architecture/target-architecture.md`,
  `docs/migration/module-inventory.md`, `docs/migration/migration-plan.md`,
  and `docs/plans/V2-0032-frontend-ui-ux-module-roadmap.md`. Each diagram
  carries a status line (implemented+verified / schema-only-planned-spec /
  placeholder-route-only / generic-placeholder for Returns specifically,
  since it has no mockup/plan yet) so a reader can't mistake planned flow
  for proven behavior.
- Added `docs/plans/V2-0043-app-flow-diagrams.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md`.

Verification:

- `git diff --check` passes.
- Manual Mermaid syntax check: every node label quoted to avoid
  parenthesis/slash parsing conflicts with flowchart shape syntax.
- No runtime code, Supabase schema, staging data, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.

Concurrency note:

- `docs/plans/index.md`, `docs/handoff/current-state.md`, and this file had
  already been modified by another session (`V2-0042`, Obsidian docs index)
  between this session's `Let's work` read and this edit. Did not revert
  that work; renumbered this slice to `V2-0043` and layered on top. An
  untracked `WEBAPP V2/` directory (Obsidian vault scratch files) exists at
  the repo root, already noted and left untouched by the `V2-0042` session;
  left untouched here too.

## 2026-06-23 - Obsidian Docs Index (V2-0042)

Context:

- User requested `Go: set up Obsidian-friendly docs index for this repo`.
- Documentation-only slice. No runtime code, Supabase schema, staging data,
  V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.

Changes:

- Added `docs/00-dashboard.md` as the recommended Obsidian entrypoint.
- Added `docs/01-active-plans.md`, `docs/02-decisions.md`, and
  `docs/03-migration-map.md` as Obsidian-friendly map pages using relative
  Markdown links.
- Added `docs/plans/V2-0042-obsidian-docs-index.md`.
- Added `.obsidian/` and `docs/.obsidian/` to `.gitignore` so local Obsidian
  vault settings/workspace files are not accidentally committed.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md`.

Verification:

- Manual link/path inspection for the new docs index files.
- `git diff --check` passed.
- Existing unrelated untracked `WEBAPP V2/` directory was left untouched.

## 2026-06-23 - PR/PO/GR Reconciliation Dry-Run Against Empty PR Source (V2-0040)

Context:

- User sent "execute V2-0040 PR CSV reconciliation dry-run with empty PR
  source". `Trackingpo - webapp - PR.csv` exists with the current PR header
  and 0 data rows; user confirmed this is the genuine current PR source
  state. Ran the reconciliation against this explicitly-empty source.

Changes:

- Extended `scripts/pr-po-gr-import-dry-run.mjs` (`V2-0040` task breakdown
  items 3-4):
  - PR CSV parsing is now optional (no hard-block like PO/GR/Product/
    Vendor); `prSourceHasRows` (row count > 0) is the gate used everywhere
    that matters for matching logic, distinct from `prCsvExists` (file
    presence) used only for the report's descriptive text — an empty source
    is treated the same as a missing file for matching purposes, but worded
    distinctly in the report.
  - New **PR Profiling** section: row count, blank/duplicate `PR_UID`,
    status distribution.
  - New **PR -> PO Reconciliation** section: every PO row classified
    `pr_derived` (real, non-`DIRECT` `Ref_PR_UID`) is now matched /
    genuinely-unmatched (PR source has rows, ref truly absent — a real
    blocker) / unverifiable (PR source has no usable rows — a warning, not
    a false blocker).
  - New **PO -> GR line coverage** metric (independent of PR data): percent
    of PO lines with at least one GR row referencing them via
    `Ref_PO_UID`.
  - Renumbered report sections 1-12 to fit the two new PR sections in
    pseudocode order (PR Profiling, then PR -> PO Reconciliation, both
    after PO Profiling and before GR Profiling).
- Updated `docs/migration/pr-po-gr-v1-mapping.md` (new "V2-0040
  Reconciliation Dry-Run" section), `docs/plans/V2-0040-pr-po-gr-pr-csv-
  reconciliation.md`, `docs/plans/index.md`, `docs/handoff/current-state.md`,
  and `docs/project-management/decision-board.md`.

Result (`import-reports/pr-po-gr-dry-run-report.md`, git-ignored,
regenerate with `npm run pr-po-gr:import-dry-run`): 0 PR rows, 750 PO rows,
1868 GR rows; **0 blockers, 9 warnings**. Real findings: 1 bill group / 3 PO
line rows carry a real `Ref_PR_UID` and are unverifiable/manual-review
because no source PR rows exist; PO -> GR line coverage is 94.1% (706/750),
44 lines have no GR yet (expected for open POs). All other
PO/GR/Product/Vendor numbers are unchanged from the `V2-0036` slice-1 run.

Verification:

- `npm run lint`, `npm run typecheck` pass.
- `npm run pr-po-gr:import-dry-run` ran clean, read-only, against the
  current local CSVs and staging catalog/vendor/warehouse tables.
- `git diff --check` passes (pre-existing CRLF warnings only).
- No staging writes, runtime code/UI, transaction RPCs, V1 production
  files, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.
- Still open: user/business decision for the 3 PR-derived PO rows with no
  source PR row (nullable/manual-review linkage vs. recovering historical PR
  rows from another source). No further script changes are expected for the
  empty-source case.

## 2026-06-23 - Placeholder Route Guard Pass (V2-0041)

Context:

- User sent bare `Go`, no plan ID given. Picked up the decision board's
  unblocked Near-Term Queue item 5 / Watch List entry: non-Picking
  placeholder routes had no server-side permission guard, unlike the
  PR/PO/GR planning work (`V2-0039`/`V2-0040`) which is blocked on a user
  decision/export. Drafted the plan inline as part of execution, same
  pattern as `V2-0017`/`V2-0023`/`V2-0025`.

Changes:

- Added `docs/plans/V2-0041-placeholder-route-guard-pass.md`.
- `src/modules/core/module-landing-page.tsx`: added a
  `requirePermission({ permission: app.requiredPermission as
  AppPermission })` check (when `app.requiredPermission` is set), returning
  the existing `AccessDenied` component on denial — same shape as
  `src/app/picking/page.tsx`'s guard. The cast to `AppPermission` is safe
  because `scripts/check-migrations.mjs` already asserts the seeded
  `public.permissions.key` values match the `AppPermission` union exactly,
  and `public.apps.required_permission` is seeded from that same catalog.
- `src/app/{purchasing,receiving,warehouse,returns,kpi}/page.tsx`: added
  `export const dynamic = "force-dynamic"` with the same comment Picking
  uses ("Auth-gated, per-user data: never statically cache this page."),
  since the page is now genuinely per-user.
- Updated `docs/plans/index.md`, `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md` (Near-Term Queue item 5
  marked done, removed the now-stale Watch List entry).

Verification:

- `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- Started a local dev server and `curl`'d all 5 routes signed-out: each
  returned the "Sign In Required" `AccessDenied` body instead of the
  placeholder "Current Status" content (a static first-load check, not an
  interactive flow, so no Playwright install was needed for this).
- Did not separately verify the authenticated-forbidden/
  authenticated-allowed branches with a real test account — the underlying
  `requirePermission()`/`AccessDenied` code path is unchanged and already
  proven correct in Picking (`V2-0019`) and Main (`V2-0017`); only new call
  sites were added to 5 placeholder pages, no new logic.
- `git diff --check` passes (pre-existing CRLF warnings only). No Supabase
  schema, staging data, V1 production files, GAS deployments, Sheets,
  URLs, LINE tokens, or secrets changed.

## 2026-06-23 - PR/PO/GR Next Slice Plan (V2-0040)

Context:

- User accepted moving forward with planning after the `V2-0039` grouped
  release-shape recommendation.
- Treated grouped PR/PO/GR operational cutover as the accepted default and
  planned the next executable slice.

Changes:

- Updated ADR `0021` from Proposed to Accepted.
- Added `docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`.
- Updated `docs/plans/index.md`, `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md`.
- `V2-0040` scopes the next `Go:` work to read-only fresh PR CSV intake and
  PR -> PO -> GR reconciliation dry-run. No import, UI, RPC, staging write, or
  V1 production change is included.

Verification:

- Documentation-only plan.
- `git diff --check` passed.
- No runtime code, Supabase schema, staging data, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 2026-06-23 - PR/PO/GR Release Shape Plan (V2-0039)

Context:

- User requested `Achitect: ข้อ 2`, referring to the next-work item "decide
  PR/PO/GR release shape."
- Treated this as a planning-only `Architect:` command. No runtime code,
  Supabase schema, staging data, V1 production files, GAS deployments, Sheets,
  URLs, LINE tokens, or secrets were changed.

Changes:

- Added `docs/plans/V2-0039-pr-po-gr-release-shape-decision.md`.
- Added proposed ADR `docs/decisions/0021-pr-po-gr-grouped-release-shape.md`.
- Recommendation: implement PR/PO/GR in small slices, but keep a grouped
  operational cutover gate after PR -> PO -> GR staging UAT passes. A staged
  PR/PO-first release should require a separate bridge/writeback ADR first.
- Updated `docs/plans/index.md`, `docs/handoff/current-state.md`,
  `docs/project-management/decision-board.md`, and `V2-0036` references.

Verification:

- Documentation-only plan.
- `git diff --check` passed.
- No runtime code, Supabase schema, staging data, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 2026-06-23 - PR/PO/GR Foundation Closeout Sync (V2-0036)

Context:

- User reported that applying `V2-0036` migration `0013` to staging and
  verification are complete.
- Checked the repo handoff docs and found the apply/verification record was
  already present, but a few top-level summaries still had stale wording.

Changes:

- Updated top-level dates in `docs/plans/index.md`,
  `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md`.
- Corrected stale wording in `docs/plans/index.md`,
  `docs/migration/module-inventory.md`, and
  `docs/migration/migration-plan.md` so they now match the completed
  staging-apply state for migration `0013`.

Verification:

- Documentation-only closeout sync. Did not rerun the staging migration and
  did not change runtime code, staging data, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets.
