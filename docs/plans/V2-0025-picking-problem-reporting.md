# Plan V2-0025: Picking Problem Reporting

Status: Complete - executed and verified 2026-06-20

Go command (bare `Go`, no plan ID; drafted inline per the `V2-0017`/`V2-0023`
precedent — `docs/project-management/decision-board.md` already named
"Picking problem reporting" as the recommended next move):

```text
Go
```

## 1. Goal

- Primary objective: let `picking.write` users record a shortage/problem
  report against a requisition from `/picking/[id]`, preserving full
  per-line requested-vs-actual detail, without changing the requisition's
  status as a side effect.
- Success definition: a writer/admin can submit a problem report for a
  `pending` or `picked` bill; the bill's status is unchanged; the report and
  its lines are visible on the detail page; a `sent` bill rejects new
  reports; readers/guests/signed-out users cannot submit.
- User/business reason: next dependency in `V2-0022`'s Picking closeout chain
  after status transitions (`V2-0023`), completing the operational exception
  path before LINE notification work begins. ADR `0018` already resolved the
  one open behavioral question (no auto-`picked` side effect).

## 2. Requirement And Scope Definition

### Problem

- V1's `problem.html` lets the assignee report actual-vs-requested quantities
  per line (full item list every time, defaulting actual to requested), and
  blocks reporting once a bill is `sent`. V2 has no equivalent yet — the
  `picking_problem_reports`/`picking_problem_report_lines` tables exist
  (migration `0004`) and are already readable via RLS (migration `0005`), but
  nothing writes to them.
- V1 also marks a `pending` bill `picked` as a side effect of reporting;
  ADR `0018` already decided V2 must not do that.

### Users

- Primary users: Picking writers (pickers) recording what they actually
  picked.
- Secondary users: Picking readers/supervisors reviewing reported shortages.
- Admin/support users: maintainers verifying the report flow in staging.

### MVP Features

- Atomic `public.report_picking_problem(...)` RPC (service-role-only,
  mirrors the `0009`/`0010` posture) that inserts one `picking_problem_reports`
  row, its `picking_problem_report_lines`, updates
  `picking_requisitions.problem_by_name`/`problem_at`, and writes a
  `problem_reported` lifecycle event — all in one transaction, with no status
  change.
- Rejects the call if the requisition is already `sent` (mirrors V1's
  explicit block).
- `/picking/[id]/problem`: guarded form pre-filled with the requisition's
  existing lines (actual qty defaults to requested qty, optional note per
  line), submit via a new server action.
- "Report problem" link on `/picking/[id]`, writer/admin-only, hidden once
  `status === "sent"`.
- Detail page renders submitted problem reports (reporter, timestamp, and
  per-line requested/actual/note, flagging shortages) so the existing
  `problem_at`/`problem_by_name` summary has visible detail behind it.

### Nice-To-Have Features

