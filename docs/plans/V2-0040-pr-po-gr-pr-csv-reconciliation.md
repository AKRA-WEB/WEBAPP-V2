# Plan V2-0040: PR/PO/GR Fresh PR CSV Reconciliation

Status: Draft

Architect command:

```text
โอเคงั้นมาวางแผนกัน เริ่มเลย ยังไงว่ามา
```

## 1. Goal

- Primary objective: define the next executable PR/PO/GR slice after accepting
  grouped release shape: obtain a fresh PR CSV export and produce a repeatable
  PR -> PO -> GR reconciliation dry-run report.
- Success definition: after the future `Go:` slice, the repo can prove whether
  current V1 PR rows link cleanly to PO rows and whether PO rows link cleanly to
  GR rows, without writing to staging or V1.
- User/business reason: runtime UI and data import should not start until the
  team knows exactly which PR, PO, and GR records line up and which records need
  manual handling.

## 2. Requirement And Scope Definition

### Problem

- `V2-0036` created and verified the PR/PO/GR schema foundation in staging.
- `V2-0039`/ADR `0021` accepts grouped PR/PO/GR operational release as the
  default.
- The blocking gap is now data proof: the live V1 `PR` sheet exists, but no
  PR CSV snapshot exists in `import-data/po-pr-gr/`.

### Users

- Primary users: requesters, purchasing officers, and receiving staff.
- Secondary users: supervisors and accounting/APV reviewers.
- Admin/support users: migration owner and anyone responsible for cutover
  evidence.

### MVP Features

- Accept a fresh PR CSV export in `import-data/po-pr-gr/`.
- Extend or rerun PR/PO/GR dry-run profiling to include PR rows.
- Reconcile PR -> PO through `PO.Ref_PR_UID`.
- Reconcile PO -> GR through `GR.Ref_PO_UID`.
- Produce a report with blockers, warnings, and manual-review lists.
- Keep the slice read-only: no staging writes, no runtime UI, no V1 changes.

### Nice-To-Have Features

- Fresh same-timestamp exports for PO, GR, ProductName, and Vendor.
- Export freshness metadata from the user: export date/time and who exported.
- CSV schema comparison against V1 `setupDatabase()` headers.
- Suggested manual-review CSV outputs for orphan/unmatched rows.

### Out Of Scope

- Importing PR/PO/GR rows into staging.
- Building Next.js PR/PO/GR runtime pages.
- Implementing PR/PO/GR write actions or transaction RPCs.
- Changing V1 production apps, GAS deployments, Sheet schemas, URLs, LINE
  tokens, or GitHub Pages deployments.
- Declaring PR/PO/GR cutover-ready.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: no frontend changes in this slice.
- Backend/server boundary: no server actions or API routes in this slice.
- Database: read-only checks may query existing staging shared catalog/vendor/
  warehouse tables; no writes.
- Auth/permissions: no permission changes.
- Deployment: no Vercel dependency.

### Data Model / Schema

No schema change.

Expected input files:

- Required:
  - `import-data/po-pr-gr/Trackingpo - webapp - PR.csv` or equivalent PR export
    path documented in the dry-run report.
- Existing/fresh companion files:
  - `Trackingpo - webapp - PO.csv`
  - `Trackingpo - webapp - GR.csv`
  - `Trackingpo - webapp - ProductName.csv`
  - `Trackingpo - webapp - Vendor.csv`

Expected PR columns from V1 source:

```text
PR_UID, PR_Date, PR_Number, Requester, Warehouse, SKU, Product, Request_Qty,
Unit, Remark, Status, Approver_Remark
```

Reconciliation rules:

- PR rows require non-empty unique `PR_UID`.
- PO rows with real PR-derived `Ref_PR_UID` should match a PR `PR_UID`.
- PO rows with `Ref_PR_UID = "DIRECT"` or `DIRECT-<uuid>` are Direct PO rows
  and should not require a PR match.
- GR rows should match PO lines through `GR.Ref_PO_UID = PO.PO_UID`.
- Legacy orphan rows stay warnings/manual-review unless they prevent grouped
  import correctness.
- Raw fields remain authoritative for audit; normalized status is only a
  derived mapping until import.

### Integration Points

- V1 references:
  - live V1 `PR` sheet export is a user/Sheet-access action, not performed by
    this repo.
  - V1 source files are reference-only.
- Supabase:
  - read-only catalog/vendor/warehouse cross-checks only.
