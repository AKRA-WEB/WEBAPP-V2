# Decision Board

Last updated: 2026-06-24

This board is for project-level decisions and recommended next actions. The
source-of-truth implementation status remains `docs/plans/index.md`.

## Recommended Next Move

`V2-0034` prepared the Picking cutover package on 2026-06-22
(`docs/migration/picking-cutover-package.md`), and `Review: V2-0034`
(2026-06-22) found 5 real gaps — all verified accurate, 3 closed, 2 are
inherently user/business actions. It is **not** an approval — four items are
open and need a user decision before Picking can be called cutover-ready:

1. **Deployed Vercel Preview/Development verification.** Today's V2 work has
   been pushed to `origin/main`, but the agent still cannot exercise the real
   deployed project itself — the local `vercel` CLI account (`akra-web`) can't
   reach the real project's team scope (`akrapanich-3912s-projects`). Closing
   this needs the user to personally click through the deployed UAT script or
   explicitly accept staging/local verification as sufficient.
2. **Combined human UAT pass.** All verification so far is per-slice,
   agent-run Playwright against synthetic accounts. No one has run the full
   create -> pick -> send -> problem -> LINE-retry flow in one sitting as a
   real acceptance test.
3. **Fresh reference-data export.** Review feedback caught that
   `ProductName`/`Staff` freshness was only checked against the 2026-06-20
   snapshot, never against the live V1 Sheet since. Needs someone with Sheet
   access to re-export and rerun `npm run picking:reference-import-dry-run`.
4. **Cutover runbook execution.** Package section 5a now lists the concrete
   steps (pause/redirect V1 — a business action outside this repo's
   authority, enable V2 production route, notify real users); none are done
   yet, and real staff Supabase Auth accounts don't exist yet either.

`V2-0036`'s foundation work is now fully complete (2026-06-22): source
profiling + dry-run report (0 blockers / 7 warnings — see
`docs/migration/pr-po-gr-v1-mapping.md` and
`import-reports/pr-po-gr-dry-run-report.md`), the schema/RLS lock (ADR
`0020`), and the migration itself:
`supabase/migrations/0013_pr_po_gr_foundation.sql` — 9
`public.purchasing_*`/`public.receiving_*` tables, RLS, explicit grants,
permission-based select policies, no data import, no UI, no RPCs. Applied
to staging: `npm run check:migrations` and `npm run db:verify-staging-schema`
both pass (36 public tables, 34 policies), and a live anon Data API call
returned `HTTP 401` on the new tables. Picking cutover remains unaffected
by this PR/PO/GR work.

`V2-0039` accepts the release-shape decision (ADR `0021`): grouped PR/PO/GR
operational cutover after end-to-end staging UAT, while still implementing in
small slices. `V2-0040`'s reconciliation logic is now built and proven
(2026-06-23) against the current empty PR source (0 data rows): the dry-run
script gained PR Profiling, PR -> PO Reconciliation, and PO -> GR line
coverage sections. Real findings: 1 bill group / 3 PO rows are
unverifiable/manual-review because no source PR rows exist; PO -> GR coverage
is 94.1% (706/750). 0 blockers, 9 warnings. **Resolved (ADR `0022`,
2026-06-24):** import the 3 PR-derived PO rows as manual-review/nullable PR
linkage (`legacy_ref_pr_uid` + `pr_number_label` breadcrumb text); do not
pursue historical PR-row recovery — the PR is already closed
(`GR Completed`) and its reference survives as text on every line, so the
locked schema's existing nullable columns cover this with no migration
change. PR/PO/GR data-import planning can now proceed.

`V2-0044` (Complete, 2026-06-24) executed the staging import. ADR `0023`
accepted (full-snapshot). The real run loaded **253 PO headers/748 lines,
588 GR headers/1868 lines/6 splits, 0 PR rows** into the locked `0013`
schema, verified by 16 read-only checks and an idempotent second run. New
ADR `0026` records a synthesized `LEGACY-*` `po_number` for 251/253 headers
whose V1 source `PO_Number` was blank. No runtime PR/PO/GR UI yet — see
`docs/migration/pr-po-gr-v1-mapping.md`'s "V2-0044 Staging Import Result"
for full detail.

