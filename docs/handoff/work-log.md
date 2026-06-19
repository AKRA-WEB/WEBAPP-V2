# Work Log

## 2026-06-18 - V2 Planning Baseline

- Cloned `https://github.com/AKRA-WEB/WEBAPP-V2` into
  `C:\dev\AKRA-WEBAPP-V2`.
- Repository was empty at clone time.
- Added baseline documentation and handoff structure.
- Added placeholder source folders for the future Next.js/Supabase app.
- No production V1 apps, GAS deployments, or Sheets were changed.

Verification:

- `git diff --cached --check` passed.
- Baseline committed and pushed as `388f697`.
- Working tree was clean after push.

## 2026-06-18 - Phase 1 App Shell Scaffold

- Added a minimal Next.js 16 / React 19 / TypeScript app shell.
- Added dashboard route `/` with migration/module status panels.
- Added `/login` route with a Supabase Auth sign-in form.
- Added Supabase SSR helpers:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/proxy.ts`
  - `proxy.ts`
- Added public Supabase env guard so the app shell can boot without `.env.local`.
- Added permission helper stub in `src/modules/auth/permissions.ts`.
- Added `.env.example` with placeholders only.
- Did not commit real Supabase keys, service role key, Vercel project metadata,
  or any V1 production details.
- Adjusted ESLint to major 9 because ESLint 10 was incompatible with the
  installed `eslint-config-next` package.

Verification:

- `npm audit --audit-level=moderate` passed with 0 vulnerabilities.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- No V1 production apps, GAS deployments, or Sheets were changed.

## 2026-06-18 - Phase 2 Core Identity And Permissions Schema

Plan: `V2-0003` (`docs/plans/V2-0003-core-schema.md`).

- Added core schema DRAFT migrations under `supabase/migrations/`:
  - `0001_core_identity_schema.sql`: `profiles` (1:1 with `auth.users`,
    auto-provisioned via `private.handle_new_user` trigger), `roles`,
    `permissions`, `role_permissions`, `user_roles`, `apps` (registry),
    `audit_logs`.
  - `0002_core_rls_policies.sql`: `private` schema `security definer` helpers
    `is_admin` / `has_permission` reproducing `can()`; RLS enabled on all
    tables; read grants to `authenticated`; full explicit table grants to
    `service_role`; no authenticated write policies (privileged mutations are
    server/service-role only).
  - `0003_core_seed.sql`: 13 permission keys (exact match to `AppPermission`),
    `ADMIN` role, 8 app-registry rows. Structural seed only, NOT a V1 import.
- Added `src/modules/auth/get-permission-snapshot.ts` (server-only) building the
  `PermissionSnapshot` used by `can()`.
- Added admin read-only viewer at `/admin/permissions`
  (`src/app/admin/permissions/page.tsx`), gated by `can(snapshot, 'core.admin')`.
- Added ADR `docs/decisions/0003-core-tables-in-public-schema.md` (core tables in
  `public`, helpers in `private`).

Decisions / notes:

- Auth-vs-SSO not re-opened: profiles bind to `auth.users` per Phase 2 exit
  criteria (represent users without V1 SSO).
- The `ADMIN` *role* (short-circuits checks) is intentionally distinct from the
  `core.admin` *permission*.
- Migration filenames use ordered `000N_` prefixes, not CLI timestamps, per
  `supabase/migrations/README.md`. Promote via `supabase migration new` once the
  CLI / local stack exists.

Verification:

- `npm run lint`, `npm run typecheck`, `npm run build` all passed;
  `/admin/permissions` route builds.
- SQL was NOT applied or linted against a database: no Supabase CLI, Docker, or
  `.env.local` in this workspace. SQL was hand-reviewed for ordering safety
  (helpers before policies, tables before FKs) and seed-key parity with
  `AppPermission`. Local apply / `supabase db lint` is deferred to when the CLI
  is available.
- No V1 production apps, GAS deployments, or Sheets were changed.

Known follow-ups:

- `/admin/permissions` runtime behavior is NOT yet verified — the local build
  prerenders the "not configured" notice because no env is present, so the
  data-fetch path was never exercised. Verify after applying the SQL with env.
- The dashboard module list in `src/app/page.tsx` is hardcoded and duplicates
  the seeded `apps` table. They agree now but will drift; wire the dashboard to
  read `apps` in a later change.

## 2026-06-18 - Phase 2 Schema Hardening And V1 Import Mapping

Plans:

- `V2-0003` (`docs/plans/V2-0003-core-schema.md`)
- `V2-0004` (`docs/plans/V2-0004-core-v1-import-mapping.md`)

Changes:

- Checked current official Supabase changelog/docs before editing schema/RLS:
  - `https://supabase.com/changelog.md`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security.md`
  - `https://supabase.com/docs/guides/database/functions.md`
  - `https://supabase.com/docs/guides/auth/managing-user-data.md`
  - `https://supabase.com/docs/guides/api/securing-your-api.md`
