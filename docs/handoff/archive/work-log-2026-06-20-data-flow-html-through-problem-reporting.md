# Archived Work Log: 2026-06-20 Database Data-Flow HTML Through Picking Problem Reporting

Archived 2026-06-22 from the active `docs/handoff/work-log.md` to keep the
active log under its context budget. See `docs/plans/index.md` and
`docs/handoff/current-state.md` for current status; this file is historical
detail only.

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
