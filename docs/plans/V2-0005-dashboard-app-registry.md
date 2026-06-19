# Plan V2-0005: Dashboard App Registry Source

## Goal

Wire the dashboard module cards to the V2 `apps` registry when Supabase is
configured, while preserving the current static dashboard when the database or
session is not available.

## Scope

- Add a server-side app-registry helper with a static fallback matching
  migration `0003_core_seed.sql`.
- Update `/` to render modules from the helper instead of a page-local array.
- Keep the page usable without `.env.local` and without a signed-in user.

## Out Of Scope

- Applying Supabase migrations.
- Changing RLS policies.
- Importing production V1 data.
- Changing V1 production apps, GAS deployments, Sheets, URLs, or secrets.

## Files Expected To Change

- `src/modules/core/app-registry.ts`
- `src/app/page.tsx`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- Check official Supabase changelog/docs before implementing.
- Run `npm run lint`, `npm run typecheck`, `npm run build`.
- Run `git diff --check`.

## Rollback / No-Production-Impact Note

This only changes V2 dashboard rendering and adds a database-backed read path
that safely falls back to static data. It has no V1 production impact.
