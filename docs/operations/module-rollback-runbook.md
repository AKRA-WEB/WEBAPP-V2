# Module Rollback Runbook

Source plan: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
(task 4). Source decision: ADR `0025`.

This is a generic rollback runbook for any V2 module, plus a PR/PO/GR-specific
section. It complements, not replaces, `docs/migration/picking-cutover-package.md`
section 7 (Picking's own rollback plan stays there since Picking already has a
prepared cutover package).

## Generic module rollback states

### State 1: Import/read-only staging issue

Applies to: any `*-import-apply.mjs` run, or a read-only UI bug found in
Staging/Preview/Development.

1. Stop the import pipeline (do not re-run `--confirm-*` apply scripts while
   investigating).
2. Re-run the matching dry-run script to compare against the last known-good
   report under `import-reports/`.
3. If the apply script's truncate-then-reload already ran and produced bad
   data, re-run the apply script again from the same source CSVs — it is
   idempotent by design (see `V2-0044`'s verified idempotency proof) and will
   overwrite the bad state.
4. No production impact in this state — Staging only.

### State 2: Pre-cutover write-workflow issue in Staging/UAT

Applies to: a future PR/PO/GR write action, or any other module's write
action, found broken during UAT before production cutover.

1. Disable the write route/action. Today this means removing/gating the
   route or server action; this repo has no feature-flag system yet, so
   "disable" means a code change + redeploy, not a runtime toggle. (If a
   future module needs faster disable, add a feature flag at that time — out
   of scope for this plan.)
2. Keep V1 as the source of truth — this is already the default posture for
   every module that has not been cut over (ADR `0021` for PR/PO/GR
   specifically: no partial cutover).
3. Export the broken V2 test writes for diagnosis (a plain `select` against
   the affected table(s), not a destructive operation).
4. Fix and retest before re-enabling. Re-run the module's existing
   verification steps (lint/typecheck/build + the module's own browser
   verification pattern) before calling it fixed.

### State 3: Production cutover issue after writes start

Applies to: any module after its production cutover has been approved and
writes have started creating real business records.

1. Freeze V2 writes immediately for the affected module (disable the
   write route/action, same mechanic as State 2 step 1, but now urgent).
2. Announce the incident and expected fallback to affected staff/supervisors.
3. Send traffic/operators back to V1 if V1 remains operational for that
   module. (V1 is never modified by V2 work, so this fallback stays available
   by construction — see `CLAUDE.md`'s "V2 is an isolated rewrite" rule.)
4. Export V2-created deltas after the cutover timestamp (the rows created in
   V2 between cutover and the freeze).
5. Reconcile whether those V2-created records must be copied back into V1,
   voided, or re-entered manually once the issue is fixed. This decision is
   business-owned, not automatic.
6. Record final incident notes and the data-reconciliation evidence (what was
   exported, what decision was made, who approved it) before reattempting
   cutover.

## PR/PO/GR-specific rollback notes

- PR/PO/GR production cutover is grouped per ADR `0021`: PR, PO, and GR cut
  over together, not module-by-module. A rollback of one (e.g. GR) during the
  pre-cutover write-workflow phase should be treated as blocking the whole
  group's readiness, not just that one sub-workflow, unless a separate
  bridge/writeback ADR explicitly allows a partial cutover.
- The current staging import (`V2-0044`) is reversible by re-running the
  gated apply script (truncate-then-reload) — this is **not** true once real
  write-workflow records exist, because those records have no V1 CSV
  fallback (see `docs/operations/backup-dr-plan.md`'s data-export retention
  section). This is the core reason the readiness gate (ADR `0025`) exists
  before writes start.
- Orphan/manual-review rows already in staging (10 orphan GR headers with no
  resolvable PO, 3 PR-derived PO lines with no source PR row per ADR `0022`)
  are expected and documented — do not treat them as a rollback trigger.

## Data reconciliation fields (fill in during a real incident)

- Incident date/time:
- Module(s) affected:
- Freeze time:
- Rows exported (table, count, time range):
- Reconciliation decision (copy to V1 / void / re-enter manually):
- Decision approved by:
- Cutover reattempt date:

## Authority to roll back

Not yet named for any environment or module. See
`docs/operations/environment-matrix.md`'s "Rollback owner" column (currently
"Unassigned" for every row) and the matching Open Question there.

## Open Questions

- Who can authorize rollback during business hours, and who can authorize it
  outside business hours?
- Should this runbook gain a feature-flag mechanism before PR/PO/GR write
  workflow ships, instead of relying on code-change-plus-redeploy to disable
  a route?
