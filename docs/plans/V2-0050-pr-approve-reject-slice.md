# Plan V2-0050: PR Approve/Reject Slice

Status: Complete (2026-07-01).

User command:

```text
ลุยงานต่อได้เลย มีอะไรก็แพลนไว้ได้เลย
```

## 1. Goal

- Primary objective: add the next PR/PO/GR write-workflow slice after
  `V2-0049`: approve or reject a pending V2-native Purchase Requisition (PR)
  in one atomic server-side transaction.
- Success definition: a signed-in user with the selected purchasing approval
  permission can open `/purchasing/pr/[id]`, approve a `pr_pending` PR or reject
  it with a reason, and see the header, lines, and event history reflect the
  final `pr_approved` or `pr_rejected` state.
- User/business reason: approved PRs become the controlled input for the future
  PO-from-approved-PR slice; rejected PRs must close cleanly with an auditable
  reason and must not be eligible for PO creation.

## 2. Requirement And Scope Definition

### Problem

- `V2-0049` can create V2-native PRs, but every new PR stays `pr_pending`.
- The grouped PR -> PO -> GR release needs an explicit approval/rejection gate
  before PO generation is safe to implement.
- The current code has no workflow action for `pr_approved` or `pr_rejected`
  even though the schema and event check constraints already reserve those
  states.

### Users

- Primary users: supervisors or purchasing users responsible for accepting or
  rejecting PR requests in staging.
- Secondary users: requesters and purchasing staff who need to see whether a PR
  is approved, rejected, or still pending.
- Admin/support users: maintainers verifying transaction safety, event audit
  trail, and permission behavior before PO-from-PR work starts.

### MVP Features

- Add one service-role-only RPC for PR status transitions, following ADR
  `0015` and the same public-schema `SECURITY INVOKER` posture as
  `create_purchase_requisition(...)`.
- Enforce allowed transitions:
  - `pr_pending -> pr_approved`
  - `pr_pending -> pr_rejected`
  - reject repeat transitions or direct changes from terminal states.
- Update the PR header and all PR lines atomically.
- Record `pr_approved` or `pr_rejected` in `purchasing_events`.
- Require a non-empty rejection reason for `pr_rejected`.
- Add writer-only action controls to `/purchasing/pr/[id]` for pending PRs.
- Keep approved/rejected PRs read-only in this slice; no PO creation yet.

### Nice-To-Have Features

- Dedicated `purchasing.approve` permission.
- Multi-step approval levels.
- LINE notifications for approval/rejection.
- Edit-and-resubmit after rejection.
- PO creation from approved PR.

### Out Of Scope

- Creating PO records.
- Editing PR header/lines.
- Reopening a rejected PR.
- Changing imported legacy PO/GR data.
- V1 Sheet/GAS writeback.
- Production cutover.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, extending the existing PR detail page.
- Backend/server boundary: server actions calling a service-role Supabase RPC
  only after server-side permission checks.
- Database: one new migration under `supabase/migrations`.
- Auth/permissions: MVP uses the existing `purchasing.write` permission.
  A future `purchasing.approve` permission should be a separate role-mapping
  slice if approval must be separated from PR creation/editing.
- Deployment: staging/local/Preview/Development only; production remains gated.

### Data Model / Schema

- Tables written:
  - `public.purchasing_purchase_requests`
  - `public.purchasing_purchase_request_lines`
  - `public.purchasing_events`
- Status changes:
  - header `status` becomes `pr_approved` or `pr_rejected`;
  - all lines on the PR receive the same status;
  - approve sets `approved_by_profile_id`, `approved_by_name`, and
    `approved_at`;
  - reject sets `rejected_reason`;
  - raw status stores a V2-readable label such as `V2 Approved` or
    `V2 Rejected`.
- Constraints:
  - existing check constraints already allow `pr_pending`, `pr_approved`, and
    `pr_rejected`;
  - existing event constraints already allow `pr_approved` and `pr_rejected`.
