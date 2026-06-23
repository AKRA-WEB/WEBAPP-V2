# Plan V2-0039: PR/PO/GR Release Shape Decision

Status: Complete on 2026-06-23 (planning decision accepted)

Architect command:

```text
Achitect: ข้อ 2
```

## 1. Goal

- Primary objective: decide the safe release shape for the PR/PO/GR migration
  before any real data import or runtime UI write flow starts.
- Success definition: the project has a documented recommendation, approval
  gate, rollout criteria, and fallback plan for whether PR/PO/GR ship together
  or in staged submodule releases.
- User/business reason: PR, PO, and GR are operationally coupled in V1.
  Releasing one part without the others could create split-brain purchasing
  and receiving work across V1 Sheets and V2 Postgres.

## 2. Requirement And Scope Definition

### Problem

- `V2-0036` finished the schema/RLS foundation in staging, but PR/PO/GR data
  import and runtime UI remain blocked on two decisions:
  - fresh PR CSV export from the live V1 `PR` sheet;
  - release shape: grouped PR/PO/GR release versus staged rollout.
- V1 PR approvals create PO rows, PO direct-bill identity drives GR grouping,
  and GR receiving updates PO-side operational state. Splitting cutover badly
  risks duplicate work, stale status, or operators checking the wrong system.

### Users

- Primary users: requesters, purchasing officers, and warehouse receiving staff.
- Secondary users: supervisors, admins, and accounting/APV reviewers.
- Admin/support users: migration owner, UAT reviewers, and whoever runs the
  module cutover/rollback checklist.

### MVP Features

- Record a recommended release shape.
- Define what can still be implemented in slices before cutover.
- Define what must pass before any PR/PO/GR production switch.
- Define temporary staged-rollout rules if the user later chooses to release
  PR/PO before GR.

### Nice-To-Have Features

- Exact cutover date and staffing plan.
- Full user training pack.
- Complete historical import policy for all closed PR/PO/GR rows.
- Notification parity policy for every PO/GR message path.

### Out Of Scope

- Runtime app code.
- Supabase schema or migration changes.
- V1 production app changes, GAS deployment changes, Sheet schema changes,
  live URL changes, or LINE token work.
- Data import execution.
- Declaring PR/PO/GR cutover-ready.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: future Next.js App Router PR, PO, and GR routes can still be built
  in small slices after this decision.
- Backend/server boundary: runtime writes stay server-side with
  `requirePermission()` and service-role-only transaction paths.
- Database: existing staging foundation from
  `supabase/migrations/0013_pr_po_gr_foundation.sql`.
- Auth/permissions: current coarse permissions (`purchasing.read/write`,
  `receiving.read/write`) until an implementation slice proves granular
  approve/close permissions are needed.
- Deployment: staging and Vercel Preview/Development only until module cutover
  approval.

### Data Model / Schema

- No schema change in this plan.
- Existing V2 foundation tables remain the target for PR/PO/GR imports and
  runtime workflows.
- Fresh PR CSV is required before full PR import and PR-derived PO
  reconciliation.
- PO/GR can be profiled from current snapshots, but final reconciliation still
  needs the PR export to prove PR -> PO -> GR coverage.

### Recommended Decision

Recommendation: **group PR/PO/GR as one operational release gate**, while
implementing internally in small, reviewable slices.

Meaning:

- Development can proceed in slices: import dry-run, PR read-only, PO read-only,
  GR read-only, then write actions.
- Production cutover should not split daily operations unless a later decision
  explicitly creates a temporary bridge.
- The release is considered cutover-ready only after an end-to-end staging flow
  passes: PR request -> approval -> PO/direct PO -> vendor/expected-date state
  -> GR receive/reset/confirm -> PO/APV close state.

Rationale:

- V1 PR approval writes PO rows directly.
- V1 Direct PO bill identity must stay stable through GR.
- V1 GR links to specific PO line UIDs and drives receiving status.
- Operators should not need to check V1 for receiving while V2 owns PO writes,
  or vice versa, without a deliberate sync/bridge plan.

### Alternative Considered: Staged PR/PO First, GR Later

This can be allowed only as an explicit exception if the user prioritizes
PR/PO speed over receiving parity.

Required safeguards:

- V1 remains the source of truth for GR until GR cutover.
- V2 PR/PO must not create production PO rows that V1 GR cannot receive.
- Either a write-back/sync bridge to V1 PO/GR exists, or PR/PO remains
  staging-only/read-only until GR is ready.
- The cutover package must state which system owns each action on each day.

Without those safeguards, staged PR/PO-first cutover is not recommended.

### Integration Points

- V1 references:
  - `C:\dev\WEBAPP\development_context.md`
  - `C:\dev\WEBAPP\PR\Code.gs.txt`
  - `C:\dev\WEBAPP\PO\Code.gs.txt`
  - `C:\dev\WEBAPP\GR\Code.gs.txt`