- Hardened draft migration `0001_core_identity_schema.sql`:
  - Created/revoked `private` schema access before privileged helpers.
  - Moved `handle_new_user` from `public` to `private`.
  - Revoked direct execute access for `public.set_updated_at()` and
    `private.handle_new_user()` from `public`, `anon`, and `authenticated`.
- Hardened draft migration `0002_core_rls_policies.sql` with explicit
  `service_role` grants for server-side privileged workflows, matching the
  2026 Supabase Data API explicit-grant guidance.
- Added `docs/migration/core-v1-import-mapping.md` to map V1 `User`,
  `AppConfig`, `RoleConfig`, and `PermConfig` into V2 core tables.
- Added plan `V2-0004` for the import mapping work.
- Updated `docs/migration/database-strategy.md`, `migration-plan.md`,
  `module-inventory.md`, and this handoff state.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed; `/admin/permissions` remains a dynamic route.
- `git diff --check` passed. It reported CRLF-to-LF conversion warnings only.
- SQL was still NOT applied or linted against a database because this workspace
  has no Supabase CLI, Docker, or `.env.local`.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

Known follow-ups:

- Install/configure Supabase CLI and Docker or connect a staging project, then
  apply and lint `0001`-`0003`.
- Convert draft `000N_` migration filenames to CLI timestamp filenames when
  the CLI workflow is available.
- Decide how to create/link Supabase Auth users for V1 users that do not have
  email addresses.

## 2026-06-18 - Dashboard App Registry Source

Plan: `V2-0005` (`docs/plans/V2-0005-dashboard-app-registry.md`).

Changes:

- Checked current official Supabase changelog/docs before adding a dashboard
  Supabase read path:
  - `https://supabase.com/changelog.md`
  - `https://supabase.com/docs/guides/auth/server-side/nextjs.md`
  - `https://supabase.com/docs/guides/api/securing-your-api.md`
- Added `src/modules/core/app-registry.ts` with:
  - A static fallback registry matching migration `0003_core_seed.sql`.
  - `getAppRegistry()` server helper that reads `public.apps` only when public
    Supabase env exists and a user is signed in.
  - Fallback behavior when env/session/table access is unavailable, so `/`
    still builds and loads before Supabase is configured.
- Updated `src/app/page.tsx` to render module cards from `getAppRegistry()`
  instead of keeping a page-local module list.
- Updated the dashboard phase pill from `Phase 1` to `Phase 2`.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed; `/` remains statically prerendered without env and
  `/admin/permissions` remains dynamic.
- `git diff --check` passed. It reported CRLF-to-LF conversion warnings only.
- SQL was still NOT applied or linted against a database because this workspace
  has no Supabase CLI, Docker, or `.env.local`.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

Known follow-ups:

- Re-test `/` with real Supabase env after applying migrations and signing in;
  the database-backed app registry path cannot run in this workspace yet.

## 2026-06-18 - Picking Pilot Schema And Mapping

Plan: `V2-0006` (`docs/plans/V2-0006-picking-pilot-schema.md`).

Changes:

- Checked current official Supabase changelog/docs before editing Picking
  schema/RLS:
  - `https://supabase.com/changelog`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security`
  - `https://supabase.com/docs/guides/database/functions`
  - `https://supabase.com/docs/guides/api/securing-your-api`
- Read V1 Picking references in `C:\dev\WEBAPP\Picking` read-only, including
  the git-ignored `Code.gs.txt` headers and recent conductor plan
  `20260617-001-picking-bulk-entry-flex-card-billno.md`.
