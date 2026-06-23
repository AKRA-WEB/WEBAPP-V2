# Archived Work Log: 2026-06-22 (Cutover Review Round 2 Through GR Mock-up)

Archived from `docs/handoff/work-log.md` on 2026-06-22 to keep the active
log under its context budget. Covers, newest first: Picking cutover package
review round 2, Picking cutover package review round 1, PR/PO/GR source
profiling + dry-run report (`V2-0036` slice 1), PR frontend mockup
(`V2-0037`), GR frontend mockup update (`V2-0035`), PR/PO/GR foundation plan
(`V2-0036`), and the original GR frontend mock-up (`V2-0035`).

## 2026-06-22 - Review Response Round 2: Picking Cutover Package (V2-0034)

Context:

- User ran a second `Review:` pass on the package after round 1's response
  and reported 4 more findings (1 high, 1 medium, 2 low). Verified all 4
  against the current file before acting — all accurate.

Changes:

- Finding 1 (high, contradictory checklist line): the "Deployment" section
  had `[x] Production env vars prepared but not exposed`, directly
  contradicting section 5a's runbook (env vars not yet added to Production
  scope) and the "Cutover" section's own `[ ] V2 production route enabled`.
  Fixed: changed to `[ ]`, reworded "not done, intentionally," pointed at
  section 5a step 2.
- Finding 2 (medium, wrong "committed" wording): round 1's response said the
  new `scripts/verify-picking-cutover-reconciliation.mjs` was "committed" —
  wrong, `git status` shows it's still `??`. Fixed wording to "added
  locally, not yet committed" in both the package (section 3) and the
  `V2-0034` plan (section 9).
- Finding 3 (low, stale plan section 5): the plan's original Verification
  section still describes the deleted one-off script as current. Left it
  as the historical record rather than rewriting it (matches this repo's
  "don't rewrite history" convention); added plan section 10 (this round's
  record) explaining the correction instead.
- Finding 4 (low, missing warnings in freshness section): package section
  3a said "0 blockers" without surfacing the dry-run's 2 warnings. Fixed:
  now lists both explicitly (3 manual-review products; re-running apply
  would delete-then-insert all existing picking-source aliases), marked
  known/accepted.
- Updated `docs/plans/V2-0034-picking-cutover-package.md` (new section 10).

Verification:

- `npm run picking:verify-cutover-reconciliation` and
  `npm run picking:reference-import-dry-run` both re-ran clean, read-only.
- `git diff --check` passes (CRLF warnings only, pre-existing).
- No schema, runtime code, staging data, V1 production files, or secrets
  changed. Cutover remains **not** approved; this was a precision/wording
  pass on the evidence package, not a new gate closed or opened. The
  package and its plan/script remain uncommitted — still a user decision.

## 2026-06-22 - Review Response: Picking Cutover Package (V2-0034)

Context:

- User ran `Review: V2-0034` and reported 5 findings (1 blocker, 1 high, 3
  medium) on `docs/migration/picking-cutover-package.md`, concluding cutover
  should not be approved yet.
- Verified every cited line number/claim against the actual current file
  before acting (not the pasted summary alone) — all 5 checked out accurate.

Changes:

- Finding 1 (blocker, no cutover runbook): added package section 5a — 4
  concrete steps (pause/redirect V1 writes, explicitly named as a
  business/V1-side action outside this repo's authority per `AGENTS.md`
  Section 1; enable the V2 production route with specific env/push/verify
  sub-steps; notify real users; rollback cross-reference). Updated the
  "Cutover" checklist rows to point at these steps instead of "out of
  scope."
- Finding 2 (high, reference-data freshness never re-checked since
  `V2-0020`): added package section 3a. Re-ran
  `npm run picking:reference-import-dry-run`; result was identical to the
  original import (4761 rows, 4758 matched_code, 3 manual_review, 1 staff
  row). Documented precisely what this does and doesn't prove: the on-disk
  CSV snapshot (`import-data/Picking/`, last modified 2026-06-20) is read
  consistently, but this repo has no way to confirm the live V1 Sheet hasn't
  changed since — that needs a fresh export, a user/Sheet-access action.
  Added an explicit unchecked checklist row for it.
- Finding 3 (medium, reconciliation evidence not reproducible): added
  `scripts/verify-picking-cutover-reconciliation.mjs` (+ npm alias
  `picking:verify-cutover-reconciliation`), a committed read-only script
  covering the original ad hoc query's checks plus two it didn't explicitly
  assert (orphan `picking_requisition_lines`/`picking_requisition_events`,
  `problem_reported` events with no matching `picking_problem_reports`
  row). Re-ran it: numbers unchanged (4 total requisitions, all
  `v2_fixture`, 0 orphans, 1 known event/report gap from the `V2-0019` seed
  script). Updated package section 3 to cite the script instead of "deleted
  in this session."
