# Plan V2-0027: Picking LINE Notification And Failure Recovery

Status: Complete - executed 2026-06-22

Go command (no Architect step preceded this; plan drafted as part of `Go`
execution per `docs/handoff/current-state.md` Next Action 7 and
`docs/project-management/decision-board.md`'s recommended next move):

```text
Go:
```

## 1. Goal

- Primary objective: add a server-side LINE notification path for newly
  created Picking requisitions, starting disabled/dry-run per ADR `0018`, with
  a non-blocking failure record and a manual retry action.
- Success definition: every requisition create attempts a notification step
  that never blocks the create itself; the default (disabled) path always
  records a `line_notification_skipped` event; a simulated failure path
  (enabled with no LINE credentials configured) records `line_push_failed`
  without touching `picking_requisitions.status`; a writer/admin can retry a
  failed notification from `/picking/[id]`; no LINE identifiers are ever
  written to an authenticated-readable column.
- User/business reason: `V2-0022`'s next-step chain and the decision board
  both name LINE notification/failure recovery as the next Picking slice after
  problem reporting (`V2-0025`, complete), ahead of the Picking cutover
  package.

## 2. Requirement And Scope Definition

### Problem

- V2 Picking has no LINE integration yet. V1 sends a LINE push (mention +
  flex bill card with pick/ship action buttons) to a group on every
  `saveRequisition` call; on push failure V1 still saves the bill and returns
  a warning, leaving `lineStatus: "pending"` (`C:\dev\WEBAPP\Picking\Code.gs.txt`
  lines ~168-210).
- ADR `0018` already decided LINE staging starts disabled/dry-run; this slice
  implements that decision rather than re-deciding it.

### Users

- Primary users: Picking writers/admins creating requisitions and retrying a
  failed notification.
- Secondary users: Picking readers viewing the lifecycle timeline.
- Admin/support users: maintainers verifying the three notification outcomes
  in staging.

### MVP Features

- `src/modules/picking/line-notification.ts` (plain server-only module):
  `sendPickingLineNotification(requisitionId, actor)` that:
  - Defaults to dry-run (`PICKING_LINE_PUSH_ENABLED !== "true"`): writes a
    `line_notification_skipped` event, no network call, no status change.
  - If enabled but `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` are not configured:
    writes `line_push_failed` (event only — **status is not changed**, this is
    the deliberate divergence from the originally-reserved blocking design;
    see Decision below), no network call.
  - If enabled and configured: attempts a real LINE push, mirroring V1's
    `pushLineMessages`; records `line_notification_sent` (capturing
    `quoteToken` into `picking_requisition_secrets`, server-only) on success or
    `line_push_failed` on a non-2xx response/network error. This branch is
    unproven in this slice — staging has no real LINE credentials.
- `src/modules/picking/line-notification-action.ts` (`"use server"`):
  `retryPickingLineNotification(requisitionId)`, guarded by
  `picking.write`, re-runs the send, redirects back to `/picking/[id]`.
- Hook the send into `create-action.ts` after a successful
  `create_picking_requisition` RPC call, wrapped in its own `try/catch` so a
  notification failure never blocks the create (matches V1's "push is outside
  the lock" comment).
- `/picking/[id]`: show a "Retry LINE notification" button (writer/admin-only)
  when the latest LINE-related lifecycle event is `line_push_failed`.
- Migration `0012`: widen `picking_requisition_events_type_check` to allow
  `line_notification_sent` and `line_notification_skipped` (`line_push_failed`
  already exists from `0004`).

### Nice-To-Have Features

- Real flex-card parity with V1's exact message layout.
- Automatic retry/backoff instead of manual retry.
- Surfacing notification outcome on the `/picking` list view.

### Out Of Scope

- Changing `picking_requisitions.status` based on notification outcome (see
  Decision below).
- The LINE webhook/postback receiver (pick/ship postback handling) — out of
  scope until a cutover package needs inbound LINE events.
- Verifying a real LINE send end-to-end (no staging credentials exist yet).
- Changing V1 Picking, GAS, Sheets, GitHub Pages, live URLs, or LINE tokens.

### Decision: Failure Does Not Block Status (Option B)

The schema reserves a `line_push_failed` **status** value (migration `0004`),
which would suggest blocking the requisition in a `line_push_failed` state
until a retry succeeds. Rejected after advisor review: migration `0010` only
allows `pending -> picked`, so a requisition stuck in `line_push_failed`
status could never be marked picked without new transition rules, and V1's
own behavior on push failure is explicitly non-blocking (saves the bill with a
warning, `lineStatus` stays `"pending"`). This plan keeps `status` untouched on
every notification outcome and uses the event log alone (`line_push_failed`
event type, already valid) as the failure signal the retry button reads. This
keeps V1 parity as the project's stated default and avoids new interaction
with the existing transition RPC. The reserved status value stays unused for
now; revisit only if a future requirement needs a blocking state, with its own
ADR.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: existing `/picking/[id]` detail page, plain `<form>` server action
  button (no new client component).
- Backend/server boundary: new plain server-only module
  (`line-notification.ts`) plus a thin `"use server"` action wrapper for
  retry, called from `create-action.ts` (creation-time) and the new retry
  form.
- Database: one migration altering a check constraint only — no new tables,
  no new RPC (the operation is a single admin-client event insert plus an
  optional secrets upsert; no multi-row atomicity requirement, unlike
  `0009`/`0010`/`0011`).
- Auth/permissions: retry requires `picking.write`; the creation-time call
  runs after `create_picking_requisition`'s own `picking.write` guard, with no
  separate guard needed.
- Deployment: local + staging only, same as prior Picking slices.

### Data Model / Schema

- Tables involved: `picking_requisition_events` (constraint widened),
  `picking_requisition_secrets` (`line_card_quote_token`, only written on a
  real send success — unproven this slice), `picking_staff_line_accounts`
  (read via admin client only, never exposed to an authenticated read).
- Migration `0012_picking_line_notifications.sql`: drop and recreate
  `picking_requisition_events_type_check` to include
  `line_notification_sent`/`line_notification_skipped` alongside the existing
  `created`/`line_push_failed`/`picked`/`problem_reported`/`sent`/`cancelled`.
- RLS/security notes: no new RLS surface. All writes go through
  `createAdminClient()` (service_role, already granted insert on
  `picking_requisition_events`/`picking_requisition_secrets` by `0005`).
  **Correction from an earlier draft of this section:** `0005` grants
  `select` on `picking_requisition_events` to `authenticated` at the table
  level (policy-gated by `picking.read`/`picking.write`, not column-gated),
  so event `metadata` *is* readable by any `picking.read` user directly via
  the Data API — `read-model.ts` selecting only `id, event_type, actor_name,
  created_at` is an application-code choice, not a security boundary. The
  actual control is content discipline: `metadata` must only ever hold a
  benign message string, never a LINE identifier or token. The `quoteToken`
  is therefore written to `picking_requisition_secrets` (no authenticated
  select policy exists on that table), not to event `metadata`.

### Integration Points

- V1 references: `C:\dev\WEBAPP\Picking\Code.gs.txt` (`pushLineFlex`,
  `pushLineMessages`, `buildBillCard`) — read-only, confirms push-outside-lock
  and non-blocking-failure behavior.
- Supabase: admin-client inserts only; no new Data API exposure.
- Vercel: no new required env for the default (disabled) path; `enabled=true`
  with real credentials is a future, separately-approved step.
- LINE/GAS/Sheets/API: outbound push only, gated by
  `PICKING_LINE_PUSH_ENABLED`; no inbound webhook in this slice.
- Secrets/env vars: `PICKING_LINE_PUSH_ENABLED` (`"true"`/unset), server-only
  `LINE_CHANNEL_TOKEN`, `LINE_GROUP_ID` — none committed, added as `.env.example`
  placeholders only.

## 4. UI/UX And User Flow

### User Flow

1. Writer creates a requisition via `/picking/new`.
2. Server creates the requisition (existing RPC), then attempts a
   notification (disabled by default -> `line_notification_skipped` event),
   then redirects to `/picking/[id]` regardless of notification outcome.
3. If the notification attempt fails (only reachable in this slice via
   `enabled=true` + missing credentials), `/picking/[id]` shows a "Retry LINE
   notification" button next to existing actions, writer/admin-only.
4. Clicking retry re-runs the send and redirects back; a cleared failure
   removes the button (latest LINE event is no longer `line_push_failed`).

### Screens / States

- Screen: `/picking/[id]` (no new route).
- Empty/loading state: unchanged.
- Error state: notification failure never surfaces as a page error; it is
  visible only via the retry button and the existing lifecycle timeline
  (raw `event_type` text, same rendering as every other event).
- Permission-denied state: retry button hidden for readers; the action itself
  still re-checks `picking.write`.
- Mobile behavior: button joins the existing `.workspace-header__actions`
  group, no horizontal overflow at 390px.

### System Logic / Pseudocode

```text
on create_picking_requisition success:
  try: sendPickingLineNotification(requisitionId, actor)
  catch: ignore (notification must never block create)
  redirect /picking/:id

sendPickingLineNotification(requisitionId, actor):
  if not enabled:
    outcome = skipped
  else if missing LINE_CHANNEL_TOKEN/LINE_GROUP_ID:
    outcome = failed (no network call)
  else:
    try: real push -> sent (capture quoteToken) | failed (http/network error)
  insert picking_requisition_events(event_type = map(outcome), metadata = {message})
  if outcome == sent and quoteToken: upsert picking_requisition_secrets

render /picking/[id]:
  latestLineEvent = last event in events where type in (sent|skipped|failed-line types)
  if canWrite and latestLineEvent.type == line_push_failed:
    render "Retry LINE notification" form -> retryPickingLineNotification
```

## 5. Task Breakdown

1. Add migration `0012_picking_line_notifications.sql` (check-constraint
   widen only). Apply to staging, verify with `check:migrations` +
   `db:verify-staging-schema`.
2. Add `src/modules/picking/line-notification.ts`.
3. Add `src/modules/picking/line-notification-action.ts`.
4. Hook the send into `src/modules/picking/create-action.ts` (before
   `redirect`, in its own `try/catch`).
5. Add the retry button to `src/app/picking/[id]/page.tsx`.
6. Add `.env.example` placeholders for the three new env vars.
7. Run `lint`/`typecheck`/`build`/`git diff --check`.
8. Smoke-test all three reachable outcomes directly against staging
   (skipped/default, failed/enabled-without-credentials, retry-clears-failure)
   using throwaway requisitions, deleted after.
9. Browser-verify the retry button's role gating and mobile width.
10. Update handoff docs and decide the next slice (Picking cutover package).

## 6. Files Expected To Change

- `supabase/migrations/0012_picking_line_notifications.sql`
- `src/modules/picking/line-notification.ts`
- `src/modules/picking/line-notification-action.ts`
- `src/modules/picking/create-action.ts`
- `src/app/picking/[id]/page.tsx`
- `.env.example`
- `docs/plans/V2-0027-picking-line-notification-failure-recovery.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/project-management/decision-board.md`
- `docs/migration/module-inventory.md`

## 7. Verification Steps

- `npm run check:migrations`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `npm run db:verify-staging-schema` after applying the migration.
- Direct smoke test against staging (throwaway requisition, deleted after):
  default call writes exactly one `line_notification_skipped` event and
  leaves `status` untouched; `PICKING_LINE_PUSH_ENABLED=true` with no
  `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` set writes exactly one
  `line_push_failed` event with zero network calls and leaves `status`
  untouched; a retry call after that clears to a `line_notification_skipped`
  event (back to default config) and the button condition would no longer
  match.
- Browser verification: `PICKING_READER` never sees the retry button even on
  a failed bill; `PICKING_WRITER`/`ADMIN` see and can use it; no horizontal
  overflow at 390px; no console errors.

## 8. Rollback / No-Production-Impact Note

This plan only widens a check constraint (additive, reversible by recreating
the prior constraint) and adds V2 app code. No destructive schema change, no
V1 production impact, no real LINE credentials introduced. Rollback: revert
the constraint to its `0011` definition and remove the new modules/hook/button.

## 9. Open Questions

- None blocking for this slice. Real-send verification (with actual LINE
  credentials) and the inbound postback webhook remain open until a later,
  explicitly-approved step.
- Deliberate, not yet revisited: the retry button (and
  `sendPickingLineNotification` itself) has no requisition-status guard — a
  bill that failed notification and was later marked `sent` still shows
  "Retry LINE notification," and retrying re-notifies a completed bill. Safe
  while disabled/dry-run (no real message goes anywhere); becomes a real
  product question only once real sends are approved. Revisit then rather
  than guessing the right guard now.

## 10. Handoff Notes

- Outcome: implemented and verified against staging exactly as planned, with
  Option B (failure does not block status) confirmed by advisor review before
  writing the migration. Migration `0012` widens
  `picking_requisition_events_type_check`; no new tables/RPC were needed —
  `sendPickingLineNotification` writes a single event via the existing
  service-role admin client (plus an optional `picking_requisition_secrets`
  upsert on a real-send success, unproven this slice). All three reachable
  outcomes were verified end to end through the real running app (sign-in,
  `/picking/new`, `/picking/[id]`), not just direct DB/RPC calls:
  - Default (disabled): create -> `line_notification_skipped` event, no
    retry button, zero overflow at 390px, no console errors.
  - Enabled + missing `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID`: create ->
    `line_push_failed` event with zero network calls; retry button visible
    to `PICKING_WRITER`, confirmed absent for `PICKING_READER` on the same
    bill.
  - Retry while still misconfigured: idempotent, appends another
    `line_push_failed` event, button stays.
  - Retry after reverting the flag: appends `line_notification_skipped`,
    button disappears (recovery confirmed).
  A direct DB smoke test (throwaway requisition, deleted after) separately
  confirmed the widened check constraint accepts all three new/existing
  event types and still rejects a garbage type, with
  `picking_requisitions.status` unchanged after every insert. The real LINE
  push branch (`fetch` to the Messaging API) compiles and type-checks but is
  unexercised — no staging credentials exist — same "unproven, flagged in
  handoff" treatment as the deployed-create gap noted after `V2-0020`.
  `lint`/`typecheck`/`build`/`git diff --check`/`check:migrations`/
  `db:verify-staging-schema` all pass. A separate concurrent session's
  documentation-only `V2-0028` work was found mid-task already modifying
  `docs/plans/index.md`/`docs/handoff/current-state.md`/
  `docs/handoff/work-log.md`; this slice's handoff edits were layered on top
  rather than reverting it, per the "do not revert work you did not make"
  rule. No V1 production files changed; both browser-test requisitions were
  deleted after verification; Playwright was removed; `.env.local`'s
  temporary `PICKING_LINE_PUSH_ENABLED=true` line was reverted.
- Next action: Picking cutover package, per `V2-0022`'s chain.
- Blockers: none for this slice; real-send path stays unproven until
  credentials are provisioned and explicitly approved.
- Related plans: `V2-0019`, `V2-0020`, `V2-0023`, `V2-0025`, `V2-0022`.
- Related ADRs: `0018` (LINE disabled/dry-run decision this slice implements).
