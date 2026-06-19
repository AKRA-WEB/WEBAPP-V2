# Supabase Staging Migration Runbook

Use this runbook when applying or verifying V2 Supabase migrations against a
staging project.

## Goal

Apply V2 database migrations safely to staging, verify RLS/grants from the real
database state, and leave enough handoff evidence for the next agent.

## Scope

- Staging Supabase project only.
- SQL files under `supabase/migrations/`.
- Repository verification and handoff updates.

## Out Of Scope

- Production Supabase projects.
- V1 Google Apps Script deployments, Google Sheets schemas, GitHub Pages URLs,
  and LINE tokens.
- Real V1 data imports unless a separate import plan is active.

## Prerequisites

- Current Supabase docs/changelog checked for RLS, explicit grants, and function
  security guidance.
- `.env.local` has only safe local/runtime values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY` only if it is a rotated server-only staging key.
- A staging Postgres connection string is available for the current shell only.
  Do not commit it, paste it into docs, or store it in tracked files.
- `npm install` has been run.

## Correct Workflow

1. Confirm repo context:

   ```powershell
   git status --short
   npm run check:migrations
   ```

2. Confirm the staging REST endpoint resolves without exposing secrets:

   ```powershell
   # Expect HTTP 401 if no API key is supplied.
   Invoke-WebRequest -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/rest/v1/" -UseBasicParsing
   ```

3. Set `DATABASE_URL` only in the current shell/process:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
   ```

4. Apply all pending draft migrations in lexical order:

   ```powershell
   npm run db:apply-migrations
   ```

   To apply a single corrective file to an already-applied staging database:

   ```powershell
   npm run db:apply-migrations -- 0006_core_grant_hardening.sql
   ```

5. Verify the real database state:

   ```powershell
   npm run db:verify-staging-schema
   ```

6. Clear the connection string from the shell:

   ```powershell
   Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
   ```

7. Run repository checks:

   ```powershell
   npm run check:migrations
   npm run lint
   npm run typecheck
   npm run build
   git diff --check
   npm audit --audit-level=moderate
   ```

8. Update handoff files:

   - `docs/handoff/current-state.md`
   - `docs/handoff/work-log.md`
   - any relevant migration strategy, module inventory, plan, or decision file.

## Required Verification Targets

The database verification should confirm:

- all expected public tables exist;
- RLS is enabled on all expected public tables;
- `anon` has no table grants;
- `authenticated` has no grants on server-only tables;
- `service_role` has intended table grants;
- non-server-only exposed tables have RLS policies;
- structural seed counts match expectations;
- private helper functions exist in the `private` schema.

## Error Handling Notes

### Broad Default Grants

Observed on 2026-06-19:

- Initial `0001`-`0005` apply succeeded.
- DB verification found broad default grants on core tables: `anon` and
  `authenticated` retained full table privileges.
- Root cause: `0002_core_rls_policies.sql` granted intended access but did not
  first revoke project default or legacy broad grants on core tables.
- Fix:
  - Add explicit `revoke all ... from public, anon, authenticated` before
    intended grants in the migration.
  - Add a corrective migration for staging databases that were already applied.
  - Extend static migration checks so every public table must be covered by an
    explicit revoke block.

### Server-Only Tables Without Authenticated Policies

Some server-only public tables intentionally have RLS enabled with no
authenticated policies:

- `picking_daily_sequences`
- `picking_requisition_secrets`
- `picking_staff_line_accounts`

The correct check is not "every table must have an authenticated policy"; it is
"every client-readable table must have a policy, and server-only tables must
have no authenticated grants."

## Secret Handling

- Never commit `DATABASE_URL`, DB passwords, service role keys, LINE tokens, or
  capability tokens.
- Never put service role keys in `NEXT_PUBLIC_*` variables.
- If a DB password or service role key is shared in chat, rotate it before
  production or long-lived staging use.

## Current Staging Baseline

As of 2026-06-19:

- `0001`-`0005` applied successfully.
- `0006_core_grant_hardening.sql` applied successfully.
- `npm run db:verify-staging-schema` passed with 17 public tables and 15
  policies.
- No V1 production systems were changed.
