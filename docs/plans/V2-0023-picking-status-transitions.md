# Plan V2-0023: Picking Status Transitions

Status: Complete - executed 2026-06-20

Go command (no Architect step preceded this; plan drafted as part of `Go` execution per `docs/handoff/current-state.md` Next Action 5):

```text
Go
```

## 1. Goal

- Primary objective: let `picking.write` users advance a requisition through
  `pending -> picked -> sent` from `/picking/[id]`, server-verified and
  written atomically.
- Success definition: a writer/admin can mark a pending bill picked and a
  picked bill sent from the UI; readers/guests/signed-out users cannot;
  invalid transitions (e.g. pending -> sent) are rejected server-side; each
  transition writes exactly one lifecycle event.
- User/business reason: this is the first deferred Picking closeout item per
  `V2-0022`'s next-step chain (status transitions before problem reporting and
  LINE), and the create-requisition slice (`V2-0020`) already proved the
  atomic-RPC pattern this slice reuses.

## 2. Requirement And Scope Definition

### Problem

- Requisitions can only be created and read; there is no in-app way to move a
  bill forward, so every bill stays `pending` forever in V2.
- V1 advanced bills via LINE postbacks (`pick`, `ship`); V2 defers LINE, so an
  in-app equivalent is needed before LINE/problem-reporting slices make sense.

### Users

- Primary users: Picking writers (pickers) marking bills picked/sent.
- Secondary users: Picking readers/supervisors watching status change.
- Admin/support users: maintainers verifying transition rules in staging.

### MVP Features

- Atomic `public.transition_picking_requisition_status(...)` RPC
  (service-role-only) that validates the current status, updates
  status/timestamp/actor columns, and writes a matching lifecycle event in one
  call.
- Allowed transitions: `pending -> picked`, `picked -> sent`. All other
  requested targets (including `pending -> sent`) are rejected.
- Server action `transitionPickingRequisitionStatus` guarded by
  `requirePermission({ permission: "picking.write" })`.
- `/picking/[id]` shows a "Mark picked" button when `status === "pending"` and
  a "Mark sent" button when `status === "picked"`, both writer/admin-only.
- Page re-renders with the new status/timestamp/event after a transition.

### Nice-To-Have Features

- Undo/revert transitions.
- Bulk transition from the list view.
- Optimistic client-side status update before server confirmation.

### Out Of Scope

- Problem reporting (next slice).
- LINE notification/failure recovery (deferred slice after problem reporting).
- `cancelled` status (no V1/V2 UI path defined yet).
- Stock/inventory side effects of marking a line picked.
- Changing V1 Picking frontend, GAS backend, Sheets, GitHub Pages, live URLs,
  LINE tokens, or production data.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: existing `AppShell`/detail page, plain `<form>` server actions
  (no new client component needed).
- Backend/server boundary: new server-only action in
  `src/modules/picking/transition-action.ts`, calling the new RPC via the
  existing `createAdminClient()`.
- Database: one new migration adding the transition function only (no new
  tables/columns; `picked_by_name`/`picked_at`/`sent_by_name`/`sent_at`
  already exist on `picking_requisitions` from `0004`).
- Auth/permissions: `picking.write` required to transition; `picking.read` or
  `picking.write` remains sufficient to view status.
- Deployment: local + staging only, same as prior Picking slices.

### Data Model / Schema

- Tables involved: `picking_requisitions`, `picking_requisition_events`.
- New migration: `supabase/migrations/0010_picking_status_transitions.sql`
  adds `public.transition_picking_requisition_status(p_requisition_id uuid,
  p_target_status text, p_actor_profile_id uuid, p_actor_name text)`.
- Constraints: function rejects any `p_target_status` other than `picked`/
  `sent`, and rejects the call if the current status does not match the
  required predecessor (`pending` for `picked`, `picked` for `sent`). Row is
  locked with `for update` for the duration of the check+write.
- RLS/security notes: function is default `SECURITY INVOKER` (not definer),
  `EXECUTE` revoked from `public`/`anon`/`authenticated`, granted only to
  `service_role` — identical posture to
  `public.create_picking_requisition`. No new tables, so no new RLS surface.

### Integration Points

- V1 references: `docs/migration/picking-v1-mapping.md` Workflow Mapping
  section (`pick` -> `pending -> picked`; `ship` -> `picked -> sent`;
  `pending -> sent` blocked).
- Supabase: reuses the existing service-role RPC pattern from `0009`; no new
  Data API exposure decisions needed.
- Vercel: no new env vars; `SUPABASE_SECRET_KEY` already configured.
- LINE/GAS/Sheets/API: none in this slice.
- Secrets/env vars: none new.

## 4. UI/UX And User Flow

### User Flow

1. Writer/admin opens `/picking/[id]` for a `pending` bill.
2. Page shows a "Mark picked" button next to the status pill.
3. Writer submits; server re-checks permission and current status, updates
   the row, writes a `picked` event, and the page re-renders showing `Picked`
   status, the picked timestamp/actor, and the new event in the timeline.
4. Writer/admin opens the same bill once `picked` and sees "Mark sent"
   instead; submitting moves it to `sent` the same way.
5. Readers/guests/signed-out users never see either button; direct action
   invocation is rejected server-side regardless of UI state.

### Screens / States

- Screen: `/picking/[id]`.
- Empty/loading state: unchanged from existing detail page.
- Error state: if the RPC rejects (stale status, race with another actor),
  show the existing compact error pattern, no raw Postgres error text.
- Permission-denied state: no buttons rendered for non-writers; the action
  itself still re-checks and denies.
- Mobile behavior: buttons stack with existing `.workspace-header__actions`
  pattern, no horizontal overflow at 390px.

### System Logic / Pseudocode