- RLS/security notes:
  - do not add authenticated update policies;
  - server action uses `createAdminClient()` after `requirePermission()`;
  - RPC execute is revoked from `public`, `anon`, and `authenticated`, granted
    only to `service_role`;
  - RPC must stay default `SECURITY INVOKER`.

### Integration Points

- V1 references: approval/rejection terminology should stay aligned with
  `docs/migration/pr-po-gr-v1-mapping.md` and V1 PR/PO/GR behavior where
  available.
- Supabase: verify current official docs/changelog again before implementing
  the migration/RPC.
- Vercel: no deployment setting changes in this slice.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: no new secrets.

## 4. UI/UX And User Flow

### User Flow

1. User signs in and opens `/purchasing/pr/[id]`.
2. Server checks `purchasing.read` or `purchasing.write` to render the page.
3. If the PR is `pr_pending` and the user has approval permission, show action
   controls.
4. User clicks approve, or enters a rejection reason and clicks reject.
5. Server action checks approval permission, calls the atomic RPC, then
   redirects back to the same PR detail page.
6. Page shows the new status, updated metadata, and history event.

### Screens / States

- Screen: `/purchasing/pr/[id]`
  - pending state: show approve/reject controls to allowed users;
  - approved state: show approval metadata and no workflow buttons;
  - rejected state: show rejection reason and no workflow buttons.
- Empty state: not applicable.
- Loading state: native submit pending state is enough for first slice.
- Error state: compact message from server action; no internal SQL details.
- Permission-denied state: existing `AccessDenied`.
- Mobile behavior: action controls must stay one-column and no horizontal
  overflow at 390px.

### System Logic / Pseudocode

```text
server action approvePurchaseRequisition(id):
  require approval permission
  get authenticated user/profile
  call transition_purchase_requisition_status(id, "pr_approved", actor)
  redirect back to /purchasing/pr/{id}

server action rejectPurchaseRequisition(id, reason):
  require approval permission
  validate non-empty reason
  get authenticated user/profile
  call transition_purchase_requisition_status(id, "pr_rejected", actor, reason)
  redirect back to /purchasing/pr/{id}

RPC transition_purchase_requisition_status(...):
  lock target PR row for update
  require current status = pr_pending
  require target in pr_approved/pr_rejected
  require reason for rejection
  update header
  update all lines
  insert purchasing_events row
  return id/status
```

## 5. Task Breakdown

1. [x] Run `V2-0049` signed-in browser UAT first, or explicitly record why this
   approval slice is proceeding before that UAT.
2. [x] Re-check current Supabase docs/changelog for public RPC grant/RLS
   posture before staging apply.
3. [x] Draft migration for
   `public.transition_purchase_requisition_status(...)`.
4. [x] Extend `scripts/verify-staging-schema.mjs` to include the new
   service-role RPC.
5. [x] Add PR transition server actions.
6. [x] Add pending-only approve/reject controls to `/purchasing/pr/[id]`.
7. [x] Use existing PR detail read-model fields for approval/rejection
   metadata and add readable PR event labels.
8. [x] Apply migration to staging and run direct transaction-wrapped RPC smoke
   tests for approve, reject, invalid direct/repeat transitions, and rejection
   without reason.
9. [x] Browser-verify writer/admin can act, reader cannot act, terminal states
   hide actions, 390px has no overflow, and console has no errors.
10. [x] Update handoff docs and plan index with the inspection status.

## 6. Files Expected To Change

- `supabase/migrations/*_pr_approve_reject_slice.sql`
- `scripts/verify-staging-schema.mjs`
- `src/modules/purchasing/transition-pr-action.ts`
- `src/modules/purchasing/pr-transition-controls.tsx`
- `src/modules/purchasing/read-model.ts`
- `src/modules/purchasing/format.ts`
- `src/app/purchasing/pr/[id]/page.tsx`
- `src/app/globals.css`
- `src/modules/purchasing/README.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/migration/database-strategy.md`

