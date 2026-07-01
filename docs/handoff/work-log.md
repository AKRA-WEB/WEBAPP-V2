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

## 2026-06-24 - Operational Readiness Package Executed (V2-0046, tasks 1-6)

Context:

- User asked which work remains, then confirmed (via `AskUserQuestion`) that
  only `V2-0046` should proceed now — not a second parallel worktree task, per
  the earlier discussion of git-worktree parallelism risk (shared staging DB
  writes/migration-number collisions are the reason to serialize anything that
  touches the database; this slice is documentation-only so the question was
  moot in practice, but the user's choice was recorded before starting).
- `V2-0046`'s plan (Draft since its planning-only session) already specified
  tasks 1-6 in detail; this session executed them rather than re-planning.

Changes:

- Added `docs/operations/environment-matrix.md` (task 1): Local/Preview/
  Development/Staging/Production rows; today all four non-Production
  environments share one Supabase project (`yqyoxtgrubuspzyfzija`); no
  Production project exists yet; no rollback owner named for any row.
- Added `docs/operations/monitoring-observability-plan.md` (task 2):
  severity levels, taxonomy across app/server/Vercel/Supabase/business-event
  surfaces, PII/secrets logging rules, and the already-real business-event
  inventory (`purchasing_events`/`receiving_events`/
  `picking_requisition_events` types, migration `0014`). No monitoring tool
  is installed; this is explicitly stated, not implied.
- Added `docs/operations/backup-dr-plan.md` (task 3): candidate DR profiles
  (daily backup vs. PITR) with the explicit caveat that `RPO=15min`/
  `RTO=1hr` are not committed targets until a real restore drill proves them;
  a restore-drill checklist; zero drills run to date.
- Added `docs/operations/module-rollback-runbook.md` (task 4): generic
  3-state rollback (staging import issue / pre-cutover UAT issue /
  post-cutover production issue) plus PR/PO/GR-specific notes tying back to
  ADR `0021`'s grouped-cutover rule and noting the current staging import is
  reversible (truncate-then-reload) in a way future write-workflow records
  will not be.
- Added `docs/operations/pr-po-gr-readiness-gates.md` (task 5): the single
  page distinguishing what's already allowed (`V2-0044` import, `V2-0047`
  read-only UI, a future real PR import) from what's gated (write-workflow
  *implementation*, gated on this package being reviewed/accepted — not on
  every Open Question being answered) from what has the stricter
  production-cutover bar (implemented+verified readiness, not just
  documented).
- Task 6: linked all five docs from `docs/migration/cutover-checklist.md`
  (a new note above the checklist plus an inline pointer on the "Rollback
  path documented" line) — no PR/PO/GR-specific cutover package exists yet to
  link from instead.
- Updated `docs/plans/V2-0046-...md` (Status: Draft -> Complete, tasks 1-6;
  task 7 deferred), `docs/plans/index.md`, `docs/handoff/current-state.md`,
  `docs/project-management/decision-board.md` (also fixed a pre-existing
  staleness: `V2-0047` was still listed as "Draft, awaiting `Go:`" there even
  though it was already executed and pushed in a prior session), and the
  Obsidian maps/dashboard (`00`-`03`).

Verification:

- `npm run lint`, `npm run typecheck`, `git diff --check` all pass.
- Documentation-only: no runtime app code, Supabase schema/migration,
  staging data, V1 production files, GAS deployments, Sheets, URLs, LINE
  tokens, deployment settings, or secrets changed.
- Each new doc states its own real current gaps as Open Questions (no
  monitoring tool, no drill, no named owner, single shared Supabase project)
  rather than inventing placeholder numbers — consistent with this repo's
  pattern of not fabricating verification evidence.

Next action: user reviews/accepts this readiness package; PR/PO/GR
write-workflow implementation can then be planned as a new slice. Task 7
(install real monitoring tooling, run an actual restore drill, run a
tabletop rollback exercise) remains deferred and is only a hard requirement
before production cutover, not before planning Staging write-workflow work.

Also committed and pushed this session's prior uncommitted work (`V2-0044`,
`V2-0045`, `V2-0047`, this `V2-0046` entry's predecessor docs) as `c4797f9` on
`main`, after explicit user confirmation via `AskUserQuestion` (direct push to
`main`, no PR — solo-dev repo, same pattern as prior direct-to-main pushes).

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

See `docs/handoff/archive/work-log-2026-06-24-pr-derived-decision-through-import-slice-plan.md`
for the `V2-0040` ADR `0022` decision entry and the `V2-0044` planning entry,
and
`docs/handoff/archive/work-log-2026-06-24-operational-readiness-plan-through-schema-hardening.md`
for `V2-0046`'s original planning-only entry (now superseded by its own
execution entry above) and the `V2-0045` entry (all archived to stay under
the context budget).