- Finding 4 (medium, Vercel/UAT gates open): already accurately documented;
  reconfirmed, no change needed.
- Finding 5 (medium, package still uncommitted): accurate; left as-is —
  committing needs explicit user request, not assumed here.
- Updated `docs/plans/V2-0034-picking-cutover-package.md` (new section 9:
  review response), `docs/plans/index.md`, `docs/handoff/current-state.md`,
  and `docs/project-management/decision-board.md` (Recommended Next Move
  now lists 4 open items instead of 2, Near-Term Queue row 3, new Watch List
  entry for the uncommitted package).

Verification:

- `npm run lint`, `npm run typecheck` pass (new script added; no `src/`
  changes, so `build` was not re-run for this response).
- `npm run picking:verify-cutover-reconciliation` and
  `npm run picking:reference-import-dry-run` both ran clean, read-only,
  against staging.
- `git diff --check` passes (pre-existing CRLF warnings only).
- No schema/migration, staging data, V1 production files, GAS deployments,
  Sheets, URLs, LINE tokens, or secrets changed. Cutover remains **not**
  approved — this response closed evidence/process gaps, not the underlying
  approval gates (deployed verification, human UAT, fresh V1 export, and
  runbook execution are all still open, user-gated actions).

## 2026-06-22 - PR/PO/GR Source Profiling + Dry-Run Report (V2-0036, Slice 1)

Context:

- User sent `Go: ทำ V2-0036 เฉพาะ PR/PO/GR source profiling + dry-run report`,
  scoping execution to task-breakdown items 1-2 of the `V2-0036` plan only
  (no schema/migration this slice).
- Confirmed the plan's open "authoritative PR source" question by reading
  V1 backend source directly rather than assuming: `PR/Code.gs.txt`,
  `PO/Code.gs.txt`, and `GR/Code.gs.txt` (read-only references) all share one
  spreadsheet (`SPREADSHEET_ID`), with sheet tabs `PR`/`PO`/`GR`. A live `PR`
  sheet exists, but `import-data/po-pr-gr/` only has `PO.csv`/`GR.csv`/
  `ProductName.csv`/`Vendor.csv` — no PR CSV was ever exported. This is a
  missing-export problem, not a missing-source problem.
- While reading `PO/index.html`, found V1's actual bill-display grouping key,
  `poBillGroupKey()`: a non-blank, non-bare-`"DIRECT"` `Ref_PR_UID`
  (`DIRECT-<uuid>` or a real `PR_UID`) **is** the bill identity by itself;
  only the ambiguous legacy bare-`"DIRECT"` case falls back to
  `[PO_Number, Vendor, PO_Date, Warehouse].join("|")`. (A separate function,
  `PO/Code.gs.txt`'s `readCurrentLeadSamples_`, uses a different 5-field key
  for its own vendor lead-time/insights aggregation only — initially mistook
  that for the canonical bill key; corrected after re-checking `index.html`,
  and confirmed empirically the two produce identical group counts on this
  snapshot, so no report numbers changed.) Also found
  GR's lift-fee convention is not a column — it's a tagged substring inside
  `Remark` (`[ค่าลิฟท์ N รอบ จ่ายสด|เชื่อ]` current format,
  `[ค่าลิฟท์: จ่ายสด|เชื่อ]` legacy), rendered only for warehouse `W2`
  (`GR/index.html` `parseReceivingRemark`), plus a separate
  `[นอกบิล/ของแถม]` extra/free-item tag.
