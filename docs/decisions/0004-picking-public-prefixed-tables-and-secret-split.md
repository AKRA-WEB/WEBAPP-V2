# ADR 0004: Picking Uses Public Prefixed Tables With Server-Only Secret Tables

Date: 2026-06-18

## Status

Accepted

## Context

ADR 0003 keeps Phase 2 core tables in `public` because this repo cannot manage
Supabase exposed-schema project settings yet. The Picking pilot needs module
tables before any custom schema exposure has been configured.

V1 Picking stores operational rows, bill tokens, LINE quote tokens, and staff
LINE IDs together in Google Sheets / Apps Script. In V2, some of that data can
be read by authenticated users with Picking permissions, but capability tokens
and LINE contact identifiers should remain server-only.

## Decision

Use `public.picking_*` table names for the Picking pilot while V2 remains on the
default Supabase exposed schema. Split sensitive server-only data into separate
tables:

- `picking_requisition_secrets` for problem/action token hashes and LINE quote
  tokens.
- `picking_staff_line_accounts` for staff LINE user IDs.
- `picking_daily_sequences` for bill-number counters.

Authenticated users may receive RLS-filtered `select` access only to operational
tables. Mutations and secret/contact reads stay server-side through the service
role.

## Consequences

- The draft schema can run without custom exposed-schema configuration.
- RLS and explicit grants still protect public-schema tables.
- Server-only token/contact data is not exposed through normal authenticated
  reads.
- If domain schemas are introduced later, the `picking_*` tables can move
  together after project-level exposed-schema settings and grants are updated.
