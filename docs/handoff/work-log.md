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
- `docs/handoff/archive/work-log-2026-06-23-app-flow-diagrams-through-foundation-closeout-sync.md`
- `docs/handoff/archive/work-log-2026-06-24-pr-derived-decision-through-import-slice-plan.md`

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

## 2026-06-24 - PR/PO/GR Read-Only UI Slice Planned And Executed (V2-0047)

Context:

- User chose the next slice after `V2-0044`/`V2-0045`/`V2-0046`: "Read-only
  /purchasing//receiving list/detail UI — not gated by V2-0046." No `Go:`
  prefix was given initially, and this is a new-module UI surface (no
  existing read-model or routes for purchasing/receiving), matching the
  repo's established pattern of an Architect-equivalent plan first (same as
  `V2-0036`/`V2-0044`), not a bare-`Go` inline plan (reserved for small
  extensions of already-proven code, e.g. `V2-0023`/`V2-0025`). Confirmed via
  advisor consult before drafting. The user then sent `Go: to execute task
  breakdown items 1-9`, so the plan was implemented in the same session.

Plan (`docs/plans/V2-0047-pr-po-gr-readonly-ui.md`):

- Permission-gated `/purchasing` + `/purchasing/[id]` (PO list/detail) and
  `/receiving` + `/receiving/[id]` (GR list/detail + `receiving_line_splits`),
  reading the real rows `V2-0044` already imported (253 PO headers/748
  lines, 588 GR headers/1868 lines/6 splits). Mirrors `V2-0019`'s
  read-only-first pattern exactly: own `read-model.ts`/`format.ts` per
  module, normal authenticated client (RLS in the verification path, not
  `createAdminClient()`), no writes.
- PR list/detail stays explicitly out of scope (0 imported PR rows).
- ADR `0026`'s legacy `po_number` display rule and orphan-safe GR rendering
  were both planned up front.
- Flagged a real gap to fix during execution: the shared `ModuleLandingPage`
  guard checks only the single `app.requiredPermission` value
  (`purchasing.read`/`receiving.read`), but the real V1 import (`V2-0009`)
  only granted `.write` variants — no role holds `.read`. Planned fix:
  `anyOf: [".read", ".write"]` at the page level, mirroring
  `src/app/picking/page.tsx`.

Implementation:

- Added `src/modules/purchasing/{read-model,format}.ts` and
  `src/modules/receiving/{read-model,format}.ts`; replaced `ModuleLandingPage`
  on `/purchasing`/`/receiving` with the guarded list pages and added
  `/purchasing/[id]`/`/receiving/[id]` detail pages.
- Removed the now-dead `purchasing`/`receiving` entries from `moduleNotes` in
  `src/modules/core/module-landing-page.tsx`; updated
  `src/modules/purchasing/README.md`, `src/modules/receiving/README.md`, and
  `src/modules/README.md`'s status table.
- Querying real role grants (read-only) found the `.read`/`.write` gap was
  narrower than the plan assumed: `SUPERVISOR` holds both
  `purchasing.write`+`receiving.write` (no `.read`), but `WAREHOUSE` holds
  only `receiving.write`, not `purchasing.write` — not "all of
  ADMIN/SUPERVISOR/AKRA/WAREHOUSE hold both" as the plan's gap note assumed.

Verification:

- `lint`, `typecheck`, `build`, `git diff --check` all pass.
- Browser-verified end to end (not just direct DB calls) with a temporary
  local Playwright install (removed after). Two auto-mode classifier blocks
  occurred while preparing this: an ad-hoc password reset on a real
  V1-imported user's account (blocked — touches a real identity without it
  being named) and an ad-hoc password reset on existing synthetic accounts
  that bypassed the repo's `--confirm-flag`/project-ref-check convention for
  auth/DB writes (blocked — wrong pattern). Resolved both by using the
  already-committed, already-precedented `scripts/create-test-account.mjs`
  to create 4 new synthetic `v2047-*@akra-v2.test` accounts
  (`ADMIN`/`GUEST`/`WAREHOUSE`/`SUPERVISOR`) instead of touching any existing
  account; all 4 deleted via the service-role Admin API after verification.