- Vercel:
  - none.
- LINE/GAS/Sheets/API:
  - no GAS deploy, no Sheet mutation, no LINE sends.
- Secrets/env vars:
  - no new secrets; staging read-only DB checks use existing local env process
    values if needed.

## 4. UI/UX And User Flow

### User Flow

1. User exports the live V1 `PR` sheet as CSV and places it under
   `import-data/po-pr-gr/`.
2. Agent runs the dry-run reconciliation.
3. Agent reports blockers/warnings and updates migration docs.
4. User decides whether to proceed to staging import planning.

### Screens / States

- Screen: none.
- Empty state: PR CSV missing; report should fail or warn with a clear next
  action.
- Loading state: command-line script progress only.
- Error state: blockers listed in Markdown report.
- Permission-denied state: not applicable.
- Mobile behavior: not applicable.

### System Logic / Pseudocode

```text
load PR/PO/GR/ProductName/Vendor CSV snapshots
validate headers and row counts
validate PR_UID/PO_UID/GR_UID uniqueness
classify PR statuses
classify PO Ref_PR_UID:
  real PR UID -> expect PR match
  DIRECT-<uuid> -> stable direct
  DIRECT -> legacy ambiguous direct
  blank/other -> warning/manual review
reconcile PR -> PO coverage
reconcile PO line -> GR coverage
cross-check product/vendor/warehouse references
emit blockers, warnings, and manual-review detail
write Markdown report under import-reports/
```

## 5. Task Breakdown

1. Collect inputs.
   - User exports fresh PR CSV from the live V1 `PR` sheet.
   - Prefer refreshing PO/GR/ProductName/Vendor at the same time, but PR is the
     hard blocker.

2. Confirm snapshot inventory.
   - List exact filenames and modified timestamps.
   - Confirm no V1 production files or Sheets were modified by the repo.

3. Extend the dry-run profiler.
   - Parse PR CSV when present.
   - Keep current no-PR behavior as an explicit blocker/warning when absent.
   - Add robust header alias handling only if the fresh export differs.

4. Add reconciliation sections.
   - PR row counts, duplicate/blank PR_UID, status distribution.
   - PR -> PO match coverage.
   - PO direct stable vs legacy direct grouping.
   - PO -> GR line coverage and orphan `Ref_PO_UID` rows.
   - Product/vendor/warehouse cross-checks.

5. Generate and inspect the report.
   - Update `import-reports/pr-po-gr-dry-run-report.md` (git-ignored).
   - Record summary numbers in migration docs and handoff.

6. Close out planning docs.
   - Update `docs/migration/pr-po-gr-v1-mapping.md`,
     `docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`,
     `docs/plans/index.md`, `docs/handoff/current-state.md`,
     `docs/handoff/work-log.md`, and
     `docs/project-management/decision-board.md`.

## 6. Files Expected To Change

Future `Go:` implementation is expected to change:

- `scripts/pr-po-gr-import-dry-run.mjs`
- `package.json` only if a new script alias is needed
- `docs/migration/pr-po-gr-v1-mapping.md`
- `docs/plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/project-management/decision-board.md`

Expected user-provided or local input:

- `import-data/po-pr-gr/*PR*.csv`
- optionally refreshed `PO.csv`, `GR.csv`, `ProductName.csv`, `Vendor.csv`

## 7. Verification Steps

- `npm run pr-po-gr:import-dry-run`
- `npm run lint`
- `npm run typecheck`
- `git diff --check`
- Inspect the generated Markdown report for blockers/warnings.
- Confirm no staging writes, runtime code, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 8. Rollback / No-Production-Impact Note

This plan is documentation-only. The future implementation is read-only dry-run
work. It must not mutate V1 or staging data. Rollback is deleting or replacing
the local CSV snapshot/report and reverting script/doc changes.

## 9. Open Questions

- Can the user provide a fresh PR CSV export?
- Should PO/GR/ProductName/Vendor be refreshed in the same export batch?
- Should the first import later target all historical rows or active/open rows
  first?
- What blocker threshold should stop the next import-planning slice?

## 10. Handoff Notes

- Next action after this plan: provide/export the fresh PR CSV, then run
  `Go: execute V2-0040 PR CSV reconciliation dry-run`.
- Blockers: fresh PR CSV is required.
- Related plans: `V2-0036`, `V2-0039`.
- Related ADRs: `0020`, `0021`.
