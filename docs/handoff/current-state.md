# Current State

Last updated: 2026-06-19

## Project

- Repository: `https://github.com/AKRA-WEB/WEBAPP-V2`
- Local path: `C:\dev\AKRA-WEBAPP-V2`
- Status: Phase 3 Picking pilot schema and mapping drafted, applied to staging,
  and DB-verified
- Production impact: None
- V1 reference path: `C:\dev\WEBAPP`

## Objective

Create a new unified AKRA WEBAPP V2 that combines the current separate HTML,
Google Apps Script, Google Sheets, and GitHub Pages apps into one modular web
application.

Target stack:

- Next.js + TypeScript
- Vercel deployment
- Supabase Auth and Postgres
- Incremental module migration from V1

## Current Baseline

This repository was cloned as an empty GitHub repo and initialized with planning
and handoff documents. A minimal Next.js app shell has now been scaffolded.

## Active Plan

Plan IDs:

- `V2-0003` (`docs/plans/V2-0003-core-schema.md`)
- `V2-0004` (`docs/plans/V2-0004-core-v1-import-mapping.md`)
- `V2-0005` (`docs/plans/V2-0005-dashboard-app-registry.md`)
- `V2-0006` (`docs/plans/V2-0006-picking-pilot-schema.md`)
- `V2-0007` (`docs/plans/V2-0007-supabase-migration-preflight.md`)
- `V2-0008` (`docs/plans/V2-0008-staging-migration-apply.md`)

Goal: Finish the Phase 2 core schema baseline and draft the Phase 3 Picking
pilot schema/mapping so the first module can be staged without touching V1
production systems.

Status:

- Phase 1 app shell complete (see plan `V2-0002` history below).
- Phase 2 core schema written as DRAFT migrations `0001`-`0003` under
  `supabase/migrations/` (tables, `private` auth/RLS helpers, RLS policies,
  explicit grants, structural seed) and applied to the staging Supabase project.
- `0006_core_grant_hardening.sql` closes broad default grants found during
  staging verification after the initial `0001`-`0005` apply.
- `handle_new_user` profile provisioning now lives in `private`; trigger-only
  helper execution is revoked from direct `public`/`anon`/`authenticated` calls.
- V1 `User` / `AppConfig` / `RoleConfig` / `PermConfig` import mapping is
  drafted in `docs/migration/core-v1-import-mapping.md`; no real V1 data has
  been exported or imported.
- Server `getPermissionSnapshot()` and admin read-only viewer
  `/admin/permissions` added.
- Dashboard module cards now read from `public.apps` when Supabase env and a
  signed-in user are available, with a static fallback when the database is not
  configured yet.
- ADR `0003` records core-tables-in-`public` decision.
- Phase 3 Picking pilot schema written as DRAFT migrations `0004`-`0005`
  under `supabase/migrations/` (products, staff, requisitions, lines, problem
  reports, lifecycle events, daily bill sequences, and server-only token/contact
  tables) and applied to the staging Supabase project.
- V1 Picking mapping is drafted in `docs/migration/picking-v1-mapping.md`;
  no real V1 Picking data has been exported or imported.
- ADR `0004` records the temporary `public.picking_*` table naming and
  server-only secret/contact split.
- Continuation preflight on 2026-06-18 confirmed official Supabase docs still
  emphasize explicit grants for Data API exposure, RLS on exposed tables, and
  `security definer` functions with a fixed `search_path`.
- `lint` / `typecheck` / `build` / `git diff --check` pass. Static consistency
  checks confirm permission seed keys match `AppPermission` and fallback app
  registry keys match the structural `apps` seed.
- Added repeatable `npm run check:migrations` preflight covering draft
  migration RLS/grant/security-definer/server-only table assumptions plus the
  existing permission/app-registry drift checks; it passes locally.
- Local `.env.local` now contains the staging project's public Supabase URL and
  publishable key only. `SUPABASE_SECRET_KEY` is intentionally blank until a
  rotated staging service role key is provided.
- Added `pg`-based tooling scripts: `npm run db:apply-migrations` and
  `npm run db:verify-staging-schema`, both reading `DATABASE_URL` only from the
  process environment.
