# Plan V2-0008: Staging Supabase Migration Apply

Status: Applied to staging on 2026-06-19

## Goal

Apply the draft Supabase migrations `0001`-`0005` to the staging Supabase
project and verify the baseline schema is usable without touching V1 production
systems.

## Scope

- Use the staging Postgres connection supplied by the user for this session.
- Apply migration files in lexical order from `supabase/migrations`.
- Apply corrective grant hardening if database verification finds broader
  Supabase project defaults than the draft migrations intended.
- Verify expected public/private database objects after apply.
- Re-run repository checks after any supporting script or documentation changes.
- Record the final state in handoff documents.

## Out Of Scope

- Applying migrations to production.
- Importing real V1 data.
- Creating or rotating Supabase keys.
- Implementing Picking routes/actions.
- Changing V1 apps, Google Apps Script deployments, Sheets, URLs, or tokens.

## Files Expected To Change

- `docs/plans/V2-0008-staging-migration-apply.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

Supporting local scripts may be used without storing credentials in the repo.

## Verification Steps

- Current Supabase docs/changelog check before database changes.
- Staging endpoint reachability check.
- Apply migrations in order (`0001`-`0006`).
- Post-apply schema sanity query against staging.
- `npm run check:migrations`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

## Rollback / No-Production-Impact Note

This targets the staging Supabase project only. V1 production apps, Google Apps
Script deployments, Sheets, GitHub Pages deployments, live URLs, and LINE tokens
must not be modified. If apply fails, stop and inspect the error before retrying;
do not hand-edit production data.
