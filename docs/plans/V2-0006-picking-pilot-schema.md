# Plan V2-0006: Picking Pilot Schema And Mapping

## Goal

Draft the Phase 3 Picking pilot data model and V1 mapping so the module can
move from Google Sheets/GAS toward Supabase/Postgres without touching live V1
production data.

## Scope

- Map V1 Picking sheets and actions into V2 tables.
- Add draft Supabase migrations for requisitions, lines, staff/products,
  problem reports, events, daily bill sequence, and server-only token/contact
  storage.
- Add RLS policies and explicit grants consistent with Phase 2 permissions.
- Keep mutation workflows server-side/service-role only for now.

## Out Of Scope

- Applying migrations to a database.
- Exporting or importing production V1 sheet data.
- Implementing the V2 Picking UI.
- Sending LINE notifications from V2.
- Changing V1 Picking app, GAS deployments, Sheets, URLs, or tokens.

## Files Expected To Change

- `supabase/migrations/0004_picking_pilot_schema.sql`
- `supabase/migrations/0005_picking_rls_policies.sql`
- `docs/migration/picking-v1-mapping.md`
- `docs/decisions/0004-picking-public-prefixed-tables-and-secret-split.md`
- `docs/migration/module-inventory.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- Check current official Supabase changelog/docs before schema/RLS edits.
- Verify V1 field names against `C:\dev\WEBAPP\Picking` read-only source.
- Run `npm run lint`, `npm run typecheck`, `npm run build`.
- Run `git diff --check` and manually check untracked SQL/doc files for
  trailing whitespace.

## Rollback / No-Production-Impact Note

This plan adds draft V2 files only. The SQL is not applied to any database, and
no V1 production apps, GAS deployments, Sheets, URLs, or secrets are touched.