- Resubmission diffing/merge with a prior report (V1 overwrites a single
  field; V2's append-only report history makes this less necessary).
- LINE group notification of the report (next slice).
- Editing/withdrawing a submitted report.

### Out Of Scope

- LINE notification/failure recovery (next slice per `V2-0022`).
- Auto-transitioning status from a problem report (explicitly excluded by
  ADR `0018`).
- `cancelled` status workflow.
- Changing V1 Picking frontend, GAS backend, Sheets, GitHub Pages, live
  URLs, LINE tokens, or production data.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: new guarded route `/picking/[id]/problem`
  (`src/app/picking/[id]/problem/page.tsx`) + new client form component
  (`src/modules/picking/problem-report-form.tsx`), same pattern as
  `new-requisition-form.tsx`.
- Backend/server boundary: new server action
  `src/modules/picking/problem-action.ts` (`reportPickingProblem`), guarded
  by `requirePermission({ permission: "picking.write" })`, calling the new
  RPC via the existing `createAdminClient()`.
- Database: one new migration adding the report RPC only (no new
  tables/columns; `picking_problem_reports`/`picking_problem_report_lines`
  already exist from `0004`, already have `select` RLS policies from `0005`).
- Auth/permissions: `picking.write` required to submit; `picking.read` or
  `picking.write` remains sufficient to view reports (existing detail-page
  guard already covers this).
- Deployment: local + staging only, same as prior Picking slices.

### Data Model / Schema

- Tables involved: `picking_problem_reports`, `picking_problem_report_lines`,
  `picking_requisitions` (update `problem_by_name`/`problem_at` only),
  `picking_requisition_events`.
- New migration: `supabase/migrations/0011_picking_problem_reports.sql` adds
  `public.report_picking_problem(p_requisition_id uuid, p_actor_profile_id
  uuid, p_actor_name text, p_lines jsonb)` returning the new report id.
- Constraints: rejects the call if the requisition does not exist or is
  already `sent`; row is locked with `for update` for the duration of the
  check+write; does not modify `picking_requisitions.status`.
- Server-side (TS) validation, not the RPC, checks that submitted line ids
  match the requisition's existing lines 1:1; the action looks up
  `product_name`/`requested_qty`/`unit` from the database rather than
  trusting client-submitted values, only `actual_qty`/`note` come from the
  client per line.
- RLS/security notes: function is default `SECURITY INVOKER`, `EXECUTE`
  revoked from `public`/`anon`/`authenticated`, granted only to
  `service_role` — identical posture to `0009`/`0010`. No new RLS surface;
  existing `0005` select policies on the two problem-report tables already
  cover the read side.

### Integration Points

- V1 references: `C:\dev\WEBAPP\Picking\problem.html` and
  `Code.gs.txt#reportProblem` (full item list submitted every time, actual
  defaults to requested when missing/invalid, blocked once `lineStatus ===
  "sent"`, `problemBy`/`problemAt` overwritten, `pending` auto-promoted to
  `picked` — the one rule V2 intentionally skips per ADR `0018`).
- Supabase: reuses the existing service-role RPC pattern; no new Data API
  exposure decisions needed.
- Vercel: no new env vars.
- LINE/GAS/Sheets/API: none in this slice (V1's `pushQuoted` group
  notification on report is deferred to the LINE slice).
- Secrets/env vars: none new.

## 4. UI/UX And User Flow

### User Flow

1. Writer/admin opens a `pending` or `picked` bill at `/picking/[id]` and
   clicks "Report problem".
2. `/picking/[id]/problem` lists every line with the requested qty, an
   actual-qty input (defaulting to the requested qty), and an optional note.
3. Writer submits; server re-validates permission, status, and line
   ownership, writes the report + lines + event in one RPC call, and
   redirects back to `/picking/[id]`.
4. The detail page now shows a "Problem reports" section with the new
   report (reporter, timestamp, per-line requested/actual/note, shortage
   rows flagged); the existing status pill is unchanged.
5. Submitting again creates an additional report row (append-only history,
   not an overwrite) — acceptable for this slice; out-of-scope item above
   notes resubmission UX is deferred.
6. Once the bill is `sent`, the "Report problem" link disappears from
   `/picking/[id]` and the RPC itself rejects a direct call.

### Screens / States

- Screen: `/picking/[id]/problem` (new), `/picking/[id]` (updated).
- Empty/loading state: if the requisition has zero lines (shouldn't happen
  given `create_picking_requisition` requires at least one), show a short
  message instead of an empty form.
- Error state: invalid submission (line mismatch, negative qty) shows the
  existing inline `form-message` pattern; RPC rejection on a `sent` bill
  shows a clear message instead of a raw Postgres error.
- Permission-denied state: `AccessDenied` on `/picking/[id]/problem` for
  non-writers, same component used elsewhere.
- Mobile behavior: reuse `.requisition-form`/`.line-row` patterns already
  verified at 390px with zero horizontal overflow.

### System Logic / Pseudocode

```text
render /picking/[id]/problem:
  guard = requirePermission(permission: "picking.write")
  if denied: render AccessDenied
  load requisition detail; if not found: not-found state
  if status === "sent": short message, no form, link back
  else: render ProblemReportForm(lines)

reportPickingProblem(requisitionId, lines):
  guard = requirePermission(permission: "picking.write")
  if denied: return denied
  validate lines (non-empty, actualQty >= 0)
  fetch existing picking_requisition_lines for requisitionId
  if submitted line ids don't match existing ids 1:1: return invalid
  payload = existing line data (product_name/requested_qty/unit) + client actual_qty/note
  admin.rpc("report_picking_problem", { p_requisition_id, p_actor_profile_id, p_actor_name, p_lines: payload })
  if error (e.g. already sent): map to user-facing message
  else: redirect /picking/:id

report_picking_problem RPC:
  lock requisition row; if missing: raise; if status = 'sent': raise
  insert picking_problem_reports (requisition_id, reported_by_name) returning id
  insert picking_problem_report_lines from p_lines, tagged with the new report id
  update picking_requisitions set problem_by_name, problem_at (status untouched)
  insert picking_requisition_events (event_type = 'problem_reported', metadata: report id)
  return new report id
```

## 5. Task Breakdown

1. Add migration `0011_picking_problem_reports.sql` with the atomic report
   RPC.
2. Apply to staging (`npm run db:apply-migrations -- 0011_picking_problem_reports.sql`)
   and verify (`npm run check:migrations`, `npm run db:verify-staging-schema`).
3. Add `src/modules/picking/problem-action.ts` server action.
4. Extend `src/modules/picking/read-model.ts` to load problem reports + lines
   for the detail page.
5. Add `src/app/picking/[id]/problem/page.tsx` and
   `src/modules/picking/problem-report-form.tsx`.
6. Add "Report problem" link and a "Problem reports" section to
   `src/app/picking/[id]/page.tsx`.
7. Smoke-test the RPC directly against staging: a normal report on a
   `pending` bill (status stays `pending`), a report on a `picked` bill, and
   a rejected report on a `sent` bill; delete test rows after.
8. Run `lint`/`typecheck`/`build`/`git diff --check`.
9. Browser-verify roles (reader cannot see/use the link or reach the form,
   writer/admin can submit a report and see it rendered), mobile width,
   console errors.
10. Update handoff docs and decide next slice (LINE notification/failure
    recovery, per `V2-0022`).

## 6. Files Expected To Change

- `supabase/migrations/0011_picking_problem_reports.sql`
- `src/modules/picking/problem-action.ts`
- `src/modules/picking/read-model.ts`
- `src/app/picking/[id]/problem/page.tsx`
- `src/modules/picking/problem-report-form.tsx`
- `src/app/picking/[id]/page.tsx`
- `docs/plans/V2-0025-picking-problem-reporting.md`
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
- Direct RPC smoke test against staging: report on `pending` leaves status
  `pending` and writes exactly one report + N lines + one event; report on
  `picked` behaves the same; report on `sent` is rejected and writes nothing.
- Browser verification against staging:
  - `PICKING_READER` sees no "Report problem" link and is denied on
    `/picking/[id]/problem` directly.
  - `PICKING_WRITER`/`ADMIN` can submit a report and see it rendered on
    `/picking/[id]`.
  - `/picking/[id]/problem` has no horizontal overflow at 390px.
  - No browser console errors.

## 8. Rollback / No-Production-Impact Note

This plan only adds a new Postgres function (no destructive schema change)
and V2 app code. Rollback is `drop function
public.report_picking_problem(uuid, uuid, text, jsonb);` plus reverting the
app code change. V1 Picking remains untouched. Any staging rows used for
smoke/browser testing are deleted after verification.

## 9. Open Questions

- None blocking. Resubmission UX (append vs. merge/replace) and LINE group
  notification of the report are deferred to later slices.

## 10. Handoff Notes

- Outcome: implemented and verified against staging. Migration `0011`
  (`public.report_picking_problem(...)`) applied with the planned posture
  (default `SECURITY INVOKER`, `EXECUTE` revoked from
  `public`/`anon`/`authenticated`, granted only to `service_role`); it never
  touches `picking_requisitions.status` (ADR `0018`) and rejects the call
  when the requisition is already `sent`. No ambiguous-column bug this time
  (table aliased `pr` from the start, learning carried over from `0010`).
  Direct RPC smoke test (throwaway requisition, deleted after) confirmed:
  report on `pending` leaves status `pending` and writes exactly one report +
  2 lines + 1 `problem_reported` event; report on `picked` succeeds and
  leaves status `picked`, and creates a second append-only report row
  (resubmission is additive, not an overwrite, unlike V1); report on `sent`
  is rejected and writes nothing.
- Added `src/modules/picking/problem-action.ts` (`reportPickingProblem`):
  `requirePermission({ permission: "picking.write" })`, validates submitted
  line ids match the requisition's existing lines 1:1, builds the RPC
  payload from server-side `product_name`/`requested_qty`/`unit` (not
  client input) plus client-submitted `actual_qty`/`note`, calls the RPC via
  `createAdminClient()`, redirects back to `/picking/[id]` on success, maps
  a "sent" RPC rejection to a clear user-facing message.
- Extended `src/modules/picking/read-model.ts` (`getRequisitionDetail`) to
  also load `picking_problem_reports` + nested
  `picking_problem_report_lines` through the normal authenticated client
  (RLS-enforced read path, not the admin client).
- Added `/picking/[id]/problem` (guarded page +
  `src/modules/picking/problem-report-form.tsx`, client component
  pre-filling actual qty with the requested qty per line); shows an
  "already sent" message instead of a form once the bill is `sent`. Added a
  writer/admin-only "Report problem" link on `/picking/[id]` (hidden once
  `status === "sent"`) and a "Problem reports" section rendering each
  report's lines with a shortage badge + note.
- Found and fixed a real mobile-overflow regression during verification
  (not from a fixture — the browser test's own staging data exposed it):
  the new problem-report header line (`"{date} · {reporter}"`) rendered the
  actor's fallback identity (synthetic test accounts have no
  `display_name`, so it fell back to the raw email
  `test-picker-writer@akra-v2.test`, a single unbroken token) inside
  `.requisition-line__qty`, which has `white-space: nowrap`. `nowrap` +
  `overflow-wrap` do not combine (browsers keep `nowrap` and let the token
  overflow), so the long email forced a 2px horizontal overflow at 390px
  that a baseline check (same page, before the problem report existed)
  confirmed was not present beforehand. Fixed by adding a dedicated
  `.problem-report__meta` class (`overflow-wrap: anywhere`, no `nowrap`) in
  `src/app/globals.css` instead of reusing `.requisition-line__qty` for
  that line, and moved the per-line note out of the nowrap qty span into
  its own `.module-card__note` paragraph. Re-verified zero overflow on both
  `/picking/[id]` (with the report rendered) and `/picking/[id]/problem` at
  390px after the fix.
- Browser-verified against staging with a temporary local Playwright
  install (`npm install --no-save playwright` + `npx playwright install
  chromium`, both removed after; user explicitly approved resetting
  `test-picker-writer@akra-v2.test`/`test-picker-reader@akra-v2.test`
  passwords via the service-role Admin API for this verification session
  only via `AskUserQuestion`, not recorded in any committed file, same
  pattern as prior slices):
  - `PICKING_WRITER`: created a fixture requisition, saw "Report problem"
    on the `pending` bill, submitted a report with one short line + note,
    saw it rendered (`Problem reports (1)`, shortage badge, note) with
    status still `Pending`; link stayed visible after "Mark picked", then
    disappeared after "Mark sent"; direct navigation to
    `/picking/[id]/problem` on the now-`sent` bill showed the "already been
    sent" message instead of a form.
  - `PICKING_READER` on the same bill: no "Report problem" link, no
    transition buttons, but **could** see the `Problem reports (1)` section
    with the correct line content (confirms the `0005` RLS select policy on
    `picking_problem_reports`/`picking_problem_report_lines` actually works
    for `picking.read`, not just in theory) — denied outright on
    `/picking[id]/problem` directly.
  - Zero horizontal overflow at 390px on both routes after the CSS fix; no
    browser console errors in any check.
  - The fixture requisition created through the UI was deleted via the
    service-role client after the run; the temporary scripts
    (`scripts/_tmp-verify-problem-reports.mjs`,
    `scripts/_tmp-reset-test-passwords.mjs`,
    `scripts/_tmp-verify-problem-browser.mjs`) were deleted, not committed.
  - `npm run check:migrations`, `npm run db:verify-staging-schema`,
    `lint`, `typecheck`, `build`, and `git diff --check` all pass.
- An advisor review before browser verification flagged that the RPC smoke
  test alone (service-role, bypasses RLS) couldn't prove the authenticated
  read path or the `problem-action.ts` line-matching/lookup logic; the
  `PICKING_READER` "can read lines" check above and the full writer submit
  flow close that gap.
- No V1 production files changed.
- Next action: LINE notification/failure recovery, per `V2-0022`'s chain.
- Blockers: none.
- Related plans: `V2-0020`, `V2-0023`, `V2-0022`.
- Related ADRs: `0018` (no auto-`picked` side effect), `0015` (service-role-
  only RPC pattern this slice reuses).