## 7. Verification Steps

- `npm run check:migrations` - passed 2026-07-01.
- `npm run db:apply-migrations -- <new migration>` against staging
- `npm run db:verify-staging-schema`
- Direct transaction-wrapped RPC smoke tests:
  - pending -> approved succeeds and inserts one event;
  - pending -> rejected succeeds with reason and inserts one event;
  - pending -> rejected without reason fails;
  - approved/rejected -> anything fails.
- `npm run lint`
- `npm run lint` - passed 2026-07-01 with only the existing `V2-0048`
  FigJam generator warnings.
- `npm run typecheck` - passed 2026-07-01.
- `npm run build` if `next-env.d.ts` churn is accepted or restored afterward.
- Browser UAT through the real app for writer/admin/reader states and 390px
  mobile layout.
- `git diff --check` - passed 2026-07-01 with line-ending warnings only.

All verification steps run on 2026-07-01:
- `V2-0049` signed-in browser UAT: **15/15 PASSED** (PR create, permission
  gates, mobile 390px zero overflow, no console errors).
- Supabase docs/changelog recheck: confirmed ADR `0015` service-role-only
  RPC posture is current (no changes needed to migration).
- Migration applied to staging 2026-07-01 (`npm run db:apply-migrations`):
  `20260629102300_pr_approve_reject_slice.sql`.
- `npm run db:verify-staging-schema` passed (36 tables, 34 policies).
- Direct RPC smoke tests (5/5): approve, reject-with-reason,
  reject-no-reason (must fail), terminal-repeat-approve (must fail),
  terminal-repeat-reject (must fail) — all inside `BEGIN`/`ROLLBACK`.
- `V2-0050` browser UAT: **15/15 PASSED** — writer (SUPERVISOR) can approve
  and reject; transition panel hidden on terminal-state PRs; approved
  metadata panel and rejected-reason metadata panel visible; history events
  correct; GUEST denied on `/purchasing` and `/purchasing/pr/new`; 390px
  zero overflow; zero console errors.

## 8. Rollback / No-Production-Impact Note

This is V2-only and staging-first. V1 remains the live production workflow.
Before cutover, rollback is disabling or reverting the new V2 action controls
and deleting synthetic staging PR rows created for tests if needed. Do not touch
V1 Sheets, GAS deployments, URLs, LINE tokens, or production data.

## 9. Open Questions

- Resolved recommendation for MVP: use existing `purchasing.write`.
  Introducing `purchasing.approve` should be deferred until the business needs
  approval separation from PR creation/editing, because it requires permission
  schema/seed/import and role-mapping work beyond this workflow slice.
- Which real role should own approval/rejection during UAT: `SUPERVISOR`,
  `ADMIN`, `AKRA`, or another mapped role?
- Should rejected PRs be permanently terminal, or should a later edit/resubmit
  slice reopen them?

## 10. Handoff Notes

- Complete on 2026-07-01. All tasks done, verified, and committed.
- Test accounts `v2050-sup@akra-v2.test` and `v2050-guest@akra-v2.test`
  created for UAT; confirmed absent via service-role profile lookup and Auth
  Admin API `listUsers` filtering on 2026-07-01.
- `.playwright-cli/` untracked artifacts cleaned before commit.
- `next-env.d.ts` churn self-resolved (file reverted to prior state during
  typecheck run; excluded from commit).
- No `purchasing.approve` permission introduced in this slice; deferred unless
  business needs approval separated from PR creation/editing.
- Production cutover remains gated by readiness task 7, grouped PR/PO/GR UAT,
  and explicit user approval.
- Related plans: `V2-0039`, `V2-0046`, `V2-0047`, `V2-0049`.
- Related ADRs: `0015`, `0020`, `0021`, `0025`, `0026`.
