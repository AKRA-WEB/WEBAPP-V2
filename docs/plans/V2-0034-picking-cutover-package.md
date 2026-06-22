# Plan V2-0034: Picking Cutover Package

Status: Complete on 2026-06-22; updated 2026-06-22 in response to
`Review: V2-0034` feedback (5 findings — 1 blocker, 1 high, 3 medium; all
verified accurate against the file). Still **not approved**; same two
user-gated open gates as before, plus newly-documented gaps below.

User command:

```text
go now
```

(Bare `Go`, drafted inline per the `V2-0017`/`V2-0023`/`V2-0025`/`V2-0027`
precedent. `docs/handoff/current-state.md` Next Action 8,
`docs/plans/index.md`'s `V2-0022` next-step chain, and
`docs/project-management/decision-board.md`'s "Recommended Next Move" all
named the Picking cutover package as the next slice after LINE
notification/failure recovery `V2-0027`.)

## 1. Goal

- Primary objective: produce the evidence package the user needs to decide
  whether V2 Picking is ready to become the primary system for new Picking
  work, per `V2-0022`'s Phase 2 exit gate.
- Success definition: an honest go/no-go package — V1 history archive note,
  real data reconciliation, a UAT checklist, a filled cutover checklist, a
  rollback plan, and clearly named open gates — not a claim that cutover has
  happened.
- User/business reason: the decision board named this as the last item before
  PR/PO/GR foundation planning starts; the user needs to make an informed
  approve/hold decision, not just see a checkbox.

## 2. Scope