`V2-0045` (Complete, 2026-06-24) handled the requested schema/master-data/
folder-structure hardening without changing runtime behavior or schema:
`docs/database/schema-catalog.md`, `docs/migration/master-data-vocabulary.md`,
and ADR `0024` now standardize the schema reference, `source_app`/
`legacy_source`/`match_status` vocabulary, and module/script folder
boundaries before PR/PO/GR import code is written.

`V2-0046` (Complete, 2026-06-24) planned and delivered the operational-readiness
package requested before PR/PO/GR write workflow: tasks 1-5 added
`docs/operations/environment-matrix.md`,
`docs/operations/monitoring-observability-plan.md`,
`docs/operations/backup-dr-plan.md`,
`docs/operations/module-rollback-runbook.md`, and
`docs/operations/pr-po-gr-readiness-gates.md`; task 6 linked them from
`docs/migration/cutover-checklist.md`. ADR `0025` is Accepted: `V2-0044`
staging import/read-only validation can proceed (already done), and per
`pr-po-gr-readiness-gates.md`, PR/PO/GR write-workflow implementation against
Staging can now be planned; production cutover still requires implemented
and verified readiness checks (task 7, deferred), not just documents.

`V2-0047` (Complete, 2026-06-24) implemented the first read-only PR/PO/GR UI
slice: permission-gated `/purchasing`/`/purchasing/[id]` (PO) and `/receiving`/
`/receiving/[id]` (GR, with line splits), reading the real rows `V2-0044`
already imported. **Not** blocked by `V2-0046`/ADR `0025` — that gate covers
write workflow only. Fixed a real gap found during execution: the shared
`ModuleLandingPage` placeholder checked only the single `purchasing.read`/
`receiving.read` permission, but no role currently holds those `.read`
values (only `.write`), so a `.write`-only role was incorrectly denied; the
new routes now use `anyOf` like Picking's page guard, proven against a
synthetic `SUPERVISOR`-role test account. Committed and pushed
(`c4797f9`, 2026-06-24).

## Near-Term Queue

| Order | Work | Why Now | Decision Needed |
| --- | --- | --- | --- |
| 1 | Picking problem reporting | Completes shortage/exception workflow before LINE | Done (`V2-0025`, 2026-06-20): pending/picked bills stay in their current status when a problem is reported |
| 2 | Picking LINE notification/failure recovery | Needed before realistic pilot/cutover | Done (`V2-0027`, 2026-06-22): disabled/dry-run by default, event-only failure (status untouched), retry action; real sends still unproven |
| 3 | Picking cutover package | Lets user decide whether V2 Picking can replace V1 Picking | Prepared (`V2-0034`, 2026-06-22); review (2026-06-22) found 5 gaps, 3 closed (reproducible reconciliation script, runbook section 5a, freshness section 3a); 4 open user decisions remain: deployed-build verification, combined human UAT pass, fresh V1 reference-data export, runbook execution |
| 4 | Fresh PR CSV reconciliation | Required before PR/PO/GR data import/runtime UI | Done (`V2-0040`, 2026-06-23; ADR `0022`, 2026-06-24): logic built+proven (0 blockers, 9 warnings); 3 PR-derived PO rows resolved as manual-review/nullable PR linkage, no recovery needed |
| 5 | Placeholder route guard pass | Prevents future route content from inheriting open placeholders | Done (`V2-0041`, 2026-06-23): `ModuleLandingPage` now guards all 5 non-Picking routes with `requirePermission()` |
| 6 | PR/PO/GR staging import slice | Required before any PR/PO/GR read-only UI | Done (`V2-0044`, 2026-06-24): 253 PO/588 GR headers imported, 16/16 checks pass, idempotent re-run proven; ADR `0026` added for synthesized `po_number` |
| 7 | Operational readiness before PR/PO/GR writes | Prevents core write workflow from starting without environment, monitoring, backup/DR, and rollback posture | Done (`V2-0046`, 2026-06-24, Complete, tasks 1-6); ADR `0025` accepted the gate. Does not block `V2-0044` import/read-only validation; PR/PO/GR write-workflow implementation can now be planned, task 7 (tooling/drill) still required before production cutover |
| 8 | PR/PO/GR read-only list/detail UI | First UI over the imported PO/GR data; not blocked by the write-readiness gate | Done (`V2-0047`, 2026-06-24, Complete); pushed `c4797f9` |