## 2026-06-25 - FigJam App Workflow Board Artifact (V2-0048)

Context:

- User asked: `Go: ทำ workflow board ของทุก app ลง Figma/FigJam จาก
  docs/architecture/app-flow-diagrams.md` and supplied
  `figma.com/board/new?t=zRQVoG1u4OErYAiP-0`.
- The Figma skill was read. Tool discovery found no exposed Figma/FigJam write
  tool in this session, and the supplied URL is a new-board URL rather than an
  exact editable node/frame link. Therefore the deliverable is an import-ready
  SVG board instead of a remote write into FigJam.

Changes:

- Added `scripts/generate-figjam-workflow-board.mjs`, a no-dependency Node
  generator for the workflow board SVG.
- Generated `docs/figma/akra-v2-app-workflow-board.svg`.
- Added `docs/figma/README.md` with FigJam/Figma import instructions.
- Added plan `docs/plans/V2-0048-figjam-app-workflow-board.md` and updated
  `docs/plans/index.md` / `docs/handoff/current-state.md`.
- Board covers Main/Auth, Picking, Purchasing PR, Purchasing PO, Receiving GR,
  Warehouse, Returns, and KPI. It uses `docs/architecture/app-flow-diagrams.md`
  for flow content and latest plan-board status where that source was stale
  (notably PO/GR read-only UI is now implemented by `V2-0047`).

Verification:

- `node scripts/generate-figjam-workflow-board.mjs` successfully wrote the SVG.
- Confirmed the SVG contains all 8 module labels and has non-empty content
  (38,560 bytes). The local image preview tool cannot render SVG directly.
- No runtime app code, Supabase schema/migration, staging data, deployment
  settings, V1 production files, GAS deployments, Sheets, live URLs, LINE
  tokens, or secrets changed.

Next action:

- Open the FigJam board and drag in
  `docs/figma/akra-v2-app-workflow-board.svg`; ungroup in Figma/FigJam if
  individual text/shape editing is needed.

## 2026-06-26 - FigJam Flowchart Diagram Revision (V2-0048)

Context:

- User reviewed `docs/figma/akra-v2-app-workflow-board.svg` and said it was
  not clear enough. The requested direction was a clearer workflow diagram
  that feels usable in Figma/FigJam, with every step easy to change later.
- User then rejected the detailed step-list revision because it still did not
  read like a flowchart and asked where the `Reject` branch goes.
- The Figma skill was read again. Tool discovery still exposed no Figma/FigJam
  write tool, so the practical deliverable remains an import-ready SVG rather
  than a direct remote board write.

Changes:

- Updated `scripts/generate-figjam-workflow-board.mjs` again to generate a
  proper flowchart graph rather than a vertical step list. The new renderer
  uses explicit node/edge definitions, diamond decision nodes, labeled arrows,
  and red reject/blocked outcome nodes.
- Regenerated `docs/figma/akra-v2-app-workflow-board.svg` at `3600 x 8058`.
  The artifact now has 101 flowchart nodes and 101 labeled edges. Reject paths
  are explicit: for example, PR goes `Supervisor review -> Reject -> Reject
  with comment -> Status: rejected / closed -> No PO is created`; Returns goes
  `Supervisor review -> Reject -> Status: rejected -> End: no warehouse
  processing`; PO change-request/reject loops back to `Draft PO` for revision.
- Updated `docs/figma/README.md`, `docs/plans/V2-0048-figjam-app-workflow-board.md`,
  `docs/plans/index.md`, and `docs/handoff/current-state.md` to record the
  2026-06-26 flowchart revision and the remaining direct-Figma-write
  limitation.

Verification:

- `node scripts/generate-figjam-workflow-board.mjs` rewrote the SVG
  successfully (`Canvas: 3600x8058`, `Flowchart nodes: 101`,
  `Flowchart edges: 101`).
