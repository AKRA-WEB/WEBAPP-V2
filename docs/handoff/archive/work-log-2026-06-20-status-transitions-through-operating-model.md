# Work Log Archive: 2026-06-20 (Status Transitions Through Operating Model)

Archived from the active `docs/handoff/work-log.md` on 2026-06-22 to keep the
active log within its context-budget target. Covers: Picking Status
Transitions (`V2-0023`), Main Portal Redesign Execution (`V2-0017`), the
`CLAUDE.md` update, Full V1 Parity Timeline Plan (`V2-0022`), and Project
Management Operating Model (`V2-0024`).

## 2026-06-20 - Picking Status Transitions (V2-0023)

Context:

- User sent `Go` (bare, no plan ID, no colon). `docs/handoff/current-state.md`
  Next Action 5 was "Execute Picking closeout in this order: status
  transitions (`pending -> picked -> sent`), problem reporting, LINE
  notification/failure recovery, then Picking cutover package" — no plan file
  existed yet for this slice, so drafted `V2-0023` as part of execution
  (matching the `V2-0017`/`V2-0020` precedent of building the plan doc inline
  for a bare `Go`).
- Read `docs/migration/picking-v1-mapping.md` (V1 LINE postback rules: `pick`
  maps `pending -> picked`; `ship` maps `picked -> sent`; `pending -> sent` is
  blocked), the existing `src/modules/picking/read-model.ts` and
  `/picking/[id]` detail page, and migrations `0004` (status check
  constraint, existing `picked_*`/`sent_*` columns) and `0009` (the
  `create_picking_requisition` atomic-RPC pattern to mirror) before building
  anything.

Changes:

- Added `docs/plans/V2-0023-picking-status-transitions.md`.
- Added `supabase/migrations/0010_picking_status_transitions.sql`: atomic
  `public.transition_picking_requisition_status(p_requisition_id,
  p_target_status, p_actor_profile_id, p_actor_name)`. Same posture as `0009`:
  default `SECURITY INVOKER`, `EXECUTE` revoked from
  `public`/`anon`/`authenticated`, granted only to `service_role`. Enforces
  only `pending -> picked` and `picked -> sent`; any other target or
  out-of-order call raises and writes nothing. Applied to staging
  (`npm run db:apply-migrations -- 0010_picking_status_transitions.sql`).
- Added `src/modules/picking/transition-action.ts`
  (`transitionPickingRequisitionStatus`): `requirePermission({ permission:
  "picking.write" })`, calls the new RPC via the existing
  `createAdminClient()`, redirects back to `/picking/[id]` on success.
  Denial/RPC error is a silent no-op in this slice (return type is `void` so
  it type-checks as a bound `<form action={...}>` target without extra
  plumbing); no user-facing error message yet for the rare race-condition
  case.
- Added "Mark picked"/"Mark sent" buttons to
  `src/app/picking/[id]/page.tsx`, next to the status pill inside
  `.workspace-header__actions`, shown only when
  `can(guard.snapshot, "picking.write")` and the requisition is in the
  matching predecessor status. Plain `<form
  action={transitionPickingRequisitionStatus.bind(null, requisition.id,
  "picked"|"sent")}>` server actions — no new client component needed.

Verification:

- `npm run check:migrations` and `npm run db:verify-staging-schema` both pass
  after applying the migration.
