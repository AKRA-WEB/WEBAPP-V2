# Decision Board

Last updated: 2026-06-23

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
is 94.1% (706/750). 0 blockers, 9 warnings. **Still open: decide how to
import the 3 PR-derived PO rows** — nullable/manual-review linkage or recover
historical PR rows from another source.

## Near-Term Queue

| Order | Work | Why Now | Decision Needed |
| --- | --- | --- | --- |
| 1 | Picking problem reporting | Completes shortage/exception workflow before LINE | Done (`V2-0025`, 2026-06-20): pending/picked bills stay in their current status when a problem is reported |
| 2 | Picking LINE notification/failure recovery | Needed before realistic pilot/cutover | Done (`V2-0027`, 2026-06-22): disabled/dry-run by default, event-only failure (status untouched), retry action; real sends still unproven |
| 3 | Picking cutover package | Lets user decide whether V2 Picking can replace V1 Picking | Prepared (`V2-0034`, 2026-06-22); review (2026-06-22) found 5 gaps, 3 closed (reproducible reconciliation script, runbook section 5a, freshness section 3a); 4 open user decisions remain: deployed-build verification, combined human UAT pass, fresh V1 reference-data export, runbook execution |
| 4 | Fresh PR CSV reconciliation | Required before PR/PO/GR data import/runtime UI | Logic built+proven (`V2-0040`, 2026-06-23) against the current empty PR source (0 blockers, 9 warnings); needs a decision for 3 PR-derived PO rows with no source PR row |
| 5 | Placeholder route guard pass | Prevents future route content from inheriting open placeholders | Done (`V2-0041`, 2026-06-23): `ModuleLandingPage` now guards all 5 non-Picking routes with `requirePermission()` |

## Resolved Decisions

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

## Open Decisions

### PR/PO/GR Import Scope

Recommended next: decide whether the first staging import should include all
historical rows in the snapshots or active/open rows first, and decide how to
handle the 3 PR-derived PO rows with no source PR row.

The authoritative PR source question is now resolved for the current snapshot:
a live V1 `PR` sheet exists in the same spreadsheet as `PO`/`GR`, and the
current `Trackingpo - webapp - PR.csv` export has 0 rows. Full PR-row import
therefore imports zero PR rows unless historical PR rows are recovered from
another source.

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