- Added draft migration `0004_picking_pilot_schema.sql` for Picking products,
  staff, requisitions, lines, problem reports, lifecycle events, daily bill
  sequences, and server-only token/contact tables.
- Added `private.next_picking_bill_no(date)` as a transaction-safe V2 daily
  counter source, with `security definer set search_path = ''` and direct
  execution revoked from `public`, `anon`, and `authenticated`.
- Added draft migration `0005_picking_rls_policies.sql` with RLS enabled on all
  Picking tables, authenticated read policies requiring `picking.read` or
  `picking.write`, and service-role grants for server-side workflows.
- Hardened Picking grants by revoking all table access from `public`, `anon`,
  and `authenticated` before re-granting only intended authenticated reads, so
  older Supabase default privileges cannot leave broader Data API access.
- Added `docs/migration/picking-v1-mapping.md` for V1 sheet/action mapping and
  token import handling.
- Added ADR `0004-picking-public-prefixed-tables-and-secret-split.md` and
  recorded Picking assumptions in `docs/migration/database-strategy.md`.
- Updated `docs/migration/migration-plan.md`, `module-inventory.md`, and
  `docs/handoff/current-state.md` to show Phase 3 Picking schema/mapping
  started.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed; `/` and `/login` prerender statically and
  `/admin/permissions` remains dynamic.
- `git diff --check` passed. It reported CRLF-to-LF conversion warnings only.
- SQL was NOT applied or linted against a database because this workspace has
  no Supabase CLI, Docker, or `.env.local`.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

Known follow-ups:

- Install/configure Supabase CLI and Docker or connect a staging project, then
  apply and lint `0001`-`0005`.
- Convert draft `000N_` migration filenames to CLI timestamp filenames when the
  CLI workflow is available.
- Implement V2 Picking routes/actions only after the schema is verified in a
  local or staging Supabase database.

## 2026-06-18 - Supabase Apply Preflight Continuation

Context:

- Resumed from `docs/handoff/current-state.md`; the next major action is to
  apply/lint migrations `0001`-`0005` in a local or staging Supabase database.
- Rechecked current official Supabase changelog/docs before touching the
  Supabase workstream:
  - `https://supabase.com/changelog`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security`
  - `https://supabase.com/docs/guides/database/functions`
  - `https://supabase.com/docs/guides/api/securing-your-api`
  - `https://supabase.com/docs/reference/cli/introduction`

Findings:

- `supabase` CLI is not installed in this workspace.
- `docker` is not installed or not available on PATH.
- `.env.local` is absent, so no Supabase project credentials are configured.
- Therefore migration apply, `supabase db lint`, and end-to-end auth/RLS tests
  are still blocked until a local stack or staging project is available.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed; `/admin/permissions` remains dynamic.
- `git diff --check` passed with CRLF-to-LF warnings only.
- Static consistency checks passed:
  - `src/modules/auth/permissions.ts` permission union matches the permission
    seed in `0003_core_seed.sql`.
  - `src/modules/core/app-registry.ts` fallback keys match the `apps` seed in
    `0003_core_seed.sql`.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

Known follow-ups:

- Install/configure Supabase CLI plus Docker, or provide a staging Supabase
  project/env, then apply and lint `0001`-`0005`.
- Promote draft `000N_` migration files to CLI timestamp filenames once the CLI
  workflow is available.
- Test sign-in, dashboard database registry reads, and `/admin/permissions`
  against a real applied schema.

## 2026-06-18 - Repeatable Migration Static Preflight

Plan: `V2-0007` (`docs/plans/V2-0007-supabase-migration-preflight.md`).

Context:

- Continued from the active V2 next action: apply/lint draft migrations
  `0001`-`0005` when a local or staging Supabase database is available.
- Rechecked current official Supabase changelog/docs before touching the
  Supabase workstream:
  - `https://supabase.com/changelog.md`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security.md`
  - `https://supabase.com/docs/guides/database/functions.md`
  - `https://supabase.com/docs/guides/api/securing-your-api.md`
  - `https://supabase.com/docs/reference/cli/introduction.md`

Changes:

- Added `scripts/check-migrations.mjs`.
- Added `npm run check:migrations`.
- The preflight checks that every created public table has RLS enabled, every
  public table has explicit `service_role` table grants, no migration grants
  access to `anon`, server-only Picking tables are not granted authenticated
  reads, `security definer` functions are private with fixed `search_path`,
  private function execute grants match the intended caller roles, permission
  seed keys match `AppPermission`, and app seed keys match the dashboard
  fallback registry.

Verification:

- `npm run check:migrations` passed (17 public tables, 13 permissions).
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed with CRLF-to-LF warnings only.
- Supabase SQL was still NOT applied or linted against a database because
  `supabase` CLI and `docker` are not on PATH and `.env.local` is absent.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

Known follow-ups:

- Install/configure Supabase CLI plus Docker, or provide a staging Supabase
  project/env, then apply and lint `0001`-`0005`.
- Promote draft `000N_` migration files to CLI timestamp filenames once the CLI
  workflow is available.
- Keep `npm run check:migrations` in the verification set for future schema/RLS
  edits.

## 2026-06-19 - Staging Supabase Environment Public Config

Context:

- User selected the staging Supabase project path instead of requiring a local
  Supabase CLI/Docker stack first.
- Rechecked current official Supabase docs/changelog before continuing the
  schema/RLS workstream:
  - `https://supabase.com/changelog.md`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security.md`
  - `https://supabase.com/docs/guides/database/functions.md`
  - `https://supabase.com/docs/guides/api/securing-your-api.md`

Changes:

- Created local ignored `.env.local` with the staging project's public Supabase
  URL and publishable key.
- Left `SUPABASE_SECRET_KEY` blank. A service role key was shared in chat before
  this entry, so a rotated staging service role key should be used before any
  privileged app/runtime testing.

Verification:

- Staging REST endpoint resolves: `/rest/v1/` returns HTTP 401 without an API
  key, which confirms the project URL is reachable.
- `npm run typecheck` passed.
- `npm run build` passed and loaded `.env.local`.

Blocked / next:

- SQL migrations `0001`-`0005` still have NOT been applied to Supabase. Applying
  them from this workspace requires either a staging Postgres/database
  connection string or manual execution through the Supabase SQL Editor.
- After apply, run database/advisor checks where available and test sign-in,
  dashboard database app registry reads, and `/admin/permissions`.

## 2026-06-19 - Staging Migration Apply And Grant Hardening

Plan: `V2-0008` (`docs/plans/V2-0008-staging-migration-apply.md`).

Context:

- User provided a staging Postgres connection string for the Supabase project.
- The connection string was used only through the process environment for
  migration/verification commands and was not committed to repo files.

Changes:

- Added `scripts/apply-migrations.mjs`, which applies migration SQL files in
  lexical order or a specific file list using `DATABASE_URL`.
- Added `scripts/verify-staging-schema.mjs`, which checks expected public
  tables, RLS enablement, table grants, policy coverage, structural seeds, and
  private helper functions against the real staging database.
- Added `pg` as a dev dependency and npm scripts:
  - `npm run db:apply-migrations`
  - `npm run db:verify-staging-schema`
- Applied `supabase/migrations/0001`-`0005` to staging.
- DB verification found broad default grants on core tables (`anon` and
  `authenticated` retained full table privileges) because `0002` did not revoke
  project defaults before granting intended access.
- Hardened `0002_core_rls_policies.sql` with explicit core-table revokes.
- Added `0006_core_grant_hardening.sql` and applied it to staging to correct the
  already-applied database.
- Tightened `npm run check:migrations` so future public tables must be covered
  by explicit `revoke all ... from public, anon, authenticated` statements.

Verification:

- `0001`-`0005` apply succeeded.
- `0006_core_grant_hardening.sql` apply succeeded.
- `npm run db:verify-staging-schema` passed: 17 public tables and 15 policies.
- Anonymous Data API read test against `public.apps` with the publishable key
  returns HTTP 401.
- `npm run check:migrations` passed.

Known follow-ups:

- Supabase advisor/lint checks were not run because Supabase CLI/MCP advisor
  tooling is not configured in this workspace.
