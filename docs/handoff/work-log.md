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

## 2026-06-19 - Vercel Env Vars, Build Fix, And Discovery Of Unpushed Commits

Context:

- User added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  and the rotated `SUPABASE_SECRET_KEY` to the Vercel project
  (`https://vercel.com/akrapanich-3912s-projects/project-webapp-v2`) by hand
  through the dashboard, scoped to Preview + Development (not Production),
  then redeployed.

Findings:

- First redeploy failed: `Error: No Output Directory named "public" found
  after the Build completed.` Root cause was the Vercel project's Framework
  Preset not being set to Next.js (or an Output Directory override of
  `public`). Fixed by the user in Settings → Build and Deployment by setting
  Framework Preset to Next.js and clearing any Output Directory override;
  redeploy then succeeded.
- The unique deployment URL (with a random hash suffix) returned HTTP 401
  from Vercel's own Deployment Protection / Vercel Authentication wall (body:
  "Authentication Required"), not an app error. This was expected — the
  workspace's `vercel` CLI session cannot bypass it (see the
  `scope_not_accessible` finding above), so verification had to be done by
  the user directly in a browser already authenticated to the Vercel team.
- After the build fix, the user opened the **production alias**
  (`https://project-webapp-v2.vercel.app/`) and saw the dashboard, but it
  showed a `Phase 1` status pill (current code has `Phase 2`) and no sidebar
  link reaches `/login` or `/admin/permissions` (all `AppShell` nav items are
  still placeholders pointing at `/`; module cards are plain `<article>`s,
  not links — this matches the current source, not a bug).
- Root cause of the stale `Phase 1` content: `git log` showed `HEAD` was
  still at `e99fc59 Scaffold Next.js app shell`. All Phase 2/3 work (core +
  Picking schema migrations, `/admin/permissions`, `get-permission-snapshot`,
  the Supabase-backed app registry, ADRs, plans, runbooks, and tooling
  scripts) had been sitting uncommitted in the working tree this whole time
  and was never pushed to `https://github.com/AKRA-WEB/WEBAPP-V2`. Vercel
  builds from that GitHub remote, so it only ever had the Phase 1 scaffold to
  deploy — `/admin/permissions` did not exist in any deployed build yet.
- User confirmed sign-in at `/login` (typed directly, since there is no nav
  link to it yet) works against the live deployment with the test account
  `test-admin@akra-v2.test`.

Changes:

- Committed and pushed the previously-uncommitted Phase 2/3 work in three
  commits on `main`:
  - `c31bc54` — core identity/permissions schema, Picking pilot schema,
    `/admin/permissions`, the app registry, ADRs, and import-mapping docs.
  - `1d8dede` — migration tooling scripts and the staging migration runbook.
  - `325d6ee` — handoff docs, README, `.env.example` `DATABASE_URL` entry,
    and `CLAUDE.md`.
- Excluded the user's local debug screenshot (`screenshot/`) from any commit;
  it is not part of the application and was left untracked.

Verification:

- `npm run lint`, `npm run typecheck`, and `git diff --check` passed before
  committing (CRLF-only warnings).
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were
  touched. `.env.local` remains git-ignored and was never staged.

Known follow-ups:

- After this push, trigger another Vercel deploy and re-verify `/login` +
  `/admin/permissions` now show the real Phase 2 dashboard and permission
  viewer (previous checks were against the stale Phase 1 deployment).
- Wire real navigation: `AppShell` sidebar items and dashboard module cards
  still need real `href`s (including a visible way to reach `/login` and
  `/admin/permissions`) instead of Phase-1 placeholders.
- Decide whether the Production Vercel environment should also get the
  Supabase env vars and have Deployment Protection adjusted, or stay locked
  down until a real cutover decision is made.

## 2026-06-19 - Push To Main And Live Verification

Changes:

- User explicitly authorized pushing directly to `main` (no PR; solo-dev
  repo, no branch protection in use). Pushed `e99fc59..8a8f083` to
  `origin/main`.
- Vercel auto-redeployed from the push.

Verification:

- User opened `https://project-webapp-v2.vercel.app/admin/permissions` after
  signing in with `test-admin@akra-v2.test` and confirmed (via screenshot) it
  now renders the real Phase 2 content: `ADMIN` role card, `Permissions
  (13)`, `Apps (8)`, `Read only` pill — matching the local Playwright check
  exactly.
