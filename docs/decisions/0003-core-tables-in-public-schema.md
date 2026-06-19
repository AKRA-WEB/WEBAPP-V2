# ADR 0003: Core Tables Live In `public` Schema (Not A `core` Schema)

Date: 2026-06-18

## Status

Accepted

## Context

`docs/migration/database-strategy.md` proposes logical schemas such as `core`,
`catalog`, `purchasing`, etc., while noting "Exact schema names may change after
Supabase exposure and RLS strategy is finalized."

Supabase / PostgREST exposes only the `public` (and `graphql_public`) schema by
default. Using a custom `core` schema requires adding it to the project's
exposed-schemas setting and managing grants for the `authenticated`/`anon`
roles on a non-default schema. That is project-level configuration we cannot
apply from this repo (no CLI, no project access).

## Decision

Place the Phase 2 core identity/permission tables in the `public` schema. Keep
security-definer helper functions in a dedicated `private` schema that is never
exposed through the API.

Module/domain separation is expressed through table naming and the app registry,
not through Postgres schemas, for now.

## Consequences

- Migrations apply against the default Supabase-exposed schema with no extra
  project configuration.
- Helper functions stay out of any API-exposed schema (`private`), satisfying
  the database-strategy security rules.
- If domain schemas (`core`, `catalog`, ...) are adopted later, tables can be
  moved with `alter table ... set schema`, and the exposed-schemas setting plus
  grants must be updated at that time. This ADR should be superseded then.
