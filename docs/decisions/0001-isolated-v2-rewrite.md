# ADR 0001: Isolated V2 Rewrite

Date: 2026-06-18

## Status

Accepted

## Context

The existing AKRA WEBAPP ecosystem grew from separate HTML pages, Google Apps
Script backends, Google Sheets databases, and separate GitHub deployments. The
apps are live and operational, so a direct rewrite inside V1 would create high
production risk.

## Decision

Create a separate V2 repository and keep all rewrite work isolated from V1
production systems.

V2 will target:

- Next.js + TypeScript
- Vercel
- Supabase/Postgres
- Incremental module migration

## Consequences

- V1 remains stable while V2 is developed.
- Migration can be tested with staging data before cutover.
- Agents must maintain strong handoff documents because this will be long-running
  work.
- Some logic must be temporarily duplicated or translated from V1 until each
  module is cut over.