## Resolved Decisions

### Operational Readiness Gate Before PR/PO/GR Writes

Decision (ADR `0025`, 2026-06-24): before transactional PR/PO/GR write
workflow begins, V2 must have a documented and reviewed operational-readiness
package covering Environment Matrix, Monitoring/Observability, Backup/DR,
Rollback, and PR/PO/GR readiness gates.

Implication: `V2-0044` staging import and read-only validation can continue.
The `V2-0046` readiness docs now exist (2026-06-24); PR/PO/GR write-workflow
implementation can be planned once the user reviews/accepts them. Production
cutover still waits for readiness implementation and verification evidence
(task 7: tooling install, real restore drill, named rollback owner —
deferred, not started). Production Supabase should be a separate data plane
from staging unless a later ADR accepts an exception.

### Master Data Vocabulary And Folder Boundaries

Decision (ADR `0024`, 2026-06-24): keep `source_app` as a legacy source-family
field (`po-pr-gr`, `picking`, `returnitem`, `akra-trd`, `akra-w5`) and store
module visibility separately in `catalog_product_scopes`. Standardize
`match_status` values in `docs/migration/master-data-vocabulary.md`, put future
domain logic under `src/modules/<module>/`, and put shared import helpers under
`scripts/lib/`.

Implication: `V2-0044` should use this vocabulary before writing PR/PO/GR
import rows. No schema change was required.

### PR-Derived PO Rows With No Source PR Row

Decision (ADR `0022`, 2026-06-24): import the 1 bill group / 3 PO line rows
with a real `Ref_PR_UID` as manual-review/nullable PR linkage. Do not pursue
historical PR-row recovery.

Implication: `legacy_ref_pr_uid` (PO header) and `pr_number_label` (PO line)
hold the raw UID and human-readable breadcrumb text; `purchase_request_line_id`
stays `null`. No schema change needed — `0013`'s nullable legacy bridge
columns already cover this. The PR is already closed (`GR Completed`), so
recovering a structured PR row has no business value at this scale (1 of 254
bill groups).

### PR/PO/GR Release Shape

Decision: use a grouped PR/PO/GR operational release gate after end-to-end
PR -> PO -> GR staging UAT, while still implementing in small internal slices.

Implication: data import and runtime UI can be built incrementally, but
production cutover should not split PR/PO from GR unless a separate
bridge/writeback ADR is accepted first.

### Picking Problem Behavior

Decision: do not mark a `pending` bill as `picked` when a problem report is
submitted.

Implication: problem reporting is an exception record only. Picking status must
change through explicit status-transition actions.

### Picking History Strategy

Decision: keep V1 Picking history as a read-only archive for backward lookup.
Do not import V1 Picking requisition history into V2 for the first cutover
package.

Implication: cutover package must document where operators/admins can read old
V1 records after switching new Picking work to V2.

Implemented (`V2-0034`, 2026-06-22): V1 Picking stays live and unmodified at
its current URL; operators/admins use it directly for any pre-cutover
history lookup. V2 never imports or reconciles against V1 rows.

### LINE Staging Policy

Decision: use disabled send/dry-run mode first. Real LINE sends require later
explicit approval.

Implication: LINE implementation should record intended payload/result in V2
without sending external messages until approved.

Implemented (`V2-0027`, 2026-06-22): `PICKING_LINE_PUSH_ENABLED` defaults to
disabled; every notification attempt is recorded as a
`picking_requisition_events` row only and never changes
`picking_requisitions.status` (V1-faithful — V1's own push failure is
non-blocking). The reserved `line_push_failed` *status* value (migration
`0004`) stays unused by design; a writer/admin "Retry LINE notification"
button reads the *event* log instead. Real sends remain unproven — no
staging LINE credentials exist yet.

