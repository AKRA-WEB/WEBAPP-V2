# Plan V2-0041: Placeholder Route Guard Pass

Status: Complete on 2026-06-23.

Drafted inline during execution of a bare `Go` command (no plan ID given),
following the same pattern as `V2-0017`/`V2-0023`/`V2-0025`: the user's
`Go` picked up the decision board's own Near-Term Queue item 5
("Placeholder route guard pass") and Watch List entry ("Non-Picking
placeholder routes are currently reachable by direct URL and should
receive server-side guards before real content is added"), both unblocked
and not gated on any pending user decision (unlike the Picking cutover
gates or the `V2-0040` PR CSV export).

## 1. Goal

- Close a real, pre-existing authorization gap: `/purchasing`, `/receiving`,
  `/warehouse`, `/returns`, and `/kpi` rendered their placeholder content to
  any signed-in user (or even signed-out users, who saw the placeholder
  shell instead of a sign-in prompt) regardless of permission, because
  `ModuleLandingPage` never called `requirePermission()`. Main (`V2-0017`)
  closed this same gap for the dashboard's module *cards* (allowed-vs-queued
  filtering); the routes themselves stayed unguarded.
- Success definition: each of the 5 placeholder routes enforces its own
  `public.apps.required_permission` server-side, using the same
  `requirePermission()` + `AccessDenied` pattern already proven in Picking
  and `/admin/permissions`.

## 2. Scope

- `src/modules/core/module-landing-page.tsx`: add a `requirePermission()`
  check using the app's own `requiredPermission` field (sourced from
  `public.apps.required_permission`, which already exists per-row from the
  `0003_core_seed.sql` structural seed) before rendering placeholder content.
  Render the existing `AccessDenied` component on denial, mirroring
  `src/app/picking/page.tsx`'s guard shape exactly.
- `src/app/{purchasing,receiving,warehouse,returns,kpi}/page.tsx`: add
  `export const dynamic = "force-dynamic"` with the same comment used on
  `src/app/picking/page.tsx` ("Auth-gated, per-user data: never statically
  cache this page."), since the page is now genuinely per-user.

## 3. Out Of Scope

- Any real PR/PO/GR/warehouse/returns/KPI module content — these routes
  stay placeholders.
- Changing `public.apps.required_permission` values or adding new
  permissions.
- `/admin/permissions` and `/picking*` — already guarded.
- V1 production systems — untouched.

## 4. Files Expected To Change

- `src/modules/core/module-landing-page.tsx`
- `src/app/purchasing/page.tsx`
- `src/app/receiving/page.tsx`
- `src/app/warehouse/page.tsx`
- `src/app/returns/page.tsx`
- `src/app/kpi/page.tsx`
- `docs/plans/V2-0041-placeholder-route-guard-pass.md` (this file)
- `docs/plans/index.md`, `docs/handoff/current-state.md`,
  `docs/handoff/work-log.md`, `docs/project-management/decision-board.md`
  for handoff/closeout

## 5. Verification Steps

- `npm run lint`, `npm run typecheck`, `npm run build`.
- Manual signed-out check against a local dev server: `curl` each of the 5
  routes and confirm "Sign In Required" renders instead of the placeholder
  "Current Status" content.
- `git diff --check`.

## 6. Rollback / No-Production-Impact Note

No Supabase schema, staging data, V1 production files, or secrets changed.
The change only adds a server-side permission check ahead of existing
placeholder content; rollback is a plain revert of the 6 touched `src/`
files.

## 7. Handoff Notes

- Implementation: `ModuleLandingPage` now calls
  `requirePermission({ permission: app.requiredPermission as AppPermission })`
  when `app.requiredPermission` is set, returning the same `AccessDenied`
  states (`unauthenticated`/`forbidden`/`not_configured`) Picking already
  uses. The cast to `AppPermission` is safe because
  `scripts/check-migrations.mjs` already asserts the seeded
  `public.permissions.key` values match the `AppPermission` union in
  `src/modules/auth/permissions.ts` exactly (`permission seed keys`
  assertion) — `public.apps.required_permission` is seeded from the same
  permission catalog.
- Verified signed-out via a local dev server + `curl` (no Playwright
  needed — this is a static-HTML-on-first-load check, not an interactive
  flow): all 5 routes (`/purchasing`, `/receiving`, `/warehouse`,
  `/returns`, `/kpi`) returned the "Sign In Required" `AccessDenied` body
  instead of the placeholder "Current Status" content. Did not separately
  verify the authenticated-forbidden and authenticated-allowed branches
  with a real test account/session — the underlying `requirePermission()`/
  `AccessDenied` code path is identical to the one already proven correct
  for those two states in Picking (`V2-0019`) and Main (`V2-0017`); no new
  logic was introduced, only new call sites.
- `lint`/`typecheck`/`build` all pass. `git diff --check` passes (existing
  CRLF warnings only).
- No Supabase schema, staging data, V1 production files, GAS deployments,
  Sheets, URLs, LINE tokens, or secrets changed.
