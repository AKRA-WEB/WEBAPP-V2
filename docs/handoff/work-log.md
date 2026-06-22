# Work Log

This file keeps only recent handoff entries for quick resume.

Older entries are archived:

- `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`
- `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`
- `docs/handoff/archive/work-log-2026-06-20-status-transitions-through-operating-model.md`

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

## 2026-06-20 - Picking Status Transitions (V2-0023)

See `docs/handoff/archive/work-log-2026-06-20-status-transitions-through-operating-model.md`
for full detail. Summary: migration `0010`'s atomic
`transition_picking_requisition_status(...)` RPC enforces `pending -> picked`
and `picked -> sent` only; verified via RPC smoke test and full browser role
matrix.

## 2026-06-20 - Database Structure Data-Flow HTML (V2-0026)

Context:

- User asked for an easy-to-read HTML view of the database structure and data
  flow for each app/module.
- Read Supabase and modern-web-guidance skill instructions, retrieved current
  HTML/CSS layout guidance, and inspected current migrations and migration
  docs before writing the artifact.
- Workspace contains local untracked Picking problem-reporting work
  (`V2-0025`, migration `0011`, route/action/form). The new HTML labels that
  flow as local in-progress/uncommitted rather than verified baseline.

Changes:

- Added `docs/database/data-flow.html`: static HTML with responsive cards,
  flow steps, schema map, and app/module sections for Main/Core, shared
  catalog/warehouse, Picking, PR/PO, GR, TRDAKRA/W5, Returnitem, KPI, and
  Notifications.
- Added `docs/plans/V2-0026-database-data-flow-html.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md`.

Verification:

- Documentation-only change; no runtime app code, Supabase schema, staging
  data, V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets changed.
- `git diff --check` passed; Git printed existing line-ending warnings for
  some working-copy files, but no whitespace errors.

## 2026-06-20 - Picking Problem Reporting (V2-0025)

Context:

- User sent `Go` (bare, no plan ID, no colon). `docs/handoff/current-state.md`
  Next Action 6 and `docs/project-management/decision-board.md`'s
  "Recommended Next Move" both named Picking problem reporting as the next
  slice after status transitions (`V2-0023`); no plan file existed yet, so
  drafted `V2-0025` inline as part of execution, matching the
  `V2-0017`/`V2-0023` precedent.
