# Plan V2-0009: Next Execution Sequence

Status: In progress — step 5 complete (steps 1, 2, 3, 4, 5 done)


## Goal

Turn the verified V2 staging baseline into a usable pilot path by finishing
core app navigation, staging access setup, import readiness, route permission
guards, and then the first Picking screens/actions.

## Scope

- Make the existing deployed V2 app navigable without typing hidden URLs.
- Keep Production deployment locked down unless a cutover decision explicitly
  changes that.
- Add enough staging users and role assignments to test non-admin behavior.
- Prepare the V1 core-data import path before importing real V1 users,
  roles, apps, or permissions.
- Apply server-side permission guards before adding operational module writes.
- Start the Picking pilot only after the core access and guard path is usable.

## Out Of Scope

- Changing V1 production apps, Google Apps Script deployments, Sheets, live
  URLs, LINE tokens, or GitHub Pages deployments.
- Importing production V1 data before validation tooling exists.
- Moving Vercel Production to a live cutover state.
- Implementing PR/PO/GR, Warehouse, Returns, or KPI module workflows before the
  Picking pilot proves the V2 pattern.
- Adding broad frameworks or a new design system beyond the current Next.js
  app shell.

## Recommended Sequence

### 1. Navigation And Access Shell

Status: Complete on 2026-06-19.

Wire `AppShell` links and dashboard cards to real routes. The immediate targets
are `/`, `/login`, `/admin/permissions`, and placeholder module landing routes
that clearly show unavailable modules without linking everything back to `/`.

This should be the next implementation step because the verified features are
currently hidden from normal users.

Expected files:

- `src/components/app-shell.tsx`
- `src/app/page.tsx`
- New lightweight route placeholders under `src/app/*` if needed
- Handoff docs

Verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Browser check for desktop/mobile navigation when feasible

Completion notes:

- Sidebar now links to Dashboard, Permissions, Picking, Purchasing, Receiving,
  Warehouse, Returns, KPI, and Sign In.
- Dashboard module cards link to seeded registry routes when a route exists.
- Placeholder module landing pages exist for queued modules and the Picking
  pilot route.
- Browser smoke test passed against production `next start` on
  `http://127.0.0.1:3001/` and `/picking` with no console errors.

### 2. Deployment Boundary Decision

Keep Supabase env vars and service keys scoped to Preview + Development unless
the user explicitly decides Production should connect to staging. If Production
is connected, document that it is still not a V1 cutover and should stay behind
deployment protection until an approved module cutover.

This is a user decision, not a code requirement. The safe default is to keep
Production locked down.

Expected files:

- `docs/decisions/*` only if the boundary changes
- Handoff docs

Verification:

- Confirm Vercel environment scopes by user dashboard or CLI access if
  available

### 3. Staging User Matrix

Create test accounts for the roles needed to exercise the permission model, not
only `ADMIN`. At minimum, add a read/write Picking user and a read-only user
once the exact role names are approved.

Use `scripts/create-test-account.mjs`; do not commit passwords or keys.

Expected files:

- Handoff docs
- No app code changes unless the script needs a small fix

Verification:

- Sign in as each role
- Confirm `/admin/permissions` denies non-admin users
- Confirm dashboard/app registry reads behave as expected

### 4. Core Import Dry Run

Status: Complete on 2026-06-19.

Outcome: Created `scripts/core-import-dry-run.mjs` which validates headers, normalizes roles/permissions, generates synthetic emails (e.g. name@akra-v2.test), and outputs a detailed markdown report inside `import-reports/dry-run-report.md`. It resolves DB roles/permissions via Supabase HTTPS API to avoid IPv6/port-5432 network timeout issues.

Files:
- `scripts/core-import-dry-run.mjs`
- `import-reports/dry-run-report.md` (local only, git-ignored)
- Synthetic snapshot fixtures generated in `import-snapshots/` (local only, git-ignored)


### 5. Server Permission Guard Pattern

Status: Complete on 2026-06-19; corrected on 2026-06-20 to fail closed when a
caller omits an explicit permission requirement.

Create a reusable server-side guard wrapper around `getPermissionSnapshot()` and
`can()` so routes and future actions fail closed consistently. Apply it to
admin routes first, then use the same pattern for Picking routes/actions.

Expected files:

- `src/modules/auth/*`
- Existing route files that need guards
- Handoff docs

Verification:

- Admin user can access `/admin/permissions`.
- Non-admin user is denied.
- Missing Supabase env or missing session fails closed.
- Empty guard calls fail closed instead of allowing all authenticated users.
- `npm run lint`, `npm run typecheck`, `npm run build`.

### 6. Picking Pilot UI And Actions

Implement the smallest useful V2 Picking pilot after core access is stable:
read-only requisition list first, then create requisition server action, then
status transitions and problem reporting. LINE notification integration should
remain server-side and can be introduced after the data flow is proven.

Before implementation begins, use `V2-0010` to confirm the product scope and
user-flow gate: MVP, nice-to-have items, out-of-scope items, screen notes,
system logic, data/integration points, task breakdown, and verification.

Expected files:

- `src/app/picking/*`
- `src/modules/picking/*`
- Possibly server-only notification helpers later
- Handoff docs

Verification:

- Permission-gated read path
- Transaction-safe bill number allocation
- Server-side mutation tests/checks where available
- Browser check on mobile width because Picking is operational/mobile-heavy

## Grill-Me Questions Before Starting Execution

1. Is the next milestone a safe internal pilot or a demo for real operators?
   This changes how much UX polish and dummy data we need before Picking.
2. Should Production Vercel remain protected until first module cutover? The
   safe answer is yes.
3. Which roles must be represented in staging before we trust the permission
   model: `ADMIN`, Picking writer, Picking reader, and a denied user?
4. Are V1 users without email addresses allowed to get synthetic staging emails,
   or must we preserve real login identifiers from day one?
5. Should the first Picking screen be read-only history/list or new requisition
   creation? Read-only is safer; creation proves the workflow faster.
6. Should LINE integration wait until after DB create/list works? Waiting keeps
   token handling and notification failures out of the first UI slice.

## Rollback / No-Production-Impact Note

This sequence keeps all implementation inside the V2 repository, the V2 Vercel
project, and the staging Supabase project. V1 remains the live production
system. No V1 repo, GAS deployment, Sheet schema, GitHub Pages deployment, live
URL, or LINE token should be changed by this plan.