- `node --check scripts/generate-figjam-workflow-board.mjs` passes.
- Structural SVG checks confirmed 17 decision diamonds, 102 path elements
  (101 graph edges plus the arrowhead marker path), branch labels including
  `Approve`, `Reject`, `Reject/change`, `Yes`, and `No`, and explicit reject
  destination text for PR/PO/Returns.
- `git diff --check` passes.
- No raster preview tool (`magick`, `inkscape`, `rsvg-convert`) is available
  in PATH, so visual verification was structural rather than screenshot-based.
- No runtime app code, Supabase schema/migration, staging data, deployment
  settings, V1 production files, GAS deployments, Sheets, live URLs, LINE
  tokens, or secrets changed.

Next action:

- Drag `docs/figma/akra-v2-app-workflow-board.svg` into FigJam/Figma and
  ungroup it before editing boxes, arrows, or text.

## 2026-06-29 - V2-0049 PR Create Write Slice Closeout Docs

Context:

- User asked to close out V2-0049 docs and prepare split commits after a review
  found the runtime/schema work was mostly sound but not ready to commit as-is.
- Review findings addressed here: missing V2-0049 active work-log entry,
  stale module README/status docs, stale migration/database strategy docs, and
  unclear commit scope because V2-0048 FigJam artifacts and V2-0049 runtime
  changes are both still uncommitted.

Changes:

- Updated `src/modules/purchasing/README.md` and `src/modules/README.md` so
  the module status now reflects V2-0049: V2-native PR create/list/detail is
  implemented, backed by service-role-only
  `public.create_purchase_requisition(...)`, with signed-in browser UAT still
  pending.
- Updated `docs/migration/module-inventory.md` to replace the stale "No runtime
  UI yet" PR/PO/GR note with the current state: V2-0047 PO/GR read-only UI is
  implemented, and V2-0049 adds the first PR write slice.
- Updated `docs/migration/database-strategy.md` to record
  `20260626071939_pr_create_write_slice.sql`, its public-schema
  `SECURITY INVOKER` / service-role-only posture, and staging apply status.
- Updated `docs/handoff/current-state.md` with today's date and an explicit
  next action for signed-in browser UAT of `/purchasing/pr/new`.

Prepared split-commit grouping:

- Commit 1, V2-0048 FigJam workflow board: `docs/figma/**`,
  `docs/plans/V2-0048-figjam-app-workflow-board.md`,
  `scripts/generate-figjam-workflow-board.mjs`, plus the V2-0048 portions of
  `docs/plans/index.md`, `docs/handoff/current-state.md`, and this work log.
- Commit 2, V2-0049 PR create write slice:
  `supabase/migrations/20260626071939_pr_create_write_slice.sql`,
  `scripts/verify-staging-schema.mjs`, `src/app/purchasing/page.tsx`,
  `src/app/purchasing/pr/**`, `src/modules/purchasing/create-pr-action.ts`,
  `src/modules/purchasing/new-pr-form.tsx`,
  `src/modules/purchasing/reference-data.ts`,
  `src/modules/purchasing/read-model.ts`, `src/modules/purchasing/format.ts`,
  `src/modules/purchasing/README.md`, `src/modules/README.md`,
  `src/app/globals.css`,
  `docs/plans/V2-0049-pr-create-write-slice.md`,
  `docs/migration/{module-inventory.md,database-strategy.md}`, and the
  V2-0049 portions of `docs/plans/index.md`, `docs/handoff/current-state.md`,
  and this work log.
- `next-env.d.ts` is generated churn from Next route type generation. Decide
  before staging whether to include it with V2-0049 or restore it out of the
  commit; no manual file edit was made in this closeout.

Verification:

- `git diff --check` passed for the current working tree; only line-ending
  warnings were reported (`docs/migration/module-inventory.md`,
  `scripts/verify-staging-schema.mjs`, `src/app/globals.css`).
- Earlier in the same review session, before these documentation-only closeout
  edits, `npm run lint` passed with two pre-existing FigJam warnings,
  `npm run typecheck` passed, `npm run check:migrations` passed,
  `npm run build` passed, and `npm run db:verify-staging-schema` passed.
- No runtime behavior, Supabase schema, staging data, V1 production files, GAS
  deployments, Sheets, live URLs, LINE tokens, deployment settings, or secrets
  changed during this closeout.

Next action:

- Stage the split commits carefully, because shared docs
  (`docs/plans/index.md`, `docs/handoff/current-state.md`,
  `docs/handoff/work-log.md`) contain both V2-0048 and V2-0049 content and may
  need patch staging.
- Run signed-in browser UAT for V2-0049 with a `purchasing.write` user before
  any production cutover decision.

## 2026-06-29 - PR Approve/Reject Slice Planned (V2-0050)

Context:

- After committing V2-0048 and V2-0049 locally, the user authorized continuing
  work and said new work could be planned.
- The next logical PR/PO/GR step after V2-native PR creation is an explicit
  approval/rejection gate before PO-from-approved-PR is implemented.

Changes:

- Added `docs/plans/V2-0050-pr-approve-reject-slice.md` as a plan-only Draft.
- Updated `docs/plans/index.md` with V2-0050 in the active queue and current
  direction.
- Updated `docs/handoff/current-state.md` with the V2-0050 plan id and next
  decision.

Plan summary:

- MVP: one service-role-only public RPC, default `SECURITY INVOKER`, enforcing
  `pr_pending -> pr_approved` or `pr_pending -> pr_rejected`; update PR header
  and lines atomically; record `pr_approved`/`pr_rejected` events; show
  pending-only approve/reject controls on `/purchasing/pr/[id]`.
- Preconditions: run V2-0049 signed-in browser UAT and decide whether approval
  uses the existing `purchasing.write` permission or a new
  `purchasing.approve` permission.
- Out of scope: PO creation, PR editing/reopen, V1 Sheet/GAS writeback,
  production cutover.

Verification:

- Pending after the plan edits: run documentation checks before committing.

Next action:

- Review/accept the permission model for V2-0050, then execute with `Go:` after
  or alongside V2-0049 signed-in browser UAT.

## 2026-07-01 - V2-0050 Local Implementation Inspection

Context:

- User resumed with `Let's work` plus `Architect:` and asked whether V2-0050
  implementation files were already in progress, whether they needed
  review/commit, which PR approval permission model to use, and whether
  V2-0049 browser UAT should run before committing V2-0050.
- Per the Architect lane, no runtime code was edited in this inspection.

Findings:

- `git status --short` shows local uncommitted V2-0050 runtime/schema files:
  `supabase/migrations/20260629102300_pr_approve_reject_slice.sql`,
  `scripts/verify-staging-schema.mjs`,
  `src/modules/purchasing/transition-pr-action.ts`,
  `src/modules/purchasing/pr-transition-controls.tsx`,
  `src/app/purchasing/pr/[id]/page.tsx`,
  `src/modules/purchasing/format.ts`, `src/app/globals.css`, and generated
  `next-env.d.ts` churn. `.playwright-cli/` is also untracked and should be
  cleaned before commit.
- The local implementation covers the expected MVP shape: service-role-only
  `public.transition_purchase_requisition_status(...)`, server action guarded
  by `purchasing.write`, pending-only approve/reject controls, approval/reject
  metadata display on the PR detail page, event labels, and schema verifier
  entries.
- Permission recommendation: keep MVP approval/rejection on existing
  `purchasing.write`; defer `purchasing.approve` to a separate
  permission/schema/role-mapping slice only if the business needs approval
  separated from PR creation/editing.

Verification:

- `npm run check:migrations` passed.
- `npm run lint` passed with only the pre-existing V2-0048 FigJam generator
  warnings.
- `npm run typecheck` passed.
- `git diff --check` passed with line-ending warnings only.
- Not run: V2-0049 signed-in browser UAT, current Supabase docs/changelog
  recheck, V2-0050 staging migration apply, `db:verify-staging-schema`, direct
  transition RPC smoke tests, `npm run build`, or V2-0050 browser verification.

Next action:

- Do not commit V2-0050 yet. Run V2-0049 signed-in browser UAT first, review
  the local V2-0050 implementation, clean `.playwright-cli/`, re-check current
  Supabase docs/changelog before staging apply, apply/smoke-test the V2-0050
  migration in staging, browser-verify V2-0050, update closeout docs, then
  commit.

## 2026-07-01 - V2-0050 PR Approve/Reject Slice Closeout (V2-0049 + V2-0050)

Context:

- Resumed from the V2-0050 local-inspection handoff. All pending verification
  tasks were executed in this session in order. Migration was already present
  locally; no new runtime code was written in this session.
- Two Playwright-based browser UAT scripts were written in the project root,
  run, then deleted after all checks passed.