- Direct RPC smoke test against staging (throwaway requisition via
  `create_picking_requisition`, deleted after): found and fixed a real bug —
  the function's `returns table (id uuid, status text)` clause creates
  implicit PL/pgSQL output variables named `id`/`status`, so bare references
  to the `picking_requisitions` columns of the same names inside the function
  body were ambiguous (`column reference "status" is ambiguous`, raised on
  every call). Fixed by aliasing the table (`picking_requisitions pr`) and
  qualifying every reference (`pr.status`, `pr.id`); re-applied the migration
  and re-tested. After the fix: `pending -> picked -> sent` writes the
  correct `picked_at`/`picked_by_name`/`sent_at`/`sent_by_name` columns and
  exactly one lifecycle event per transition (`created`, `picked`, `sent`); a
  `pending -> sent` call and a repeated `picked -> picked` call are both
  rejected with a clear exception and write nothing.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`
  all pass.
- Browser-verified against staging using a temporary local Playwright install
  (`npm install --no-save playwright` + `npx playwright install chromium`,
  both removed after; user explicitly approved resetting three existing
  synthetic staging test-account passwords via the service-role Admin API for
  this verification session only — asked via `AskUserQuestion` first since
  this mutates shared staging auth state — value not recorded in any
  committed file, same pattern as `V2-0019`/`V2-0020`/`V2-0017`):
  - `test-picker-reader@akra-v2.test` (`PICKING_READER`): sees the `Pending`
    status pill on a fixture requisition but zero transition buttons.
  - `test-picker-writer@akra-v2.test` (`PICKING_WRITER`): completed the full
    `pending -> picked -> sent` flow in the browser; measured zero horizontal
    overflow (`scrollWidth === clientWidth`) at a 390px viewport both before
    and after the transitions.
  - `test-admin@akra-v2.test` (`ADMIN`): transitioned a bill `pending ->
    picked` successfully.
  - No browser console errors in any of the above checks.
  - All fixture requisitions created for the RPC smoke test and browser
    checks were deleted afterward via the service-role client.
  - Temporary scripts (`scripts/_tmp-reset-test-passwords.mjs`,
    `scripts/_tmp-verify-status-transitions.mjs`) were deleted after the run,
    matching the one-off-script-not-committed pattern from prior slices.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched. Staging writes were limited to the migration
  and the clearly-marked, all-deleted smoke/browser-test requisitions.

## 2026-06-20 - Main Portal Redesign Execution (V2-0017)

Context:

- User sent `Go:` with no plan ID. `docs/handoff/current-state.md` Next
  Action 4 pointed at `V2-0017`, but the plan itself was still `Draft` and
  ADR `0008` still `Proposed` — the plan's own Handoff Notes say "confirm
  this direction, then execute" and list signed-out behavior/labels as
  blockers, and `docs/plans/index.md` framed Main portal vs. the next Picking
  slice as an open choice. Asked the user (via `AskUserQuestion`, advisor
  consulted first) to confirm: (1) build `V2-0017` now vs. switch to a
  Picking slice, (2) Thai-first V1 labels vs. English+Thai, (3) signed-out
  `/` shows a portal+CTA vs. redirects to `/login`. User confirmed all three
  recommended defaults. Updated the plan and ADR `0008` (now Accepted) with
  the confirmed direction before implementing.

Changes:

- Rewrote `src/app/page.tsx` (server component, `export const dynamic =
  "force-dynamic"`):
  - Not-configured state (`!hasPublicSupabaseEnv()`): hero panel + disabled
    registry preview, no Supabase calls (preserves the pre-existing
    no-env-crash behavior; the rewrite originally called `createClient()`
    unconditionally, which throws without env — caught and fixed before
    verification).
  - Signed-out state: hero panel with Thai copy and a Sign In CTA, plus a
    disabled preview of the fallback registry.
  - Signed-in state: fetches `getPermissionSnapshot()` and the user's
    `profiles.display_name`/`email`; splits the app registry into
    allowed (`module.route` and permission satisfied) vs. queued (no route,
    or route exists but permission denied — tagged with a
    "ต้องขอสิทธิ์เพิ่มเติม" note) instead of rendering every module as a
    clickable link unconditionally, which is what the page did before this
    change regardless of the signed-in user's actual permissions.
  - Renders signed-in user display name + role list in the header, an
    admin-only shortcut to `/admin/permissions` (`can(snapshot,
    "core.admin")`), and the former dashboard stat panel demoted into a
    `secondary-panel` below the modules.
  - Module descriptions on Main are now Thai (`moduleDescriptionTh`),
    keeping V1's proper-noun module names as-is per the confirmed direction.
- Added `.hero-panel`, `.hero-panel__status`, `.workspace-header__user`,
  `.section-label`, `.module-card__note`, `.secondary-panel` to
  `src/app/globals.css`.
- Updated `docs/plans/V2-0017-main-portal-design-direction.md` (Status:
  Complete, confirmed direction + outcome recorded, two Open Questions
  resolved) and `docs/decisions/0008-main-portal-redesign-with-v1-behavior.md`
  (Status: Accepted, confirmed specifics added).
- Updated `docs/plans/index.md` (`V2-0017` entry, Current Direction
  paragraph) and `docs/handoff/current-state.md` (Status line, Next Actions,
  detailed bullet) accordingly.

Verification:

- `npm run lint`: caught and fixed one real issue — `for (const module of
  modules)` tripped `@next/next/no-assign-module-variable`; renamed the loop
  variable to `appItem`. Clean after.
- `npm run typecheck` and `npm run build` both pass (`/` still builds as
  dynamic/server-rendered).
- Browser-verified against staging using a temporary local Playwright
  install (`npm install --no-save playwright` + `npx playwright install
  chromium`, both removed after; user explicitly approved resetting two
  existing synthetic staging test-account passwords via the service-role
  Admin API for this verification session only, not recorded in any
  committed file, same pattern as `V2-0019`/`V2-0020`):
  - Signed-out `/`: hero heading "ระบบจัดการ AKRA แบบรวมศูนย์" + Sign In CTA
    present.
  - `test-picker-reader@akra-v2.test` (`PICKING_READER`, `picking.read`
    only): exactly 1 allowed clickable module card (Picking), 6
    "ต้องขอสิทธิ์เพิ่มเติม" denied notes (core, purchasing, receiving,
    warehouse, returns, kpi), no admin shortcut link, user line shows
    `test-picker-reader@akra-v2.test · PICKING_READER`.
  - `test-admin@akra-v2.test` (`ADMIN`): all 7 routed modules render as
    allowed clickable cards, admin shortcut link present.
  - 390px viewport: zero horizontal overflow (`scrollWidth === clientWidth`)
    on the `PICKING_READER` check.
  - No browser console errors across any of the above.
  - Temp verification scripts (`scripts/_tmp-reset-test-passwords.mjs`,
    `scripts/_tmp-verify-main.mjs`) were deleted after the run, matching the
    one-off-script-not-committed pattern from prior slices.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  production data were touched. Staging writes were limited to the two
  temporary test-account password resets (synthetic, staging-only,
  user-approved).
- Known gap (pre-existing, not introduced here): placeholder module landing
  pages (`/purchasing`, `/receiving`, `/warehouse`, `/returns`, `/kpi`) still
  have no server-side permission guard, so hiding/disabling their Main links
  by permission is a UX improvement, not an access-control fix. Flagged in
  `current-state.md` as a follow-up before any of those modules gets real
  content.

Follow-up (same session, caught by advisor review before declaring done): the
plan's own Screens/States spec (§4) requires an explicit "no assigned
modules" empty state, and §7 requires verifying signed-in as guest too — both
were missed in the first pass (`allowedModules.length === 0` rendered a bare
empty grid, and only `PICKING_READER`/`ADMIN` were browser-checked).

- Added the empty state to `src/app/page.tsx`: when `allowedModules.length
  === 0`, render a `.module-detail` panel ("ยังไม่มีโมดูลที่คุณมีสิทธิ์ใช้งาน"
  + "ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึงโมดูลที่ต้องใช้งาน") instead of the
  modules grid.
- Re-ran `lint`/`typecheck`/`build` (all pass).
- Browser-verified `test-guest@akra-v2.test` (`GUEST`, no module
  permissions) against staging with a second temporary local Playwright pass
  (same install/removal pattern): empty-state heading/body render correctly,
  zero allowed-module cards, all 7 queued cards show the
  "ต้องขอสิทธิ์เพิ่มเติม" note, no admin shortcut, 390px viewport zero
  overflow, no console errors. User separately approved resetting
  `test-guest@akra-v2.test`'s password via the service-role Admin API for
  this check (prior approval only named `test-admin`/`test-picker-reader`),
  same not-recorded-anywhere pattern.
- Took full-page screenshots (signed-out, `PICKING_READER`, `GUEST`) for
  visual sanity beyond text/count assertions — Thai text renders correctly,
  layout is coherent, the demoted `secondary-panel` stats read as secondary.
  Screenshots and the temp verification/reset scripts were deleted after
  review (not committed).
- Checked one more divergence risk an advisor review raised: Main's registry
  filter uses the single `requiredPermission` field (`picking.read` for
  Picking), but the `/picking` route guard accepts `anyOf: ["picking.read",
  "picking.write"]`. A user with `picking.write` but not `picking.read`
  would see Picking locked on Main yet still reach the route directly. Confirmed
  this isn't live: the seeded `PICKING_WRITER` role grants both
  (`supabase/migrations/0007_test_roles.sql`), and the real V1 core import
  never touched Picking permissions at all — `import-data/main/Main Menu -
  PermConfig.csv` has no `app-pick.*` rows, only `AppConfig.csv` app-level
  access (a separate V1 concept). No current staging account has write
  without read. Noting as a theoretical Main-vs-route-guard mismatch for any
  future role that grants `picking.write` alone, not an active bug.

## 2026-06-20 - CLAUDE.md Update

Context:

- User ran `/init` to refresh `CLAUDE.md`. Found it was missing the binding
  `Architect:`/`Go:`/`Review:` command protocol defined in `CONDUCTOR.md` even
  though `AGENTS.md`, `README.md`, and `CONDUCTOR.md` all list `CONDUCTOR.md`
  and `docs/plans/index.md` as required reading.

Changes:

- Rewrote `CLAUDE.md`: added a "Command protocol" section summarizing
  `Architect:`/`Go:`/`Review:` and plan-status lifecycle; fixed the required-
  reading list to include `CONDUCTOR.md` and `docs/plans/index.md`; documented
  the 4th Supabase client (`src/lib/supabase/admin.ts`, service-role,
  `server-only`); documented the `--confirm-*` + staging-project-ref guard
  pattern used by database-writing scripts under `scripts/`.
- No runtime app code, schema, staging data, V1 production files, or secrets
  were changed.

Verification:

- Documentation-only change. `git diff --check` passed.

## 2026-06-20 - Full V1 Parity Timeline Plan (V2-0022)

Context:

- User asked via `Architect:` for a timeline through the end of the V2 rewrite,
  split by phase/app/module, until V2 can be used like V1.
- Read the planning template, current plan index, current handoff state, active
  work log, migration/module inventory, database strategy, Picking mapping, and
  V1 development context/module status before drafting.

Changes:

- Added `docs/plans/V2-0022-full-v1-parity-timeline.md`.
- Added ADR `docs/decisions/0016-module-by-module-v1-parity-sequence.md`.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` so the
  timeline is discoverable from the normal resume path.