- Next Action 1 from the prior baseline (rotated service key + Vercel env
  vars + sign-in/`/admin/permissions` end-to-end) is fully closed.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were
  touched.

## 2026-06-19 - Next Execution Sequence Plan

Plan: `V2-0009` (`docs/plans/V2-0009-next-execution-sequence.md`).

Context:

- User asked for an Architect-style plan for the next work after live
  verification of `/admin/permissions`.
- No `CONDUCTOR.md` exists in the V2 repo, so the V2 `AGENTS.md` planning and
  handoff rules were used.

Changes:

- Added a proposed execution sequence covering navigation, deployment boundary,
  staging user matrix, core import dry run, server permission guard pattern, and
  the first Picking UI/actions.
- Updated `docs/handoff/current-state.md` to include `V2-0009` and replace the
  next-action list with the recommended sequence.

Verification:

- `git diff --check` passed with a CRLF-to-LF warning for
  `docs/handoff/work-log.md` only.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

## 2026-06-19 - Navigation And Module Route Shell

Plan: `V2-0009` step 1.

Changes:

- Updated `src/components/app-shell.tsx` so sidebar navigation links to real V2
  routes: dashboard, permissions, Picking, Purchasing, Receiving, Warehouse,
  Returns, KPI, and Sign In.
- Updated `src/app/page.tsx` so dashboard module cards link to the registry
  route when present; route-less registry items remain non-clickable.
- Added lightweight module landing pages for `/picking`, `/purchasing`,
  `/receiving`, `/warehouse`, `/returns`, and `/kpi` using
  `src/modules/core/module-landing-page.tsx`.
- Added `src/app/icon.svg` to avoid a favicon 404 during browser checks.

Verification:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed and generated all new module routes.
- HTTP smoke checks against `next start` passed for `/`, `/picking`, and
  `/icon.svg`.
- Browser smoke check with Playwright CLI against
  `http://127.0.0.1:3001/` -> `/picking` passed with no console errors.
- Generated `.playwright-cli/` smoke-test artifacts were removed after
  verification.
- `git diff --check` passed with CRLF-to-LF warnings only.
- No V1 production apps, GAS deployments, Sheets, URLs, or secrets were touched.

## 2026-06-19 - Picking Product Scope And User Flow Gate

Plan: `V2-0010` (`docs/plans/V2-0010-picking-product-scope-and-flow.md`).

Context:

- User asked whether the repo already had a full requirement/scope,
  architecture/data, UI/UX flow, task breakdown, and tooling workflow.
- Review found that V2 already had strong architecture, data, migration,
  task-breakdown, handoff, and verification docs, but Picking did not yet have
  a dedicated MVP/nice-to-have/out-of-scope/user-flow/wireframe/logic gate
  before UI or write-action implementation.

Changes:

- Added `docs/plans/V2-0010-picking-product-scope-and-flow.md` defining the
  Picking problem/users, MVP, nice-to-have items, out-of-scope items, user
  flows, screen notes, system logic, data/integration points, task breakdown,
  verification steps, rollback/no-production-impact note, and open decisions.
- Added ADR `docs/decisions/0005-picking-product-scope-gate-before-ui.md`
  requiring this product scope and user-flow gate before implementing Picking UI
  or server write actions.
- Updated `docs/plans/V2-0009-next-execution-sequence.md` and
  `docs/handoff/current-state.md` so future agents see `V2-0010` as the gate
  before the Picking implementation slice.

Verification:

- `git diff --check` passed with CRLF-to-LF warnings only.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, Supabase
  secrets, or runtime code were changed by this planning gate.

## 2026-06-19 - Central Conductor And Plan Index

Plan: `V2-0011` (`docs/plans/V2-0011-conductor-planning-index.md`).

Context:

- User asked for a central planning file similar to the V1 Conductor so another
  AI agent can inspect the active plan and continue work after context is
  cleared.
- V2 already had individual plan files, `current-state.md`, and `work-log.md`,
  but no root conductor or central plan board.

Changes:

- Added root `CONDUCTOR.md` with read order, plan lifecycle statuses, resume
  protocol, handoff rules, and V1 safety boundaries.
- Added `docs/plans/index.md` as the central active queue and plan board.
- Added `docs/plans/V2-0011-conductor-planning-index.md` to record this
  process change as a plan.
