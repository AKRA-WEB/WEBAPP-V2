# Archived Work Log: 2026-06-23 (App Flow Diagrams through Foundation Closeout Sync)

Archived from `docs/handoff/work-log.md` on 2026-06-24 to keep the active log
under its context budget. Resume order and context-budget rules live in the
active `docs/handoff/work-log.md`.

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
