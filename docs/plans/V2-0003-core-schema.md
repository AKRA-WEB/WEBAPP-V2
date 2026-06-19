# Plan V2-0003: Phase 2 Core Identity And Permissions Schema

## Goal

Deliver the Phase 2 core schema (profiles, roles, permissions, app registry,
audit logs) with RLS, so users and permissions can be represented in Supabase
without relying on V1 Main SSO, and permission checks work in server-side code.

## Scope

- Supabase migration SQL for: `profiles`, `roles`, `permissions`,
  `role_permissions`, `user_roles`, `apps`, `audit_logs`.
- `private`-schema `security definer` helpers reproducing the `can()` contract
  in `src/modules/auth/permissions.ts` (`ADMIN` role short-circuits; otherwise
  explicit permission membership).
- `private`-schema auth trigger helper for provisioning `profiles` rows from
  `auth.users`; trigger-only functions are not directly executable by
  `public`, `anon`, or `authenticated`.
- RLS enabled on all tables, read grants to `authenticated`, explicit full table
  grants to `service_role`, and no authenticated write policies on config tables
  (privileged mutations go through server/service role).
- Structural seed: the 13 `AppPermission` keys, the `ADMIN` role, the 8 app
  registry rows mirroring the dashboard.
- Server-side `getPermissionSnapshot()` that builds the `PermissionSnapshot`
  used by `can()`.
- Admin read-only permission viewer page (`/admin/permissions`).

## Out Of Scope

- V1 data import from `User` / `AppConfig` / `RoleConfig` / `PermConfig`. That
  needs the sheet -> table mapping that does not exist yet (tracked in
  `module-inventory.md`). This plan seeds structural rows only.
- Applying/running migrations against a real Supabase project. No CLI, Docker,
  or `.env.local` is available in this workspace.
- Supabase Auth vs Main SSO bridge decision — already settled by the Phase 2
  exit criteria (represent users without V1 SSO -> profiles bind to
  `auth.users`).
- Any V1 production change.

## Files Expected To Change

- `supabase/migrations/0001_core_identity_schema.sql` (new)
- `supabase/migrations/0002_core_rls_policies.sql` (new)
- `supabase/migrations/0003_core_seed.sql` (new)
- `src/modules/auth/get-permission-snapshot.ts` (new)
- `src/app/admin/permissions/page.tsx` (new)
- `docs/decisions/0003-core-tables-in-public-schema.md` (new)
- `docs/handoff/current-state.md`, `docs/handoff/work-log.md`,
  `docs/migration/module-inventory.md` (handoff)

## Verification Steps

- `npm run lint`, `npm run typecheck`, `npm run build` must pass.
- Official Supabase changelog/docs must be checked before schema/RLS edits.
- SQL is reviewed for ordering safety (helpers before policies that call them;
  tables before FKs) since it cannot be executed here.
- `permissions.key` seed values are checked 1:1 against the `AppPermission`
  union so server checks cannot silently return false.
- Local DB apply (`supabase db reset` / `db lint`) is deferred until the CLI and
  local stack exist; noted in handoff.

## Rollback / No-Production-Impact Note

All changes are new repo files plus docs. No V1 repos, GAS deployments, Sheets,
or production URLs are touched. No real Supabase project is connected, so the
migrations have zero runtime effect until intentionally applied.

## Migration Filename Note

`supabase/migrations/README.md` forbids hand-writing timestamped CLI filenames.
These files use ordered `000N_` draft prefixes. When the Supabase CLI / local
stack is available, register them with `supabase migration new <name>` (or
rename to CLI timestamp format) so migration history stays consistent.
