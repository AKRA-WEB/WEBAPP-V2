# Plan V2-0007: Supabase Migration Preflight Checks

## Goal

Add repeatable repository-side checks for the draft Supabase migrations while
local/staging database apply is blocked by missing Supabase CLI, Docker, and
environment configuration.

## Scope

- Add an npm script that statically checks migration safety assumptions:
  public tables have RLS enabled, service-role grants cover every public table,
  `anon` is not granted access, server-only Picking tables are not granted to
  authenticated users, private `security definer` functions stay in the
  `private` schema with fixed `search_path`, permission seeds match the
  TypeScript permission union, and app-registry seed keys match the dashboard
  fallback.
- Re-run the existing app checks after adding the preflight.
- Re-check current official Supabase docs/changelog before touching the
  Supabase workstream.

## Out Of Scope

- Installing Supabase CLI or Docker.
- Applying migrations to local or staging Supabase.
- Importing V1 data.
- Implementing V2 Picking routes/actions.
- Changing V1 apps, GAS deployments, Sheets, URLs, or tokens.

## Files Expected To Change

- `scripts/check-migrations.mjs`
- `package.json`
- `docs/plans/V2-0007-supabase-migration-preflight.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- `npm run check:migrations`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

## Rollback / No-Production-Impact Note

This is local/static verification only. It does not connect to Supabase, does
not apply SQL, and does not touch V1 production systems.