- End-to-end auth, dashboard database reads, and `/admin/permissions` still need
  staging users/roles and a rotated server-only key.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were changed.

## 2026-06-19 - Staging Migration Runbook

Context:

- User asked whether the encountered errors and correct future workflow had
  been recorded.

Changes:

- Added `docs/runbooks/supabase-staging-migration.md`.
- The runbook records:
  - the correct staging migration workflow;
  - secret-handling rules for `DATABASE_URL` and service role keys;
  - required DB verification targets;
  - the broad default-grant error found after initial staging apply;
  - the server-only Picking table policy exception;
  - the current staging baseline (`0001`-`0006` applied and verified).
- Linked the runbook from `docs/handoff/current-state.md`.

Verification:

- `git diff --check` passed with line-ending warnings only.

## 2026-06-19 - Rotated Service Key, Test Account, Sign-In E2E Verification

Context:

- Continued from Next Action 1 in `docs/handoff/current-state.md`: add a
  rotated server-only staging service role key and test sign-in +
  `/admin/permissions` end to end.
- User added a `SUPABASE_SECRET_KEY` value to local `.env.local` and confirmed
  (when asked directly) that it is a newly rotated key, not the one
  previously shared in chat.

Changes:

- Confirmed `npm run build` picks up `.env.local`: `/` and
  `/admin/permissions` build as dynamic routes once Supabase env is present.
- Added `scripts/create-test-account.mjs`: uses the Supabase Admin API
  (service role key) to create an `auth.users` row with `email_confirm: true`
  and upsert a `public.user_roles` row for a given role key. Reusable for
  future staging test accounts (Next Action 2).
- Created one staging test account with it: `test-admin@akra-v2.test`, role
  `ADMIN`. Synthetic test account only, not a V1 data import.
- Installed Playwright locally and temporarily (`npm install --no-save
  playwright` + `npx playwright install chromium`) to drive a real headless
  browser against the dev server, since no browser driver was available in
  this workspace. Wrote a one-off check script, ran it, then deleted the
  script, its screenshots, and uninstalled the package afterward (`npm
  uninstall playwright`); confirmed no `playwright` package remained in
  `node_modules` and no unintended diff landed in `package.json` /
  `package-lock.json`.
- The one-off check signed in at `/login` with the test account, confirmed
  redirect to `/`, then loaded `/admin/permissions` and confirmed it rendered
  the `ADMIN` role card, all 13 seeded permissions, all 8 seeded apps, with no
  browser console errors. Screenshot was visually reviewed before cleanup.

Verification:

- `npm run build` passed with `.env.local` present; `/` and
  `/admin/permissions` are dynamic routes.
- End-to-end browser check (described above) passed: sign-in, redirect, and
  `/admin/permissions` ADMIN view all confirmed working against the staging
  Supabase project.
- `git status` after cleanup shows no leftover Playwright-related files; only
  `scripts/create-test-account.mjs` was added under `scripts/`.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were
  touched.

Known follow-ups:

- Add the same rotated service role key to Vercel project settings (only done
  locally so far).
- Create/link additional staging Supabase Auth users for other roles using
  `scripts/create-test-account.mjs`.
- `test-admin@akra-v2.test` is a real row in the staging `auth.users` /
  `profiles` / `user_roles` tables; delete it before any staging data import
  or demo if a clean user list is needed.

## 2026-06-19 - Vercel Project Access Check

Context:

- Tried to add the rotated `SUPABASE_SECRET_KEY` to Vercel project settings
  per the Next Action above.

Findings:

- `vercel whoami` is logged in as `akra-web`, scoped to team
  `buymoreth-erp-projects`. `vercel project ls` under that scope shows only
  one project, `project-erp-kokx`, which does not match this repo.
- User confirmed the real V2 Vercel project is
  `https://vercel.com/akrapanich-3912s-projects/project-webapp-v2`.
- `vercel switch akrapanich-3912s-projects` failed:
  `scope_not_accessible` — the locally logged-in CLI account cannot see that
  team.
- User chose to add the env var by hand through the Vercel dashboard instead
  of fixing CLI access in this session. No Vercel changes were made from this
  workspace.

No V1 production apps, GAS deployments, Sheets, URLs, or secrets were
touched.