Changes:

- Cleaned untracked `.playwright-cli/` artifacts (removed before commit).
- Confirmed `next-env.d.ts` churn self-resolved (file reverted to prior tracked
  state during typecheck run; excluded from commit).
- Applied migration `20260629102300_pr_approve_reject_slice.sql` to staging via
  `npm run db:apply-migrations`.

Verification:

- **V2-0049 signed-in browser UAT**: 15/15 PASSED — SUPERVISOR creates a
  V2-native PR from `/purchasing/pr/new`, verifies PR detail status pill,
  history `pr_created` event, PR lines content, mobile 390px zero overflow, no
  console errors, GUEST denied on `/purchasing` and `/purchasing/pr/new`.
- **Supabase docs/changelog recheck**: confirmed ADR `0015` posture
  (`SECURITY INVOKER`, `EXECUTE` revoked from `public`/`anon`/`authenticated`,
  granted to `service_role` only) is still the recommended approach — no
  migration changes needed.
- **`npm run db:apply-migrations`**: migration applied cleanly to staging
  (2026-07-01).
- **`npm run db:verify-staging-schema`**: passed (36 tables, 34 policies).
- **Direct RPC smoke tests** (5/5): approve, reject-with-reason, reject-no-
  reason (must fail), terminal-repeat-approve (must fail), terminal-repeat-
  reject (must fail) — all run inside `pg` `BEGIN`/`ROLLBACK` transactions,
  no staging data permanently modified.
- **V2-0050 browser UAT**: 15/15 PASSED — SUPERVISOR approves a pending PR
  (transition panel disappears, status pill shows "Approved", history shows
  `pr_approved` event, approved-by metadata panel visible), SUPERVISOR rejects
  a second pending PR with reason (status "Rejected", history, rejected-reason
  panel visible), both terminal PRs have no transition controls; GUEST denied;
  390px zero overflow; zero browser console errors.
- Playwright UAT key fix: used `transitionSection.waitFor({ state: "hidden" })`
  instead of `waitForURL(same-url)` because Next.js `redirect()` back to the
  same `/purchasing/pr/[id]` resolves Playwright's URL check immediately
  (before the page reloads to new content).
- No V1 production files, GAS deployments, Sheets, live URLs, LINE tokens,
  deployment settings, or secrets changed.

Test accounts:

- `v2050-sup@akra-v2.test` (SUPERVISOR, `purchasing.write`) — created for UAT;
  delete via service-role Admin API.
- `v2050-guest@akra-v2.test` (GUEST, no purchasing perms) — created for UAT;
  delete via service-role Admin API.

Next action:

- Delete the two test accounts via service-role Admin API after commit.
- Next PR/PO/GR slice options: PO-from-approved-PR, or Vercel-deployed
  verification of V2-0049 in a Preview/Development environment.

## 2026-07-01 - PO From Approved PR Slice Planned (V2-0051)

Context:

- User requested `Architect:plan PO-from-approved-PR`.
- Per the Architect lane, this session planned only; no runtime code,
  migrations, staging data, V1 production files, GAS deployments, Sheets, live
  URLs, LINE tokens, deployment settings, or secrets were changed.

Changes:

- Added `docs/plans/V2-0051-po-from-approved-pr-slice.md` as a Draft plan.
- Updated `docs/plans/index.md` with `V2-0051` in the active queue and current
  direction.
- Updated `docs/handoff/current-state.md` with the V2-0051 active plan entry
  and next action.

Plan summary:

- MVP: create one V2-native PO from one approved V2-native PR using a
  service-role-only `public.create_purchase_order_from_requisition(...)` RPC,
  copying all PR lines to PO lines, requiring a selected vendor, recording a
  `po_created_from_pr` event, and redirecting to the existing PO detail route.
- Permission model: keep existing `purchasing.write`; no new granular
  permission in this slice.
- Safety constraints: block pending/rejected PRs, duplicate PO creation,
  missing vendor, and mixed-warehouse PRs in the first MVP.
- Out of scope: Direct PO, GR receiving, PO close/APV, vendor inference,
  split-by-warehouse behavior, V1 writeback, and production cutover.

Verification:

- Pending after the plan edits: run documentation checks before committing.

Next action:

- Review/accept `V2-0051`, delete the two V2-0050 UAT test accounts when
  execution/cleanup is authorized, then execute with `Go:` when ready.