- Staging DB verification passed after `0006` (17 public tables, 15 policies);
  anonymous Data API access to `public.apps` returns HTTP 401 with the
  publishable key.
- Added `docs/runbooks/supabase-staging-migration.md` documenting the correct
  staging migration workflow, required verification targets, and the grant/RLS
  error found during staging apply.
- Added a rotated staging service role key to local `.env.local`
  (`SUPABASE_SECRET_KEY`); user confirmed it is a rotated key, not the one
  previously shared in chat. Not yet added to Vercel project settings.
- Added `scripts/create-test-account.mjs` (Supabase Admin API: creates an
  `auth.users` row with `email_confirm: true` and upserts a `user_roles`
  assignment for a given role key). Used it to create one staging test
  account: `test-admin@akra-v2.test`, role `ADMIN`. This is a synthetic test
  account, not a V1 data import.
- Verified sign-in and the `/admin/permissions` viewer end to end against
  staging using a temporary local Playwright install (`npm install --no-save
  playwright`, removed again after the test): `/login` signs in and redirects
  to `/`, `/admin/permissions` renders the `ADMIN` role card, all 13
  permissions, all 8 apps, with no console errors. Playwright is not a project
  dependency; the one-off check script was deleted after use.
- User added the public Supabase env vars and the rotated `SUPABASE_SECRET_KEY`
  to the V2 Vercel project (`https://vercel.com/akrapanich-3912s-projects/project-webapp-v2`)
  by hand via the dashboard, scoped to Preview + Development.
- Found and fixed a Vercel build failure (`No Output Directory named "public"
  found`) caused by the project's Framework Preset not being set to Next.js;
  fixing the preset (and clearing any Output Directory override) made the
  build succeed.
- Discovered all Phase 2/3 work had been sitting uncommitted locally and was
  never pushed, so Vercel had only ever deployed the Phase 1 scaffold
  (`e99fc59`) — explaining the stale `Phase 1` pill and missing
  `/admin/permissions` route the user saw on the live deployment. Committed
  and pushed it in three commits on `main` (`c31bc54`, `1d8dede`, `325d6ee`);
  see the 2026-06-19 work-log entry for details.
- User confirmed sign-in at `/login` works against the live deployment (typed
  directly; there is no nav link to it yet) with the `test-admin@akra-v2.test`
  test account.
- No V1 production files changed.

## Next Actions

1. Trigger a fresh Vercel deploy now that Phase 2/3 work is pushed, and
   re-verify `/login` + `/admin/permissions` show the real Phase 2 content
   (previous live checks were against the stale Phase 1 deployment).
2. Wire real navigation: `AppShell` sidebar items and dashboard module cards
   are still Phase-1 placeholders (`href="/"` / no link at all) with no
   visible way to reach `/login` or `/admin/permissions`.
3. Decide whether the Production Vercel environment should also get the
   Supabase env vars and have Deployment Protection adjusted, or stay locked
   down until a real cutover decision is made (env vars are currently
   Preview + Development only).
4. Create/link remaining staging Supabase Auth users and seed role assignments
   for additional test accounts (one ADMIN test account exists; see
   `scripts/create-test-account.mjs`).
5. Use `docs/migration/core-v1-import-mapping.md` to prepare a staging import
   for real V1 `User` / `AppConfig` / `RoleConfig` / `PermConfig` data.
6. Wire server-side permission guards into routes/actions using
   `getPermissionSnapshot()` + `can()`.
7. Start implementing V2 Picking routes/actions after the Picking schema is
   applied and verified in a local or staging Supabase database.

## Open Questions

- Should V2 use Supabase Auth from day one, or temporarily bridge existing Main
  SSO during migration?
- Should Vercel production be private/protected until first cutover?
- Which module should be the pilot if the user prefers something other than
  `Picking`?
- How should V1 users without email addresses be represented in Supabase Auth?
- Will V1 Sheets remain read-only archives after each module cutover, or should
  there be a temporary sync window?

## Safety Notes

Do not modify V1 repos, GAS deployments, production Sheets, or production URLs
while working in V2 unless the user explicitly approves a cutover task.

Do not commit real Supabase keys. The service role key must only be stored in
local ignored env files, Vercel environment variables, or a secure secret
manager.