- Confirmed: signed-out and `GUEST` denied on both `/purchasing` and
  `/receiving`; the synthetic `SUPERVISOR` account (`.write`-only, no
  `.read`) **allowed** on both list and detail — the `anyOf` fix proven, not
  just code-reviewed; `ADMIN` allowed on both. Against real imported rows: a
  `LEGACY-`-prefixed PO renders the ADR-`0026` synthesized-identifier
  caption; the ADR-`0022` PR-derived PO renders its manual-review note; an
  orphan GR (`purchase_order_id is null`) renders the "no linked PO (orphan
  import row)" note. Zero horizontal overflow at 390px on all 4 routes; zero
  browser console errors.
- No schema, migration, or staging *business* data changed — only the 4
  synthetic test-fixture auth accounts, created and deleted within this
  session. No V1 production files, GAS deployments, Sheets, URLs, LINE
  tokens, or secrets changed.
- Updated `docs/plans/index.md` (entry 39, now Complete),
  `docs/handoff/current-state.md` (status paragraph, Next Actions item 19).

Next action: none for this slice. Next PR/PO/GR step is `V2-0046` tasks 1-5
(operational readiness, before any write workflow) or a real PR import once
a non-empty PR export exists. Carried forward (untouched by this slice): the
working tree still has uncommitted `V2-0044`/`V2-0045`/`V2-0046` changes plus
an unexplained untracked `"WEBAPP V2/"` directory at the repo root.

## 2026-06-24 - PR/PO/GR Staging Import Executed (V2-0044, ADR 0023/0026)

Context:

- User confirmed ADR `0023` (full-snapshot import) and said to go ahead
  with import/read-only validation now; explicitly deferred any PR/PO/GR
  **write** workflow to wait on `V2-0046` tasks 1-5 (already covered by ADR
  `0025`'s gate — that gate does not block this read-only import slice).

Changes:

- Accepted ADR `0023` (was Proposed); updated `docs/plans/index.md` and
  `docs/project-management/decision-board.md` Open->Resolved Decisions.
- Added migration `0014_pr_po_gr_import_events.sql`: widens
  `purchasing_events_type_check`/`receiving_events_type_check` to add
  `pr_imported`/`po_imported`/`gr_imported` (the locked `0013` lists only
  covered future write-workflow actions, not an import audit trail).
  Applied and verified on staging (`check:migrations`,
  `db:verify-staging-schema`: 36 tables, 34 policies) before the import ran.
- Added `scripts/lib/pr-po-gr-parsing.mjs`: extracted
  `parseCSV`/`toNameKey`/`parseV1Date`/`classifyDateField`/`billGroupKey`/
  `classifyRefPrUid`/lift-fee regexes/`readDatabaseUrl` out of
  `pr-po-gr-import-dry-run.mjs`, plus new `toISODate`,
  `dateFieldToParseStatus`, and `mapBillIdentityKind` helpers. Refactored
  the dry-run script to import from it and re-ran it — the regenerated
  report was byte-identical to the pre-refactor baseline (only the
  timestamp line differed), proving the extraction changed nothing.
- Added `scripts/pr-po-gr-import-apply.mjs`: gated on
  `--confirm-pr-po-gr-import` + staging project-ref check; builds an
  in-memory plan (PR/PO/GR groups + resolved catalog/vendor/warehouse
  links) that is identical whether previewing or writing; preview mode
  (no flag) writes `import-reports/pr-po-gr-import-preview-report.md` with
  no DB writes; `--confirm` mode runs the same plan inside one
  `begin -> truncate (all 9 tables, cascade) -> insert -> commit`
  transaction and writes `pr-po-gr-import-apply-report.md`.
- Added `scripts/verify-pr-po-gr-import.mjs`: 16 read-only checks (row/
  header/event counts against the proven plan numbers, ADR-`0022` row
  content, live anon Data API denial, and a non-ADMIN
  `purchasing.*`/`receiving.*` permission holder reading real rows via the
  actual RLS policy — impersonated through the `request.jwt.claims` GUC
  inside a transaction that always rolls back, no password reset).
- Added `package.json` aliases `pr-po-gr:import-apply` /
  `pr-po-gr:verify-import`.
- Added ADR `0026` (Accepted): synthesizes `po_number = "LEGACY-" + <bill
  identity>` for the 251/253 imported PO headers whose V1 source
  `PO_Number` was blank (746/750 PO rows blank, only 3/254 bill groups had
  any real value at all — a real gap the dry-run report never checked,
  since `po_number` is `not null`/not-blank in the locked schema).

Real gaps found and resolved during implementation (the dry-run report
only ever validated blank SKU/Product/date parsing, never qty/unit/
po_number against the actual schema constraints):

- 2 PO rows have `PO_Qty = "0"` (`ordered_qty > 0` is a real check) — skipped
  as invalid, logged in the apply report, not inserted. This collapsed
  254->253 bill groups and explains the 14-vs-dry-run's-10 orphan GR count
  (10 genuinely-absent `Ref_PO_UID` + 4 GR rows referencing these 2
  real-but-skipped `PO_UID`s — traced, not a silent drop).
- 46 PO / 105 GR blank-`Unit` rows: fallback chain (raw -> matched
  `catalog_products.default_unit` -> literal `"ลัง"`, mirroring
  `product-catalog-import-apply.mjs`'s existing precedent).
- 181 GR blank-`GR_Qty` rows (all `Draft GR`): imported as `received_qty = 0`.
- GR header grouping is new logic (the dry-run only ever counted GR rows,
  never grouped them into headers): grouped by resolved PO bill identity
  (or raw `Ref_PO_UID` for orphans) + date/ATA/receiver/status/remark per
  ADR `0020`. Sanity-checked by hand (largest group 49 lines; a lift-fee
  group correctly aggregates into `lift_fee_summary`; an orphan group
  preserves the raw ref with `purchase_order_id = null`) and proven
  re-run-stable (588 headers, both runs).
- GR `Status = "Pending GR"` (1 of 1868 rows) doesn't match any of the
  schema's 3 values directly; inspection showed it already carries a real
  qty/location, so it normalizes to `gr_pending_review` — a documented
  one-row judgment call. `normalizeGrStatus`/`normalizePrStatus` throw on
  any unmapped status string so a future export with new text fails loudly.
- PR import loop is implemented (mirrors the PO pattern exactly: group by
  `PR_Number`, same resolution/validation) but unproven against real data —
  the current PR source has 0 rows. Same "typed but unproven" posture as
  `V2-0027`'s LINE real-send branch.

Result: ran the real `--confirm` import, then re-ran it a second time
(idempotent truncate-then-reload — identical plan counts and identical
applied counts both times: **253 PO headers/748 lines, 588 GR
headers/1868 lines/6 splits, 0 PR headers/lines**). Verified after each run:
16/16 checks pass both times.

Verification:

- `npm run lint`, `npm run typecheck`, `npm run check:migrations`,
  `npm run db:verify-staging-schema` all pass after the import.
- `node scripts/pr-po-gr-import-apply.mjs` (preview) then
  `--confirm-pr-po-gr-import` (real write) then preview-shape re-run again
  with `--confirm` (idempotency proof) then
  `node scripts/verify-pr-po-gr-import.mjs` (16/16 pass) run twice.
- Two advisor consults: before writing code (confirmed the approach, flagged
  the constraint-validation/GR-grouping/truncate-ordering risks that were
  then addressed) and after the writes landed (confirmed the import is
  genuinely verified, caught that events were never explicitly checked —
  added 3 more checks — and that the PR-loop honesty gap needed fixing
  before declaring done, which was fixed before this entry was written).
- No V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets changed. No runtime `/purchasing`/`/receiving` UI added.

Next action: per ADR `0025`/`V2-0046`, a future PR/PO/GR **write** workflow
must wait for the operational-readiness package (`V2-0046` tasks 1-5) — this
slice was read-only import/validation, which that gate explicitly allows. A
read-only PR/PO/GR list/detail UI slice is otherwise unblocked. Two plan
slices (`V2-0045`, this one) were still uncommitted locally at the start of
this session alongside `V2-0046`/ADR `0025`/ADR `0026` from this one — not
committed/pushed unless the user asks.

## 2026-06-24 - Operational Readiness Plan Before PR/PO/GR Writes (V2-0046)

Context:

- User asked for an `Architect:` plan for Operational Readiness covering
  Environment Matrix, Monitoring, Backup/DR, and Rollback before PR/PO/GR write
  workflow.
- Scope was kept plan-only: no runtime app code, Supabase migration/schema,
  staging data, deployment settings, V1 production system, or secret changes.

Changes:

- Added
  `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`.
  The plan defines the readiness package that must exist before transactional
  PR/PO/GR writes: environment matrix, monitoring/observability plan,
  backup/DR plan, rollback runbook, and readiness gate checklist.
- Added accepted ADR
  `docs/decisions/0025-operational-readiness-gate-before-pr-po-gr-writes.md`.
  The decision does not block `V2-0044` staging import/read-only validation,
  but it blocks PR/PO/GR transactional write workflow until the readiness
  package is approved. Production cutover requires implemented and verified
  readiness checks.
- Updated `docs/plans/index.md`, `docs/project-management/decision-board.md`,
  `docs/handoff/current-state.md`, and Obsidian docs maps/dashboard so
  V2-0046 is visible in the central resume chain.

Verification:

- Official Supabase operational docs were checked read-only on 2026-06-24:
  database backups/PITR, telemetry logs, telemetry reports, and database
  advisors. The plan accounts for plan-dependent backup retention, PITR as an
  add-on, restore downtime, and Supabase Logs/Reports/Advisors as monitoring
  inputs.
- Documentation/ADR-only; no runtime app code, migration SQL, staging data, V1
  production files, GAS deployments, Sheets, URLs, LINE tokens, deployment
  settings, or secrets changed.
- `git diff --check` passes.

Next action: confirm ADR `0023` import scope if proceeding with `V2-0044`.
Before PR/PO/GR transactional writes, execute `V2-0046` tasks 1-5 to create
and approve the operational readiness docs.

## 2026-06-24 - Schema/Master/Folder Hardening (V2-0045)

Context:

- User asked whether Database Schema, Master data design, and Folder Structure
  needed improvement, then asked to handle the improvements. Scope was kept to
  documentation and folder-boundary hardening only: no runtime behavior,
  migration SQL, staging data, V1 production system, or secret changes.

Changes:

- Added `docs/database/schema-catalog.md`: a human-readable catalog of the
  current `0001`-`0013` migration shape, table families, RLS/access posture,
  staging baseline, known gaps, and PR/PO/GR import status.
- Added `docs/migration/master-data-vocabulary.md`: standard vocabulary for
  `source_app`, `source_file`, `legacy_source`, raw fields, nullable FKs,
  `match_status`, canonical-vs-alias rules, PR/PO/GR import handling, and
  module/script folder boundaries.
- Added accepted ADR
  `docs/decisions/0024-master-data-vocabulary-and-folder-boundaries.md`:
  `source_app` stays a legacy source-family field (e.g. `po-pr-gr`), module
  visibility stays in `catalog_product_scopes`, and shared import helpers
  should live under `scripts/lib`.
- Added `docs/plans/V2-0045-schema-master-folder-hardening.md` and updated
  docs maps/dashboard plus `docs/project-management/decision-board.md`.
- Updated `docs/migration/product-catalog-v1-mapping.md`,
  `docs/migration/pr-po-gr-v1-mapping.md`, and
  `docs/migration/database-strategy.md` to point to the vocabulary doc and
  avoid confusing `source_app` with module names.
- Updated `src/modules/README.md` and added README-only tracked boundaries for
  future modules: `src/modules/purchasing`, `receiving`, `warehouse`,
  `returns`, and `kpi`.
- Added `scripts/lib/README.md` so future dry-run/apply/verify shared helpers
  have a defined boundary before `V2-0044` implementation.

Verification:

- Official Supabase changelog/docs were checked read-only on 2026-06-24. The
  relevant guidance remains explicit grants + RLS for Data API access; new
  public tables are not automatically safe/exposed without the correct grants
  and policies.
- Documentation/README-only; no runtime app code, migration SQL, staging data,
  V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.
- `git diff --check` passes.
- `npm run check:migrations` passes.
- `npm run check:notes` was attempted but this repo has no such package
  script; no notes-specific checker is currently available.

Next action: still confirm ADR `0023` import scope (recommended full snapshot),
then execute `V2-0044`.

See `docs/handoff/archive/work-log-2026-06-24-pr-derived-decision-through-import-slice-plan.md`
for the `V2-0040` ADR `0022` decision entry and the `V2-0044` planning entry
(both 2026-06-24, archived to stay under the context budget).