- Supabase:
  - Existing staging schema `0013`; no new schema work in this plan.
- Vercel:
  - Preview/Development only until a PR/PO/GR cutover package is approved.
- LINE/GAS/Sheets/API:
  - V1 stays live and unchanged; no bridge or production writeback is approved
    by this plan.
- Secrets/env vars:
  - no new secrets.

## 4. UI/UX And User Flow

### User Flow

1. Requester creates a PR.
2. Supervisor approves/rejects the PR.
3. Purchasing creates or reviews PO rows, including Direct PO cases.
4. Receiving opens the same PO bill identity and records GR.
5. Purchasing/admin closes the PO/APV state after receiving is complete.

The recommended release gate keeps that whole chain in one system at cutover.

### Screens / States

- Screen: future PR/PO/GR runtime screens are still separate implementation
  slices.
- Empty state: no imported PR rows until a fresh PR CSV exists.
- Loading state: no change in this planning step.
- Error state: future runtime writes must not show success when any downstream
  PR/PO/GR link fails.
- Permission-denied state: route guards remain required for every runtime page.
- Mobile behavior: GR remains the strictest mobile workflow and should be
  verified at 390px before cutover.

### System Logic / Pseudocode

```text
recommended rollout:
  export fresh PR CSV
  rerun PR/PO/GR dry-run with PR coverage
  import PR/PO/GR to staging
  build read-only PR, PO, GR screens
  build write actions in PR -> PO -> GR order
  run end-to-end staging UAT
  prepare grouped cutover package
  wait for explicit user approval before production switch
```

## 5. Task Breakdown

1. Confirm release-shape decision with the user.
   - Recommended answer: grouped PR/PO/GR operational release.
   - If rejected, write a staged-rollout bridge plan before any runtime writes.

2. Get fresh PR CSV export.
   - Export the live V1 `PR` sheet into `import-data/po-pr-gr/`.
   - Do not modify V1 production Sheets from this repo.

3. Rerun and extend dry-run reconciliation.
   - Validate PR row counts, PR_UID uniqueness, PR -> PO coverage, PO -> GR
     coverage, orphan rows, and status/date/product/vendor/warehouse warnings.

4. Plan the PR/PO/GR data import slice.
   - Keep staging-only.
   - Preserve raw legacy fields and unresolved relationships.

5. Plan runtime UI/action sequence.
   - Read-only first: PR, PO, GR.
   - Writes after data proof: PR create/approve, PO create/direct/edit, GR
     receive/reset/confirm.

6. Prepare grouped cutover package after UAT.
   - Include reconciliation, role matrix, mobile checks, rollback, and clear
     system ownership rules.

## 6. Files Expected To Change

This planning step changes:

- `docs/plans/V2-0039-pr-po-gr-release-shape-decision.md`
- `docs/decisions/0021-pr-po-gr-grouped-release-shape.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/project-management/decision-board.md`
- `docs/plans/V2-0036-pr-po-gr-foundation.md`

Future implementation may change:

- `import-data/po-pr-gr/*PR*.csv`
- `scripts/pr-po-gr-import-dry-run.mjs`
- `scripts/pr-po-gr-import-apply.mjs`
- `src/app/purchasing/**`
- `src/app/receiving/**`
- `src/modules/purchasing/**`
- `src/modules/receiving/**`
- `docs/migration/**`
- `docs/runbooks/**`

## 7. Verification Steps

- Review this plan and ADR for consistency with `V2-0036`, ADR `0020`, and the
  migration plan.
- Run `git diff --check`.
- Confirm no runtime app code, Supabase schema, staging data, V1 production
  files, GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 8. Rollback / No-Production-Impact Note

This is documentation only. It changes no runtime code, database schema,
staging data, V1 production files, GAS deployments, Google Sheets schemas,
URLs, LINE tokens, or secrets.

If the user rejects the recommended grouped release, supersede ADR `0021` with
a staged-rollout bridge ADR before any runtime write implementation starts.

## 9. Open Questions

- Does the user accept grouped PR/PO/GR operational cutover as the default?
- When can a fresh live V1 `PR` CSV export be provided?
- Should the first PR/PO/GR import include all historical rows in the current
  snapshots, or active/open rows first?
- Which PO/GR notification paths are required before cutover?
- Should GR stock movement writes wait for the warehouse foundation?
- Who owns APV closeout in V2?

## 10. Handoff Notes

- Next action: proceed to `V2-0040` after the user provides a fresh PR CSV
  export from the live V1 `PR` sheet.
- Blockers: fresh PR CSV export.
- Related plans: `V2-0022`, `V2-0032`, `V2-0033`, `V2-0035`, `V2-0036`,
  `V2-0040`.
- Related ADRs: `0015`, `0016`, `0020`, `0021`.