- The plan sequences V1 parity as module waves: Main/Core portal, Picking
  closeout, PR/PO/GR, TRDAKRA/W5, Returnitem, KPITracker, and final
  hardening/cutover.
- The plan records two estimate bands: 7-9 weeks for aggressive operational
  replacement, or 10-12 weeks for safer full parity closeout, assuming one
  focused implementation stream and fast UAT.

Verification:

- Planning/docs-only change in V2 repo.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed.

Follow-up (same session): user asked to save exactly what should be done after
each job. Updated `V2-0022`, `docs/plans/index.md`, and
`docs/handoff/current-state.md` with a concrete next-step chain:

1. Phase 1 Main portal (`V2-0017`).
2. Picking status transitions.
3. Picking problem reporting.
4. Picking LINE notification/failure recovery.
5. Picking cutover package.
6. PR/PO/GR foundation.
7. PR, then PO, then GR.
8. Warehouse/TRDAKRA, then AKRA W5.
9. Returnitem.
10. KPITracker/analytics.
11. Full-system hardening, UAT, and cutover.

Also added a per-step closeout checklist requiring relevant checks, browser and
mobile verification, handoff updates, ADR updates when needed, a clear next
action, and confirmation that V1 production was not changed unless explicitly
approved.

## 2026-06-20 - Project Management Operating Model (V2-0024)