- Found a real schema mismatch while comparing the exported `PO.csv` header
  against `PO/Code.gs.txt`'s `setupDatabase()`: the live code documents an
  `Expected_Date` column that is **absent** from the actual CSV export
  (the export's trailing column is `PR_Number` instead). Flagged as a
  manual-review item rather than silently trusting the GAS source comment.

Changes:

- Added `docs/migration/pr-po-gr-v1-mapping.md`: full V1 source/schema
  findings above, PR->PO linkage (`approvePR` writes the real `PR_UID` as
  `Ref_PR_UID`), GR split-location convention (`Loc_IN` segments joined by
  `" | "`, warehouse = text before first `-`), a draft raw-status ->
  normalized-status table, and validation rules for any future import.
- Added `scripts/pr-po-gr-import-dry-run.mjs` (+ npm alias
  `pr-po-gr:import-dry-run`, following the existing
  `picking-reference-import-dry-run.mjs` pattern: custom CSV parser, `pg`
  read-only staging queries, Markdown report under `import-reports/`).
  Profiles `PO.csv`/`GR.csv`/`ProductName.csv`/`Vendor.csv`: row counts,
  duplicate/blank UIDs, status distributions, V1's own bill-grouping key
  (classifying/counting bare-`DIRECT` vs `DIRECT-<uuid>` vs PR-derived
  groups and surfacing the largest ambiguous bare-`DIRECT` groups), GR
  orphan `Ref_PO_UID` checks, split-location and lift-fee/extra-item Remark
  tag detection (cross-checking lift-fee rows against their joined PO
  warehouse), vendor-name and product-code/name cross-matching against
  `ProductName.csv`/`Vendor.csv`, and a DB cross-reference against staging
  `catalog_products`/`catalog_vendors`/`warehouse_warehouses`.
  - While first running it, found 77 GR date fields failing a strict
    `D/M/YYYY` parse; inspecting raw values showed two distinct, legitimate
    V1 conventions (a literal `-` "no expiry" placeholder, and pre-1980
    spreadsheet epoch-zero export artifacts from blank cells) mixed in with
    genuinely malformed strings. Added a `classifyDateField` helper so the
    report tallies these three cases separately (7 placeholder, 54
    epoch-artifact, 16 genuinely malformed) instead of one misleading
    "failures" count.
- Added the `pr-po-gr:import-dry-run` script entry to `package.json`.

Result (`import-reports/pr-po-gr-dry-run-report.md`, git-ignored, regenerate
with `npm run pr-po-gr:import-dry-run`): 750 PO rows, 1868 GR rows, 4793
ProductName rows, 173 Vendor rows; **0 blockers, 7 warnings** — no PR CSV
export; 233 bill groups (698 line rows) use the ambiguous bare-`DIRECT` key
(largest single group has 21 lines); 10 orphan GR `Ref_PO_UID`; GR dates
split into 16 malformed / 54 epoch-artifact / 7 placeholder; 5 PO SKUs
unmatched against `ProductName.csv`; 2 PO products need manual catalog
review (both also the only 2 blank-SKU rows — internally consistent). DB
cross-reference: 748/750 PO product rows matched staging `catalog_products`
by code or exact name; all 84 PO vendor names resolved to a `Vendor.csv`
code present in staging `catalog_vendors`; all PO warehouse values already
exist in staging `warehouse_warehouses`.

Updated `docs/plans/V2-0036-pr-po-gr-foundation.md` (status, resolved the PR
source open question, handoff notes), `docs/plans/index.md`,
`docs/handoff/current-state.md`, `docs/migration/module-inventory.md`, and
`docs/project-management/decision-board.md`.

Verification:

- `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- `git diff --check` passes (only pre-existing CRLF normalization warnings
  on unrelated working-copy files).
- Ran `npm run pr-po-gr:import-dry-run` twice (before and after the date
  classification fix) and read the generated report both times.
- No schema/migration, staging data, V1 production files, GAS deployments,
  Sheets, URLs, LINE tokens, or secrets changed. Task breakdown items 3-7
  (schema drafting, migration `0013`, staging apply) remain undone.
- Noted a concurrent frontend-lane session added `V2-0037` (PR frontend
  mock-up) to `docs/plans/index.md`/`docs/handoff/current-state.md` mid-task
  (same pattern as prior sessions); this slice's edits were layered on top
  rather than reverting that work.
- Archived 4 older entries (Management Executive Summary, Picking LINE
  Notification And Failure Recovery, Frontend Conductor/Gemini Instructions,
  Picking Cutover Package) into
  `docs/handoff/archive/work-log-2026-06-22-management-summary-through-cutover-package.md`
  to keep this file under its context budget after adding this entry.

## 2026-06-22 - PR Frontend Mockup (V2-0037)

Context:
- User requested PR (Purchase Requisition) module mockup next.
- Emphasized optimizing for mobile/responsive behavior while maintaining exact V1 UX parity (Requester, Warehouse list, multi-item rows, and bottom collapsible history).

Changes:
- Added `docs/plans/V2-0037-pr-frontend-mockup.md`.
- Added `docs/mockups/pr-ui-ux-mockup.html`:
  - Static HTML/CSS mock-up showing a multi-row requisition form with custom +/- quantity adjustments, catalog autocomplete, and interactive badges distinguishing `Matched` vs `Free-Text` inputs.
  - Interactive role switcher to preview views and gated actions for REQUESTER, SUPERVISOR, and PURCHASING OFFICER.
  - Interactive Supervisor action buttons (Approve/Reject) on pending history items, including a modal to specify a rejection reason.
  - Interactive Purchasing Officer "Mark ordered" button advancing approved items to "ซื้อให้แล้ว".
  - Interactive layout simulator (MOBILE 390px vs DESKTOP).
  - High-fidelity LINE Flex Message previewer displaying the notification template for submitted PRs.
  - Live data model stored in localStorage so submissions, approvals, rejections, and orders update the mockup state dynamically.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` to register `V2-0037`.

Verification:
- Opened `pr-ui-ux-mockup.html` in the local browser and verified that:
  - Adding and removing items works dynamically.
  - Products from autocomplete pre-populate unit values and trigger `Matched` badges, while custom texts show `Free-Text` warning badges.
  - Submitting forms correctly allocates a new PR number, updates history, triggers a toast notification, and displays the LINE Flex message preview.
  - Switching roles to Supervisor enables the "อนุมัติ" and "ปฏิเสธ" (with comment modal) actions on pending history items, and updates the timeline progress bar.
  - Switching roles to Purchasing Officer enables "ทำรายการซื้อแล้ว" on approved items.
  - Views scale responsively down to 390px width with zero horizontal scrollbars.
- No Next.js runtime code or database schema changed.
- `git diff --check` passed.

## 2026-06-22 - GR Frontend Mockup Update (V2-0035)

Context:
- User provided feedback that the mockup looked different from V1 and requested strict UX parity, especially for the 14-day calendar, vendor viewing inside calendar cells, and warehouse filters.

Changes:
- Updated `docs/mockups/gr-ui-ux-mockup.html`:
  - Replaced the hardcoded calendar view with a dynamically generated 14-day calendar grid in Javascript, displaying weekdays, dates, day counts, and individual vendor pills (confirmed in red, estimated in blue) inside each cell matching V1 exactly.
  - Replaced the warehouse filter dropdown with dynamic warehouse filter chips showing the pending bill count per warehouse (All, W1-W5, C1, C2).
  - Dynamically rendered PO cards from a central JS database to support clean, synchronous filtering by calendar day, warehouse chips, and search text.
  - Implemented dynamic status-gated action buttons (Draft GR, Pending Review, GR Completed, Recall, Reset) that toggle visibility based on user role (ADMIN vs OPERATOR) and PO status, with automated input field lockouts.
- Updated `docs/plans/V2-0035-gr-frontend-mockup.md` to reflect V1 parity feedback.

Verification:
- Opened the mock-up locally and verified dynamic calendar rendering, vendor pills list, warehouse count chips, search bar, role-based action buttons, and inputs locking.
- No Next.js runtime code or database schema changed.
- `git diff --check` passed.

## 2026-06-22 - PR/PO/GR Foundation Plan (V2-0036)

Context:
- User requested `Architect: ทำ PR/PO/GR foundation`.
- This is a planning-only command. No runtime code, Supabase schema, staging
  data, V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets were changed.
- Read the compact conductor state, target architecture, migration plan,
  module inventory, full parity timeline, frontend roadmap, PO/GR mock-up
  plans, database strategy, product-catalog mapping, V1 development context,
  and V1 PR/PO/GR frontend references.

Changes:
- Added `docs/plans/V2-0036-pr-po-gr-foundation.md`.
- Updated `docs/plans/index.md`, `docs/handoff/current-state.md`, and
  `docs/project-management/decision-board.md`.
- The plan scopes the next implementation slice as PR/PO/GR source profiling
  plus a dry-run report before schema or UI work.
- Key planning assumptions: preserve stable Direct PO identity
  (`DIRECT-<uuid>`), keep legacy `DIRECT` fallback labelled as legacy-only,
  confirm the authoritative PR source because current snapshots include
  PO/GR/ProductName/Vendor but no dedicated PR CSV, and design grouped
  `public.purchasing_*` / `public.receiving_*` tables with explicit grants,
  RLS, and server-only write boundaries.

Verification:
- Documentation-only verification passed: `git diff --check` printed only
  existing CRLF normalization warnings for unrelated working-copy files.

## 2026-06-22 - GR Frontend UI/UX Mock-up (V2-0035)

Context:
- User requested jumping to GR (Goods Receiving) mockup next.
- Emphasized optimizing heavily for mobile, as warehouse staff will use this module on mobile phones in the warehouse daily.

Changes:
- Added `docs/mockups/gr-ui-ux-mockup.html`:
  - Mobile-first interactive mock-up (default-rendered as a smartphone viewport frame on desktop, responsive for real mobile screens).
  - 14-day swiper date calendar at the top.
  - Warehouse quick-filter chips (All, W1, W2, W5, C1).
  - Glove-friendly +/- step count controllers (target size >= 48px).
  - Location selection bottom sheet (structured warehouse + floor + custom zone).
  - Split storage bottom sheet (V1 `toggleItemSplit` mobile adaptation).
  - Remark and Lift Fee options (Payment mode + Rounds).
  - LINE Flex message previewer rendering the actual receiving layout.
  - Role-gated Recall / Reset button (only usable by ADMIN or SUPERVISOR).
- Created `docs/plans/V2-0035-gr-frontend-mockup.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` to reference the mockup and plan.

Verification:
- Opened the mock-up locally and verified mobile ergonomics, +/- button handlers, bottom sheet slide drawer transitions, and role-based gating logic.
- No Next.js runtime code or database schema changed.
- `git diff --check` passed.