- Read `docs/migration/picking-v1-mapping.md`, ADR `0018` (no auto-`picked`
  side effect, LINE dry-run-first, V1 history stays archived), the existing
  `picking_problem_reports`/`picking_problem_report_lines` schema (already in
  migration `0004`, already readable per `0005`'s RLS policies), migration
  `0010`'s RPC pattern, and the live V1 source
  (`C:\dev\WEBAPP\Picking\problem.html` +
  `Code.gs.txt#reportProblem`, read-only reference) to confirm V1's exact
  behavior: full item list submitted every time (not just shortages), actual
  qty defaults to requested when missing/invalid, blocked once
  `lineStatus === "sent"`, and `pending` auto-promoted to `picked` (the one
  rule V2 intentionally skips per ADR `0018`).

Changes:

- Added `docs/plans/V2-0025-picking-problem-reporting.md`.
- Added `supabase/migrations/0011_picking_problem_reports.sql`: atomic
  `public.report_picking_problem(p_requisition_id, p_actor_profile_id,
  p_actor_name, p_lines)`. Same posture as `0009`/`0010`: default
  `SECURITY INVOKER`, `EXECUTE` revoked from `public`/`anon`/`authenticated`,
  granted only to `service_role`. Inserts the problem report + lines, updates
  `problem_by_name`/`problem_at` on the requisition (status untouched),
  writes a `problem_reported` event, and rejects the call if the requisition
  is already `sent`. No new tables/RLS — `picking_problem_reports`/
  `picking_problem_report_lines` and their select policies already existed.
- Added `src/modules/picking/problem-action.ts` (`reportPickingProblem`):
  `requirePermission({ permission: "picking.write" })`, validates submitted
  line ids match the requisition's existing lines 1:1, looks up
  `product_name`/`requested_qty`/`unit` from the database (not the client)
  for the RPC payload, only `actual_qty`/`note` come from the client per
  line, calls the RPC via `createAdminClient()`, redirects to
  `/picking/[id]` on success, maps a "sent" RPC rejection to a clear message.
- Extended `src/modules/picking/read-model.ts` (`getRequisitionDetail`) to
  also load `picking_problem_reports` + nested
  `picking_problem_report_lines` through the normal authenticated
  (RLS-enforced) client, added `PickingProblemReport(Line)` types.
- Added `src/app/picking/[id]/problem/page.tsx` (guarded by
  `picking.write`; shows an "already been sent" message instead of a form
  once `status === "sent"`) and
  `src/modules/picking/problem-report-form.tsx` (client component,
  pre-fills each line's actual qty with its requested qty, optional note per
  line).
- Added a writer/admin-only "Report problem" link to
  `src/app/picking/[id]/page.tsx` (hidden once `status === "sent"`) and a
  "Problem reports" section rendering each submitted report's lines with a
  shortage badge (`StatusPill`) and note.

Verification:

- `npm run check:migrations` and `npm run db:verify-staging-schema` both pass
  after applying `0011`.
- Direct RPC smoke test against staging (throwaway requisition inserted
  directly, deleted after): report on a `pending` bill leaves status
  `pending` and writes exactly one report + 2 lines + 1 `problem_reported`
  event; report on a `picked` bill succeeds, leaves status `picked`, and
  creates a second append-only report row (resubmission is additive, not an
  overwrite, unlike V1's single-field overwrite); report on a `sent` bill is
  rejected with a message mentioning "sent" and writes no new row. No
  column-ambiguity bug this time (table aliased `pr` throughout, the lesson
  from `0010`'s bug was applied from the start).
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`
  all pass.
- An advisor review before browser verification flagged that the RPC smoke
  test (service-role, bypasses RLS) couldn't prove the authenticated read
  path or the `problem-action.ts` line-matching/lookup logic — both needed a
  real browser check, not just the RPC test.
- Browser-verified against staging using a temporary local Playwright
  install (`npm install --no-save playwright` + `npx playwright install
  chromium`, both removed after; user explicitly approved resetting
  `test-picker-writer@akra-v2.test`/`test-picker-reader@akra-v2.test`
  passwords via the service-role Admin API for this verification session
  only via `AskUserQuestion` first, not recorded in any committed file, same
  pattern as `V2-0019`/`V2-0020`/`V2-0023`):
  - `PICKING_WRITER`: created a fixture requisition through `/picking/new`,
    saw "Report problem" on the `pending` bill, submitted a report with one
    short line + note, saw it rendered (`Problem reports (1)`, shortage
    badge, note) with status still `Pending`; link stayed visible after
    "Mark picked", disappeared after "Mark sent"; direct navigation to
    `/picking/[id]/problem` on the now-`sent` bill showed the "already been
    sent" message instead of a form.
  - `PICKING_READER` on the same bill: no "Report problem" link, no
    transition buttons, but **could** see the `Problem reports (1)` section
    with the correct line content — confirms the `0005` RLS select policy on
    the two problem-report tables actually works for `picking.read`, not
    just in theory; denied outright on `/picking/[id]/problem` directly.
  - Found and fixed a real mobile-overflow regression during this check (not
    present on the same page before the problem report existed, confirmed
    via a baseline measurement): the new report-header line
    (`"{date} · {reporter}"`) rendered the actor's fallback identity — the
    synthetic test accounts have no `display_name`, so it fell back to the
    raw email `test-picker-writer@akra-v2.test`, a single unbroken token —
    inside `.requisition-line__qty`, which has `white-space: nowrap`.
    `nowrap` and `overflow-wrap` do not combine in browsers (`nowrap` wins
    and the token overflows), forcing a 2px horizontal overflow at 390px.
    Fixed by adding a dedicated `.problem-report__meta` class
    (`overflow-wrap: anywhere`, no `nowrap`) in `src/app/globals.css` for
    that line instead of reusing the qty class, and moved each line's note
    out of the nowrap qty span into its own `.module-card__note` paragraph.
    Re-verified zero overflow on both `/picking/[id]` and
    `/picking/[id]/problem` at 390px after the fix.
  - No browser console errors in any check.
  - The fixture requisition created through the UI, and the temporary
    scripts (`scripts/_tmp-verify-problem-reports.mjs`,
    `scripts/_tmp-reset-test-passwords.mjs`,
    `scripts/_tmp-verify-problem-browser.mjs`), were all deleted after the
    run; Playwright was removed (`npm uninstall playwright`); confirmed
    `package.json`/`package-lock.json` show no diff afterward.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched.

## 2026-06-22 - Management Executive Summary (V2-0028)

Context:

- User asked for a central, easy-to-understand project summary file for
  presenting AKRA WEBAPP V2 to a supervisor: what the project uses, what it
  contains, what it can do, and how far it has progressed.
- Read the compact source-of-truth docs plus target architecture, migration
  plan, module inventory, full parity timeline, recent Picking plans, and the
  existing in-progress LINE notification plan file. The workspace already has
  local uncommitted LINE notification runtime files; this task did not edit
  those files or mark that slice complete.

Changes:

- Added `docs/project-management/executive-summary-th.md`, a Thai
  supervisor-facing summary covering project purpose, stack, implemented
  modules, current staging-verified capabilities, unfinished areas, roadmap,
  presentation talking points, future decisions, and safety notes.
- Added `docs/plans/V2-0028-management-executive-summary.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` so the
  summary is discoverable from the normal resume path.

Verification:

- Documentation-only change. `git diff --check` passed; Git only printed an
  existing working-copy line-ending warning for `.env.example`.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 2026-06-22 - Picking LINE Notification And Failure Recovery (V2-0027)

Context:

- User sent bare `Go:`. `docs/handoff/current-state.md` Next Action 7 and
  `docs/project-management/decision-board.md`'s "Recommended Next Move" both
  named Picking LINE notification/failure recovery as the next slice after
  problem reporting (`V2-0025`); no plan file existed yet, so drafted
  `V2-0027` inline as part of execution, matching the
  `V2-0017`/`V2-0023`/`V2-0025` precedent.
- Read `docs/migration/picking-v1-mapping.md` and the live V1 source
  (`C:\dev\WEBAPP\Picking\Code.gs.txt`, read-only reference: `pushLineFlex`,
  `pushLineMessages`, `buildBillCard`) to confirm V1's exact LINE behavior:
  push happens outside the save transaction/lock, and a push failure is
  non-blocking — V1 saves the bill with a warning and leaves `lineStatus:
  "pending"`.
- Consulted advisor before writing the migration. The schema reserves a
  `line_push_failed` **status** value (migration `0004`), which suggested a
  blocking design (status moves to `line_push_failed` until retried). Advisor
  flagged this would conflict with migration `0010` (only allows `pending ->
  picked`) and contradicts V1's own non-blocking behavior. Adopted Option B:
  failure is event-only, `picking_requisitions.status` is never touched by a
  notification outcome. The reserved status value stays unused; revisiting it
  would need its own ADR.

Changes:

- Added `docs/plans/V2-0027-picking-line-notification-failure-recovery.md`
  (includes the Option A/B decision writeup).
- Added `supabase/migrations/0012_picking_line_notifications.sql`: widens
  `picking_requisition_events_type_check` to add `line_notification_sent` and
  `line_notification_skipped` (`line_push_failed` already existed from
  `0004`). No new tables, no new RPC — the outcome is a single admin-client
  event insert (plus an optional `picking_requisition_secrets` upsert on a
  real-send success), since service_role already holds insert grants on both
  tables from `0005` and there is no multi-row atomicity requirement (unlike
  `0009`/`0010`/`0011`).
- Added `src/modules/picking/line-notification.ts` (plain server-only
  module): `sendPickingLineNotification(requisitionId, actor)`. Defaults to
  dry-run (`PICKING_LINE_PUSH_ENABLED !== "true"`) -> `line_notification_skipped`
  event, no network call. If enabled but `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID`
  are not configured -> `line_push_failed` event, no network call (mirrors
  V1's own `pushLineMessages` guard). If enabled and configured -> attempts a
  real LINE push (`fetch` to the Messaging API push endpoint), recording
  `line_notification_sent` (capturing `quoteToken` into
  `picking_requisition_secrets`) on success or `line_push_failed` on a
  non-2xx response/network error. The real-send branch is unproven this
  slice — staging has no real LINE credentials.
- Added `src/modules/picking/line-notification-action.ts` (`"use server"`):
  `retryPickingLineNotification(requisitionId)`, guarded by `picking.write`,
  re-runs the send, redirects back to `/picking/[id]`.
- Hooked the send into `src/modules/picking/create-action.ts`: called after a
  successful `create_picking_requisition` RPC, in its own `try/catch`,
  **before** `redirect()` (not wrapping it — `redirect()` works by throwing,
  so a wrapping `catch` would have swallowed it).
- Added a "Retry LINE notification" button to
  `src/app/picking/[id]/page.tsx`, writer/admin-only, shown when the latest
  LINE-related lifecycle event (`line_notification_sent` /
  `line_notification_skipped` / `line_push_failed`) is `line_push_failed`,
  regardless of the requisition's own status.
- Added `.env.example` placeholders: `PICKING_LINE_PUSH_ENABLED`,
  `LINE_CHANNEL_TOKEN`, `LINE_GROUP_ID` (server-only, no real values).

Verification:

- `npm run check:migrations` passed before apply; applied `0012` to staging
  (`npm run db:apply-migrations -- 0012_picking_line_notifications.sql`);
  `npm run db:verify-staging-schema` passed after.
- Direct DB smoke test against staging (throwaway requisition via
  `create_picking_requisition`, deleted after): inserted all three new/
  existing event types directly and confirmed `picking_requisitions.status`
  stayed `pending` after every insert; confirmed the widened constraint still
  rejects a garbage event type. All four assertions passed.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`
  all pass.
- Browser-verified against staging end-to-end through the real app (not just
  direct RPC/admin-client calls) using a temporary local Playwright install
  (removed after; user explicitly approved resetting
  `test-admin`/`test-picker-writer`/`test-picker-reader` passwords via the
  service-role Admin API for this session only, via `AskUserQuestion` first,
  not recorded in any committed file, same pattern as prior slices). Toggled
  `PICKING_LINE_PUSH_ENABLED` in `.env.local` (restarting the dev server each
  time) to exercise all three reachable outcomes:
  - Default (disabled): `PICKING_WRITER` created a requisition via
    `/picking/new`; lifecycle showed `created` -> `line_notification_skipped`;
    no retry button; zero horizontal overflow at 390px; no console errors.
  - Enabled + no `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` (deterministic failure,
    zero network calls): lifecycle showed `created` -> `line_push_failed`;
    retry button visible to `PICKING_WRITER`, confirmed absent for
    `PICKING_READER` on the same bill; zero overflow; no console errors.
  - Retry while still misconfigured: appended a second `line_push_failed`
    event, button stayed (idempotent, non-destructive repeat failure).
  - Reverted the flag, restarted dev, retried again: appended a
    `line_notification_skipped` event and the button correctly disappeared
    (recovery confirmed, matching the plan's Option B design).
  - First retry-click run raced a same-URL redirect in the test script (read
    stale DOM before the server-side write landed) — not an app bug; fixed
    the test by waiting for the timeline list length to grow instead of
    relying on `waitForURL` with an unchanged URL, then re-ran cleanly.
  - The two browser-test requisitions were deleted after the run via the
    service-role client; Playwright was removed (`npm uninstall playwright`);
    confirmed `package.json`/`package-lock.json` show no diff afterward;
    `.env.local`'s temporary `PICKING_LINE_PUSH_ENABLED=true` line was
    removed, restoring the default-disabled state.
- Found a benign concurrent-session collision during this same workspace
  session: a separate `V2-0028` (management executive summary,
  documentation-only) had modified `docs/plans/index.md`,
  `docs/handoff/current-state.md`, and `docs/handoff/work-log.md` in the
  background without reverting or touching this slice's in-progress files.
  Per `AGENTS.md`/`CONDUCTOR.md` ("do not revert work you did not make"),
  this slice's handoff edits were layered on top of `V2-0028`'s changes
  rather than overwriting them.
- Also archived 5 older active-log entries (Picking Status Transitions,
  Main Portal Redesign Execution, the `CLAUDE.md` update, Full V1 Parity
  Timeline Plan, Project Management Operating Model) into
  `docs/handoff/archive/work-log-2026-06-20-status-transitions-through-operating-model.md`
  to bring this file back under its context-budget target.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched. No real LINE credentials were introduced.