Context:

- User asked to verify whether agent files and handoff/context management were
  consistent, then asked the agent to help manage planning, organization, and
  project execution going forward.
- Audit found the compact source-of-truth docs (`docs/plans/index.md` and
  `docs/handoff/current-state.md`) were current, but some migration/status docs
  still described an older Picking state, and the active work log had grown
  beyond the intended recent-entry budget again.

Changes:

- Added `docs/project-management/operating-model.md` and
  `docs/project-management/decision-board.md`.
- Added plan `docs/plans/V2-0024-project-management-operating-model.md`.
- Added ADR `docs/decisions/0017-project-management-operating-model.md`.
- Synced context-budget/read-order rules across `AGENTS.md`, `README.md`,
  `CONDUCTOR.md`, and `CLAUDE.md`.
- Archived older active work-log entries into
  `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`;
  active `docs/handoff/work-log.md` now keeps recent entries plus archive
  pointers and a context-budget note.
- Synced stale status in `docs/migration/migration-plan.md`,
  `docs/migration/module-inventory.md`, `V2-0009`, and `V2-0022` so they
  acknowledge Main portal and Picking status transitions are complete.

Verification:

- Documentation/process-only change.
- Historical entries were archived, not deleted.
- No runtime app code, Supabase schema, staging data, V1 production apps, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets were changed.

Follow-up decision capture (same session):

- User decided that Picking problem reporting must not mark a `pending`
  requisition as `picked`.
- User decided LINE staging should start with disabled send/dry-run behavior.
- User decided V1 Picking history should remain a read-only archive for
  backward lookup instead of being imported into V2 for the first cutover
  package.
- Added ADR `0018` and synced `docs/project-management/decision-board.md`,
  `docs/plans/V2-0022-full-v1-parity-timeline.md`,
  `docs/migration/picking-v1-mapping.md`, `docs/plans/index.md`, and
  `docs/handoff/current-state.md`.

Follow-up shortcut capture (same session):

- User asked for a short shortcut so typing `Let's work` makes the agent read
  the prepared compact context before starting work.
- Recorded `Let's work` as a context-saving resume bootstrap in `CONDUCTOR.md`,
  `AGENTS.md`, `README.md`, `CLAUDE.md`,
  `docs/project-management/operating-model.md`, ADR `0017`, and plan `V2-0024`.
- Semantics: read compact source-of-truth docs, skip archives unless needed,
  check `git status --short`, summarize current status and recommended next
  action, and wait for `Architect:`, `Go:`, `Review:`, or another explicit
  instruction before runtime changes.
