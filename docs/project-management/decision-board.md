# Decision Board

Last updated: 2026-06-22

This board is for project-level decisions and recommended next actions. The
source-of-truth implementation status remains `docs/plans/index.md`.

## Recommended Next Move

`V2-0034` prepared the Picking cutover package on 2026-06-22
(`docs/migration/picking-cutover-package.md`), and `Review: V2-0034`
(2026-06-22) found 5 real gaps — all verified accurate, 3 closed, 2 are
inherently user/business actions. It is **not** an approval — four items are
open and need a user decision before Picking can be called cutover-ready:

1. **Deployed Vercel Preview/Development verification.** Local `main` is 2
   commits ahead of `origin/main` (`V2-0027` LINE notification, `V2-0028`
   docs); the deployed build doesn't have the LINE retry feature yet. The
   agent also cannot exercise a deployed build itself — the local `vercel`
   CLI account (`akra-web`) can't reach the real project's team scope
   (`akrapanich-3912s-projects`). Closing this needs the user to authorize a
   push and then personally click through the deployed UAT script.
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

`V2-0036`'s first slice (source profiling + dry-run report) is now done
(2026-06-22, 0 blockers / 7 warnings — see
`docs/migration/pr-po-gr-v1-mapping.md` and
`import-reports/pr-po-gr-dry-run-report.md`). Picking cutover still has the
two gates above, unaffected by this PR/PO/GR work. Before the next `Go:`,
schema details should be locked given two real findings: the exported
`PO.csv` has no `Expected_Date` column (mismatch vs. the V1 code's
documented schema), and 233 bill groups (698 line rows) rely on the
ambiguous legacy bare-`DIRECT` grouping key.

Suggested command for the next implementation slice:

```text
Architect: ล็อก schema/RLS ของ V2-0036 จาก dry-run report ก่อน migration
```

## Near-Term Queue

| Order | Work | Why Now | Decision Needed |
| --- | --- | --- | --- |
| 1 | Picking problem reporting | Completes shortage/exception workflow before LINE | Done (`V2-0025`, 2026-06-20): pending/picked bills stay in their current status when a problem is reported |
| 2 | Picking LINE notification/failure recovery | Needed before realistic pilot/cutover | Done (`V2-0027`, 2026-06-22): disabled/dry-run by default, event-only failure (status untouched), retry action; real sends still unproven |
| 3 | Picking cutover package | Lets user decide whether V2 Picking can replace V1 Picking | Prepared (`V2-0034`, 2026-06-22); review (2026-06-22) found 5 gaps, 3 closed (reproducible reconciliation script, runbook section 5a, freshness section 3a); 4 open user decisions remain: deployed-build verification, combined human UAT pass, fresh V1 reference-data export, runbook execution |
| 4 | PR/PO/GR foundation | Next dependency group after Picking | Source profiling + dry-run report done (`V2-0036` slice 1, 2026-06-22, 0 blockers/7 warnings); next step is locking schema/RLS details, then migration `0013` |
| 5 | Placeholder route guard pass | Prevents future route content from inheriting open placeholders | Can be bundled before non-Picking real content |

## Resolved Decisions

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

### PR/PO/GR Release Shape

Recommended: design PR/PO/GR schema together, but release only after an
end-to-end PR -> PO -> GR staging flow passes.

Why: V1 behavior is tightly coupled around direct PO identity, receiving, and
matching.

Current plan: `V2-0036` treats grouped schema/source profiling as the
foundation, while keeping implementation sliced. The authoritative PR source
question is resolved as a finding (2026-06-22): a live V1 `PR` sheet exists
in the same spreadsheet as `PO`/`GR`, but no CSV of it has ever been
exported into `import-data/po-pr-gr`. Full PR-row import is blocked on that
export, not on missing source data.

## Watch List

- Non-Picking placeholder routes are currently reachable by direct URL and
  should receive server-side guards before real content is added.
- Vercel deployed-create was noted as not separately exercised through a
  deployed Preview/Development build after `V2-0020`; the same caveat now
  also applies to the LINE real-send branch added in `V2-0027`. `V2-0034`
  confirmed local `main` is still 2 commits ahead of `origin/main`, so this
  gap is unresolved and is now an explicit open item in the cutover package.
- LINE real-send path (`fetch` to the Messaging API) is implemented but
  unproven — needs real `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` plus explicit
  approval before any real send test.
- A seeded staging fixture (`V2-0019`'s `line_push_failed` fixture) has a
  `problem_reported` lifecycle event with no matching
  `picking_problem_reports` row — a seed-script-only quirk found during
  `V2-0034`'s reconciliation query, low priority, not fixed yet.
- Active work-log length should stay below the context budget; archive before
  it becomes the default history dump again.
- `V2-0036` dry-run findings to resolve before drafting the staging migration:
  no PR CSV export exists yet (full PR-row import blocked on a fresh V1
  export); the exported `PO.csv` has no `Expected_Date` column despite the
  V1 code documenting one (affects vendor expected-delivery modeling); 233
  bill groups (698 PO line rows) rely on the ambiguous legacy bare-`DIRECT`
  grouping key (largest group 21 lines) — fine to read/display, must not be
  reused for new V2 writes.
