# Work Log Archive: 2026-06-22 Management Executive Summary through Picking Cutover Package

Archived from the active `docs/handoff/work-log.md` during the `V2-0036`
PR/PO/GR source-profiling slice to keep the active log under its context
budget. These entries cover: Management Executive Summary (`V2-0028`),
Picking LINE Notification And Failure Recovery (`V2-0027`), Frontend
Conductor/Mock-up Guidance/Gemini Instructions, and Picking Cutover Package
(`V2-0034`).

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

## 2026-06-22 - Frontend Conductor, Mock-up Guidance, And Gemini Instructions

Context:

- User asked to create a separate conductor for frontend work so UI/UX can move
  alongside migration, asked that all agents understand the same rules, and
  then asked to add `Gemini.md` for frontend/UI/UX design work.
- Decision: create a frontend sub-conductor lane, not a separate frontend
  source of truth. Frontend work remains tied to `CONDUCTOR.md`,
  `docs/plans/index.md`, and `docs/handoff/current-state.md`.

Changes:

- Added `FRONTEND_CONDUCTOR.md` with frontend shortcuts:
  `Frontend:`, `FE:`, `Frontend Architect:`, `Frontend Mockup:`,
  `Frontend Go:`, `Frontend Review:`, `Responsive Check:`, and
  `Design System:`.
- Added `docs/frontend/ui-ux-operating-model.md` and ADR `0019`
  (`docs/decisions/0019-frontend-sub-conductor.md`).
- Added `docs/plans/V2-0030-frontend-conductor-and-shortcuts.md`.
- Added `Gemini.md` as Gemini-specific guidance for frontend design, UI/UX
  critique, mock-up support, responsive review, and implementation advice.
- Added `docs/plans/V2-0031-gemini-frontend-instructions.md`.
- Updated `AGENTS.md`, `CONDUCTOR.md`, `README.md`,
  `docs/project-management/operating-model.md`, `docs/plans/index.md`, and
  `docs/handoff/current-state.md` so all future agents see the frontend lane
  and Gemini instructions from the normal resume path.

Verification:

- Documentation-only changes; no runtime app code, Supabase schema, staging
  data, V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets changed.
- `git diff --check` passed; Git printed CRLF normalization warnings for
  `AGENTS.md` and `README.md` only.

## 2026-06-22 - Picking Cutover Package (V2-0034)

Context:

- User sent "go now" after the decision board's "Recommended Next Move"
  named the Picking cutover package as next; no plan file existed yet, so
  drafted `V2-0034` inline as part of execution, matching the
  `V2-0017`/`V2-0023`/`V2-0025`/`V2-0027` precedent.
- Consulted advisor first. Key guidance followed: query staging for real
  reconciliation numbers instead of reciting prior handoff claims; treat the
  Vercel Preview/Development verification leg as a user-action gate (push
  authorization + CLI account/scope access are both outside agent control)
  rather than silently checking it off; watch for concurrent edits to
  `docs/plans/index.md`/`current-state.md`/`work-log.md` from the parallel
  frontend-lane session active this same workspace session (already
  observed once mid-read while resuming).
- Note: `docs/plans/V2-0032`-`V2-0033` were created by a concurrent
  frontend-lane session during this same workspace session (Frontend UI/UX
  module roadmap, PO mock-up). This slice's plan ID (`V2-0034`) was picked
  after re-checking `docs/plans/` on disk to avoid colliding with those.

Changes:

- Wrote and ran a temporary read-only script
  (`scripts/_tmp-picking-reconciliation.mjs`, deleted after use) against
  staging via `DATABASE_URL`: `picking_requisitions` grouped by
  `legacy_source`/`status`, plus row counts for `picking_problem_reports`,
  `picking_requisition_events` by `event_type`, and
  `picking_requisition_secrets`. Result: 4 total requisitions, all
  `legacy_source = "v2_fixture"` (the `V2-0019` seed fixtures), zero
  `"v2_app"` rows — confirms every prior slice's claim that browser-test
  requisitions were deleted after verification is actually true, not just
  asserted. `picking_problem_reports` and `picking_requisition_secrets` are
  both empty.
- Found one pre-existing, low-priority data quirk via that query: the
  `V2-0019` seed fixture for the `line_push_failed` bill writes a
  `problem_reported` lifecycle event but the seed script never inserts a
  matching `picking_problem_reports` row, so that fixture's detail page
  would show the timeline event with no matching "Problem reports" content.
  Confirmed by reading `scripts/picking-seed-staging-fixtures.mjs`. Left
  unfixed (seed-data-only, not a real-flow regression); recorded in the
  package and the decision board watch list.
- Checked `git status -sb` and `git log origin/main..main`: local `main` is
  2 commits ahead of `origin/main` (`86968b5` `V2-0027`, `35897fd` `V2-0028`)
  — the currently deployed Vercel build predates the LINE
  notification/retry feature. Did not push; pushing is a shared-state action
  and the repo's direct-to-`main` workflow is itself still an open decision
  in `docs/plans/index.md`.
- Added `docs/plans/V2-0034-picking-cutover-package.md` (this slice's
  architect-style plan record) and `docs/migration/picking-cutover-package.md`
  (the actual deliverable): V1 history archive answer (V1 Picking stays
  live/unmodified; operators use it directly for pre-cutover lookups — V2
  never imports or reconciles against it, per ADR `0018`), the
  reconciliation findings above, a UAT checklist (a combined create -> pick
  -> send -> problem -> LINE-retry human pass has never been run; every
  prior check was per-slice and agent-run), a fully filled instance of the
  generic `docs/migration/cutover-checklist.md`, and a rollback plan (V1 is
  the fallback since it was never modified).
- Explicitly left "Vercel Preview verified" and "User approval received"
  unchecked in the filled checklist rather than marking them done — named
  both as open, user-gated decisions. Reason: even after a push, the local
  `vercel` CLI is logged in as account `akra-web`, scoped only to
  `buymoreth-erp-projects`; the real V2 project lives under
  `akrapanich-3912s-projects/project-webapp-v2`, a scope that account cannot
  reach (memory note `vercel-project-location`), so the agent has no way to
  open and click through a deployed build regardless of push state.
- Updated `docs/plans/index.md` (new Active Queue item 26, refreshed
  next-action text on the `V2-0009`/`V2-0022`/`V2-0024` entries),
  `docs/handoff/current-state.md` (status paragraph, Active Plan IDs list,
  new execution bullet, Next Actions 8-9), and
  `docs/project-management/decision-board.md` (Recommended Next Move,
  Near-Term Queue row 3, Picking History Strategy resolved-decision note,
  Watch List).
- Archived 3 older 2026-06-20 entries (Picking Status Transitions pointer,
  Database Structure Data-Flow HTML, Picking Problem Reporting) into
  `docs/handoff/archive/work-log-2026-06-20-data-flow-html-through-problem-reporting.md`
  to keep this file under its ~400-line context budget after adding this
  entry.

Verification:

- Documentation-only change; no `src/` files, Supabase schema, staging data,
  V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or
  secrets changed.
- `git diff --check` passes.
- Did not run `lint`/`typecheck`/`build` (no runtime code changed); did not
  push any commits.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched.