### Synthesized `po_number` For Legacy PO Bills

Decision (ADR `0026`, Accepted, 2026-06-24): when no line in an imported PO
bill group carries a real V1 `PO_Number` (746/750 PO rows are blank; only
3/254 bill groups have any real value), synthesize
`po_number = "LEGACY-" + <bill identity>` instead of leaving it blank
(the schema requires non-blank). Affected 251 of 253 imported headers.

Implication: `po_number` is always a deterministic, clearly-marked
(`LEGACY-` prefix) display value for legacy-imported bills; the real
identity stays in `legacy_group_key`/`bill_identity_kind`/
`bill_identity_value`. A future PR/PO/GR UI should not present `po_number`
as a real V1 business number without explaining the prefix.

### PR/PO/GR Import Scope

Decision (ADR `0023`, Accepted, 2026-06-24): import the full current
snapshot — all 750 PO line rows (254 bill groups) and 1868 GR rows — in one
pass, rather than active/open rows only. Rationale: the dry-run already
proves the full snapshot clean (0 blockers), and an active-only first pass
would still need a second backfill pass later for historical/closed rows
with no clear benefit. User confirmed 2026-06-24; `V2-0044` import execution
follows.

The authoritative PR source question is now resolved for the current snapshot:
a live V1 `PR` sheet exists in the same spreadsheet as `PO`/`GR`, and the
current `Trackingpo - webapp - PR.csv` export has 0 rows. Full PR-row import
therefore imports zero PR rows unless historical PR rows are recovered from
another source (not pursued — see Resolved Decisions below).

## Open Decisions

### Operational Readiness Sub-Decisions

ADR `0025` accepts the gate, but these implementation choices remain open
before PR/PO/GR writes:

- production RPO/RTO target;
- daily-backup baseline vs PITR production profile;
- monitoring tool choice and whether Sentry is the first implementation slice;
- alert recipients and escalation owner;
- rollback authorization owner during and outside business hours;
- exact production/staging Supabase separation and project ownership.

## Watch List

- Vercel deployed-create was noted as not separately exercised through a
  deployed Preview/Development build after `V2-0020`; the same caveat now
  also applies to the LINE real-send branch added in `V2-0027`. Today's work
  has been pushed, but deployed UAT is still a user-side gate.
- LINE real-send path (`fetch` to the Messaging API) is implemented but
  unproven — needs real `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` plus explicit
  approval before any real send test.
- A seeded staging fixture (`V2-0019`'s `line_push_failed` fixture) has a
  `problem_reported` lifecycle event with no matching
  `picking_problem_reports` row — a seed-script-only quirk found during
  `V2-0034`'s reconciliation query, low priority, not fixed yet.
- Active work-log length should stay below the context budget; archive before
  it becomes the default history dump again.
- `V2-0036` dry-run findings are handled for schema design by ADR `0020`, but
  still matter before import/cutover: no PR CSV export exists yet; the
  exported `PO.csv` has no `Expected_Date` column; 233 bill groups (698 PO
  line rows) rely on the ambiguous legacy bare-`DIRECT` grouping key; and 10
  GR rows have orphan `Ref_PO_UID` references.
- Operations readiness is now a formal gate for PR/PO/GR writes, not a generic
  later hardening item. Keep import/read-only validation separate from write
  workflow readiness when planning the next `Go:`.
- `V2-0044`'s PR import path is code-complete (mirrors the PO import pattern)
  but unproven against real data — the current PR source has 0 rows. Re-run
  `scripts/pr-po-gr-import-apply.mjs` and `scripts/verify-pr-po-gr-import.mjs`
  once a real, non-empty `PR.csv` export exists, before trusting that branch.
- 2 real V1 PO rows (`PO_UID` `39e58079-…`/`14613212-…`) carry `PO_Qty = "0"`
  and were skipped on import (`invalid_source_row`) rather than imported with
  a fabricated quantity. If a future fresh export shows these were corrected
  upstream, re-running the import will pick up the corrected values
  automatically (truncate-then-reload).