- Added ADR `docs/decisions/0006-central-conductor-and-plan-index.md`.
- Updated `AGENTS.md`, `README.md`, and `docs/handoff/current-state.md` so future
  agents read the conductor and plan index before continuing work.

Verification:

- `git diff --check` passed with CRLF-to-LF warnings only.
- Touched conductor docs have no trailing whitespace.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, Supabase
  secrets, runtime code, or deployment settings were changed by this process
  update.

## 2026-06-19 - Architect Command Format

Plan: `V2-0012` (`docs/plans/V2-0012-architect-command-format.md`).

Context:

- User asked to use `Architect:` instead of `Conductor:` as the command for
  detailed plan drafting.
- User also asked for a detailed reusable format for plans.

Changes:

- Added `docs/plans/templates/architect-plan-template.md` with a detailed plan
  structure covering goal, requirement/scope, MVP, nice-to-have, out-of-scope,
  architecture/data, UI/user flow, system logic, task breakdown, files expected
  to change, verification, rollback/no-production-impact, open questions, and
  handoff notes.
- Added plan `docs/plans/V2-0012-architect-command-format.md`.
- Added ADR `docs/decisions/0007-architect-command-for-plan-drafting.md`.
- Updated `CONDUCTOR.md`, `AGENTS.md`, `README.md`, `docs/plans/index.md`, and
  `docs/handoff/current-state.md` so `Architect:` means plan-only and `Go:` is
  the execution command.

Verification:

- `git diff --check` passed with CRLF-to-LF warnings only.
- Touched Architect command docs have no trailing whitespace.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, Supabase
  secrets, runtime code, deployment settings, or database schema files were
  changed by this process update.

## 2026-06-19 - Focused Architect Plans For Next Execution Slices

Context:

- User asked to draft Architect-style plans for any next work that can be
  planned now.
- Used the Supabase skill because the upcoming plans involve Supabase Auth,
  RLS, server-side credentials, and import workflows.
- Rechecked current official Supabase and Vercel docs before planning:
  - Supabase changelog: April 28, 2026 Data API explicit grant change remains
    relevant to future table/RLS planning.
  - Supabase SSR Auth docs continue to recommend server-side clients and
    validated claims for protected server routes.
  - Supabase RLS and database function docs continue to require RLS on exposed
    tables, explicit grants, restricted function execute privileges, and fixed
    `search_path` for `security definer` functions.
  - Vercel docs confirm environment variables are scoped to Production,
    Preview, and Development, and Deployment Protection scope differs by plan.

Changes:

- Added `docs/plans/V2-0013-local-baseline-closeout.md` for verifying,
  staging, committing, pushing, and deployment-checking the current local
  navigation/conductor/planning baseline before further implementation.
- Added `docs/plans/V2-0014-deployment-boundary-and-staging-access.md` for the
  Production/Preview/Development boundary decision and non-admin staging user
  matrix.
- Added `docs/plans/V2-0015-core-import-dry-run.md` for a validation-first,
  no-write V1 core import dry run.
- Added `docs/plans/V2-0016-server-permission-guard-pattern.md` for a reusable
  server-side guard around `getPermissionSnapshot()` and `can()` before Picking
  routes/actions.
- Updated `docs/plans/index.md` and `docs/handoff/current-state.md` so the
  focused plans appear in the active queue.

Verification:

- `git diff --check` passed with CRLF-to-LF warnings only.
- No V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, Supabase
  secrets, runtime code, deployment settings, or database schema files were
  changed by this planning update.

## 2026-06-19 - Local Baseline Closeout (V2-0013)

Context:

- Executed plan `V2-0013` to close out the current local baseline of navigation, landing pages, decisions, plans, conductor setup, and project initialization guide.

Changes:

- Added `.gitignore` ignore rule for `screenshot/` to keep local artifacts out of Git history.
- Created `project_init_guide.md` in the artifacts folder as a detailed Thai guide for project setup, migrations, and quality checks.
- Updated `docs/plans/index.md` and `docs/plans/V2-0013-local-baseline-closeout.md` status to Complete.
- Updated `docs/handoff/current-state.md` workspace notes and promoted Next Actions.

Verification:

- Ran `npm run lint`, `npm run typecheck`, `npm run check:migrations`, and `npm run build` all successfully.
- Checked `git diff --check`.