- Document where V1 Picking history remains readable after any future
  cutover (ADR `0018`'s resolved decision).
- Query staging directly for real `picking_requisitions` /
  `picking_problem_reports` / `picking_requisition_events` /
  `picking_requisition_secrets` counts, not just recite prior handoff claims.
- Write a UAT checklist covering the combined create -> status -> problem ->
  LINE-retry flow across all roles.
- Fill `docs/migration/cutover-checklist.md`'s generic sections with Picking-
  specific evidence and named gaps.
- Write a rollback plan appropriate to the current "no production cutover yet"
  state.
- Name the Vercel Preview/Development verification gap explicitly as an open,
  user-gated decision rather than silently checking it off.

## 3. Out Of Scope

- Any runtime code change under `src/`.
- Pushing local commits to `origin/main` or any deploy action.
- Fixing the non-Picking placeholder-route guard gap (separate watch-list
  item).
- A real LINE send test (deferred per ADR `0018`/`V2-0027`).
- Importing V1 Picking history into V2 (ADR `0018` already resolved this:
  no).
- Declaring Picking actually cut over to production — that decision belongs
  to the user, not this plan.

## 4. Files Changed

- `docs/migration/picking-cutover-package.md` (new) — the actual package.
- `docs/plans/V2-0034-picking-cutover-package.md` (this file).
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/project-management/decision-board.md`
- `docs/migration/module-inventory.md`
- `docs/migration/migration-plan.md`

## 5. Verification

- Ran a temporary read-only script (`scripts/_tmp-picking-reconciliation.mjs`,
  written, run, and deleted in this session) against staging via
  `DATABASE_URL` to get real `legacy_source`/status/event-type counts instead
  of repeating prior handoff claims unverified. See
  `docs/migration/picking-cutover-package.md` section 3 for results.
- Checked `git status -sb` and `git log origin/main..main`: local `main` is 2
  commits ahead of `origin/main` (`V2-0027`, `V2-0028`), so the deployed
  Vercel build does not yet include the LINE notification/retry feature.
  Recorded as an open gate; did not push.
- `git diff --check` passes (documentation-only change).
- Did not run `lint`/`typecheck`/`build` — no `src/` files changed.

## 6. Rollback / No-Production-Impact Note

Documentation only. No runtime app code, Supabase schema, staging data, V1
production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets were
changed. No commits were pushed. No production cutover occurred.

## 7. Open Questions

- Does the user want to authorize a push of the 2 pending local commits so
  the deployed Preview/Development build can be exercised, or accept
  staging/local verification as sufficient for now?
- Should the combined human UAT pass (section 4 of the package) be run before
  or independent of the deployed-build verification?
- Should the missing `picking_requisition_events` <-> `picking_problem_reports`
  link for the seeded `line_push_failed`+problem fixture be fixed, or left as
  a known low-priority seed-data quirk?

## 8. Handoff Notes

- Next action: per the package's section 8, the user decides whether to
  authorize a push + deployed verification, run the combined UAT pass, or
  accept current evidence and move to PR/PO/GR foundation planning
  (`V2-0022` step 6).
- Blockers: Vercel CLI account/scope mismatch (see memory note
  `vercel-project-location`) means the agent cannot exercise a deployed build
  even after a push; that leg of verification is fundamentally a user action.
- Related plans: `V2-0019`, `V2-0020`, `V2-0023`, `V2-0025`, `V2-0027`,
  `V2-0022`.
- Related ADRs: `0012`, `0013`, `0015`, `0018`.

## 9. Review Response (2026-06-22)

User ran `Review: V2-0034` and reported 5 findings. Checked every cited line
number against the actual file before acting — all 5 checked out accurate:

1. **Blocker** — no concrete production cutover runbook (who pauses V1,
   how the V2 production route gets enabled, user notification). **Fixed**:
   added package section 5a with 4 concrete steps; updated the "Cutover"
   checklist rows to point at them instead of "out of scope."
2. **High** — reference-data (`ProductName`/`Staff`) freshness was never
   re-checked since the one-time `V2-0020` import. **Partially fixed**:
   added package section 3a. Re-ran
   `npm run picking:reference-import-dry-run`; it only proves the on-disk
   snapshot (last modified 2026-06-20) is read consistently, **not** that
   the live V1 Sheet hasn't changed since — that needs a fresh export,
   which is a user/Sheet-access action the agent cannot do alone. Documented
   as an explicit pre-cutover step, added an unchecked checklist row.
3. **Medium** — section 3's reconciliation evidence used a deleted,
   non-reproducible script. **Fixed**: added
   `scripts/verify-picking-cutover-reconciliation.mjs` (npm alias
   `picking:verify-cutover-reconciliation`), added locally and re-run;
   numbers unchanged from the original (4 total requisitions, all
   `v2_fixture`, 0 orphans, 1 known `problem_reported`-without-report-row
   gap). **Round-2 review correction**: this section originally said
   "committed" before commit/push had happened. Corrected the wording here
   and in the package to avoid claiming committed status as evidence.
4. **Medium** — Vercel/human-UAT gates still open. Already accurately
   documented as open in sections 4/5; no change needed, reconfirmed.
5. **Medium** — the package itself was still uncommitted/untracked during
   review. Accurate at review time; the user later requested a commit/push
   closeout, so this should be resolved by the closeout commit rather than
   treated as a remaining package defect.

## 10. Review Response Round 2 (2026-06-22)

User ran a second `Review:` pass and reported 4 more findings — all checked
against the current file and verified accurate:

1. **High** — the filled checklist's Deployment section had
   `[x] Production env vars prepared but not exposed`, directly contradicting
   section 5a (runbook step 2: env vars not yet added to Production scope)
   and the "Cutover" section's own `[ ] V2 production route enabled`.
   **Fixed**: changed to `[ ]`, reworded to "not done, intentionally," and
   pointed at section 5a step 2.
2. **Medium** — section 9 (above) and the package both said the new
   reconciliation script was "committed" before commit/push had happened.
   **Fixed**: reworded both files to describe the script as re-runnable
   evidence without using committed status as the proof.
3. **Low** — this file's section 5 (the original, pre-review Verification
   record) still describes the deleted one-off script as current, which can
   confuse a future resume even though section 9 explains the fix. Left
   section 5 as the historical record of what literally happened at
   original execution time, per this repo's "don't rewrite history" handoff
   convention — added this round-2 section instead of editing section 5, so
   both the original record and the correction are visible.
4. **Low** — package section 3a's freshness re-check reported "0 blockers"
   but didn't surface the dry-run's 2 warnings. **Fixed**: section 3a now
   lists both warnings explicitly (3 manual-review products; re-running
   apply would delete-then-insert all existing picking-source aliases) and
   marks them as known/accepted, not new.

Verification: `npm run picking:verify-cutover-reconciliation` (4
requisitions, all `v2_fixture`, 0 orphans, 1 known gap) and
`npm run picking:reference-import-dry-run` (0 blockers, 2 warnings) both
re-ran clean. `git diff --check` passes (CRLF warnings only). No schema,
runtime code, staging data, or secrets changed.

Verification: `npm run lint`, `npm run typecheck` pass (new script added).
`npm run picking:verify-cutover-reconciliation` and
`npm run picking:reference-import-dry-run` both ran clean against staging,
read-only. `git diff --check` passes (CRLF warnings only, pre-existing). No
schema, staging data, V1 production files, or secrets changed. Cutover is
still **not** approved — this response closed two evidence/process gaps,
not the underlying approval gates.