```text
render /picking/[id]:
  guard = requirePermission(anyOf: ["picking.read", "picking.write"])
  if denied: render AccessDenied
  load requisition detail
  canWrite = can(guard.snapshot, "picking.write")
  if canWrite and status === "pending": render "Mark picked" form
  if canWrite and status === "picked": render "Mark sent" form

transition action(requisitionId, targetStatus):
  guard = requirePermission(permission: "picking.write")
  if denied: return denied
  user = current authenticated user/profile
  admin.rpc("transition_picking_requisition_status", {
    p_requisition_id: requisitionId,
    p_target_status: targetStatus,
    p_actor_profile_id: user.id,
    p_actor_name: requesterDisplayName,
  })
  if error: return error
  redirect /picking/:id
```

## 5. Task Breakdown

1. Add migration `0010_picking_status_transitions.sql` with the atomic
   transition RPC.
2. Apply to staging (`npm run db:apply-migrations -- 0010_picking_status_transitions.sql`)
   and verify (`npm run check:migrations`, `npm run db:verify-staging-schema`).
3. Add `src/modules/picking/transition-action.ts` server action.
4. Add status-transition buttons to `src/app/picking/[id]/page.tsx`.
5. Smoke-test the RPC directly against staging: valid `pending -> picked ->
   sent` path, and a rejected `pending -> sent` attempt; delete test rows
   after.
6. Run `lint`/`typecheck`/`build`/`git diff --check`.
7. Browser-verify roles (reader cannot see/use buttons, writer/admin can
   transition both steps), mobile width, console errors.
8. Update handoff docs and decide next slice (problem reporting, per
   `V2-0022`).

## 6. Files Expected To Change

- `supabase/migrations/0010_picking_status_transitions.sql`
- `src/modules/picking/transition-action.ts`
- `src/app/picking/[id]/page.tsx`
- `docs/plans/V2-0023-picking-status-transitions.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 7. Verification Steps

- `npm run check:migrations`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `npm run db:verify-staging-schema` after applying the migration.
- Direct RPC smoke test against staging: valid forward path writes exactly one
  event per transition and updates the right timestamp/actor columns; an
  out-of-order call (`pending -> sent`) is rejected and writes nothing.
- Browser verification against staging:
  - `PICKING_READER` sees status but no transition buttons.
  - `PICKING_WRITER`/`ADMIN` can mark a `pending` bill picked, then sent.
  - `/picking/[id]` has no horizontal overflow at 390px after the change.
  - No browser console errors.

## 8. Rollback / No-Production-Impact Note

This plan only adds a new Postgres function (no destructive schema change) and
V2 app code. Rollback is `drop function
public.transition_picking_requisition_status(uuid, text, uuid, text);` plus
reverting the app code change. V1 Picking remains untouched. Any staging rows
used for smoke/browser testing are deleted after verification.

## 9. Open Questions

- None blocking. `cancelled` status and problem-triggered auto-`picked` (per
  V1's `problem.html` rule) are deferred to the problem-reporting slice.

## 10. Handoff Notes

- Outcome: implemented and verified against staging. Migration `0010`
  (`public.transition_picking_requisition_status(...)`) applies the planned
  posture exactly (default SECURITY INVOKER, EXECUTE revoked from
  public/anon/authenticated, granted only to service_role) and enforces
  `pending -> picked` / `picked -> sent` only. A real bug was caught and fixed
  during direct RPC smoke-testing: the function's `returns table (id uuid,
  status text)` clause creates implicit PL/pgSQL output variables, so bare
  `status`/`id` references inside the function body were ambiguous against
  the `picking_requisitions` columns (`column reference "status" is
  ambiguous`). Fixed by aliasing the table (`picking_requisitions pr`) and
  qualifying every reference (`pr.status`, `pr.id`). Re-tested the full
  forward path plus rejected `pending -> sent` and rejected repeat-`picked`
  calls — all correct, exactly one event written per successful transition.
  Added `src/modules/picking/transition-action.ts`
  (`transitionPickingRequisitionStatus`, `requirePermission({ permission:
  "picking.write" })`, calls the RPC via `createAdminClient()`, redirects back
  to the same detail page on success, returns void/no-op on denial or RPC
  error — no user-facing error message in this minimal slice). Added "Mark
  picked"/"Mark sent" buttons to `/picking/[id]` next to the status pill,
  gated by `can(guard.snapshot, "picking.write")` and the current status.
  Browser-verified against staging with a temporary local Playwright install
  (removed after, same pattern as `V2-0019`/`V2-0020`; user approved the
  temporary test-account password reset for this session):
  `PICKING_READER` sees status but no transition buttons; `PICKING_WRITER`
  completed the full pending -> picked -> sent flow with zero horizontal
  overflow at 390px before/after; `ADMIN` can transition too; no console
  errors in any check. `lint`/`typecheck`/`build`/`git diff --check` all pass.
  No V1 production files changed; all staging writes during
  verification (smoke-test and browser-test requisitions) were deleted after.
- Next action: problem reporting is next per `V2-0022`'s chain.
- Blockers: none.
- Note for the future LINE slice: the RPC `raise exception`s on a stray/
  out-of-order call (e.g. a repeat postback for an already-`picked` bill).
  The in-app server action here absorbs that into a silent no-op, but V1's
  LINE postback handling expects repeat taps to be idempotent/no-op at the
  webhook layer too (`docs/migration/picking-v1-mapping.md`) — the LINE
  webhook handler will need to catch that exception and ack normally rather
  than surface it as a failure.
- Related plans: `V2-0019`, `V2-0020`, `V2-0022`.
- Related ADRs: `0012`, `0013`, `0015` (service-role-only RPC pattern this
  slice reuses).
