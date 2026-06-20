# ADR 0015: Atomic Service-Role Write Transactions Use `public`-Schema RPC Functions, Not `private`

Date: 2026-06-20

## Status

Accepted

## Context

`V2-0020` needed one atomic transaction for creating a Picking requisition:
allocate a daily bill number via `private.next_picking_bill_no(date)`, insert
the requisition, insert N lines, and insert a `created` event, all-or-nothing.

The existing pattern for sensitive functions (`private.next_picking_bill_no`,
`private.has_permission`, `private.is_admin`) is `SECURITY DEFINER` functions
in the `private` schema, called only from inside RLS policy SQL or from other
SQL run by a direct Postgres connection — never through the Supabase Data API.

While implementing the new atomic create function, calling it via
`supabase.rpc()` (the only write path available from a deployed Next.js server
action, since `DATABASE_URL`/`pg` is local-script-only and is not configured
in Vercel Preview/Development) was verified empirically against staging:

- `admin.rpc("next_picking_bill_no", ...)` (default `public` schema search):
  `PGRST202`, function not found in `public` — confirms unqualified RPC calls
  resolve against `public` only.
- `admin.rpc("next_picking_bill_no", ...)` with `db: { schema: "private" }`:
  `PGRST106`, `"Only the following schemas are exposed: public, graphql_public"`.

So `private` is not reachable through the Data API at all in this Supabase
project, by design — exactly what keeps `private.*` functions safe today. A
new function meant to be called from app server code over `supabase.rpc()`
cannot live in `private`.

## Decision

- `public.create_picking_requisition(...)` (migration `0009`) is declared in
  `public`, without `SECURITY DEFINER` (default `SECURITY INVOKER`), with
  `EXECUTE` revoked from `public`/`anon`/`authenticated` and granted only to
  `service_role`.
- It is only ever invoked through `createAdminClient()`
  (`src/lib/supabase/admin.ts`, service-role key, server-only) after
  `requirePermission()` has already allowed the request. Because it is
  `SECURITY INVOKER`, it runs with `service_role`'s own privileges
  (`BYPASSRLS`, plus the `INSERT`/`UPDATE`/`DELETE` grants from migration
  `0005`) and `service_role`'s own `EXECUTE` grant on
  `private.next_picking_bill_no(date)` — no privilege escalation is needed or
  used.
- `private.next_picking_bill_no(date)` itself is unchanged: still `private`,
  still unreachable via the Data API, still callable only from SQL running as
  a role that already has `EXECUTE` on it (`service_role`, or a direct
  Postgres connection).
- `scripts/verify-staging-schema.mjs` asserts `public.create_picking_requisition`
  exists, is not `SECURITY DEFINER`, and that its `EXECUTE` grantees exclude
  `anon`/`authenticated` and include `service_role`.

## Consequences

- Future atomic multi-table write transactions that must be callable from a
  deployed server action follow this same shape: `public` schema, default
  `SECURITY INVOKER`, `EXECUTE` revoked from `anon`/`authenticated`, granted
  only to `service_role`. Do not put a new Data-API-reachable function in
  `private` — it will fail with `PGRST106` the first time it is actually
  called from app code, not at migration-apply time.
- `private` remains reserved for helpers only ever called from inside other
  SQL (RLS policies, triggers, or other functions) or from a direct Postgres
  connection (`DATABASE_URL`/`pg`, local scripts only) — never from
  `supabase.rpc()`.
- `docs/migration/database-strategy.md` records this exposure boundary so
  future agents do not need to re-discover it empirically.
