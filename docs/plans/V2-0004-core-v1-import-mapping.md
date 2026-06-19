# Plan V2-0004: Core V1 Import Mapping

## Goal

Define how V1 `User`, `AppConfig`, `RoleConfig`, and `PermConfig` sheet data
will map into the V2 core identity and permission tables before any real data
import runs.

## Scope

- Document source sheet columns and target V2 tables.
- Define normalization rules for legacy user IDs, display names, roles, app
  access, and permission grants.
- List validation checks that must pass before loading staging data.
- Keep the import plan compatible with Supabase Auth and the Phase 2 core
  schema.

## Out Of Scope

- Exporting production Google Sheets.
- Creating Supabase Auth users.
- Applying migrations to a Supabase project.
- Importing passwords or V1 secrets.
- Any V1 production app, GAS, Sheet, or URL change.

## Files Expected To Change

- `docs/migration/core-v1-import-mapping.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- Confirm the mapping uses only V1 behavior documented in
  `C:\dev\WEBAPP\development_context.md`.
- Confirm no secret values or live tokens are copied into V2 docs.
- Run `git diff --check`.
- Re-run app checks if app or schema files change in the same session.

## Rollback / No-Production-Impact Note

This is documentation-only import planning. It does not read, export, modify, or
write any production V1 data.
