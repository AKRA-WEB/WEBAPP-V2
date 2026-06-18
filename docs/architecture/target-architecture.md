# Target Architecture

## Summary

AKRA WEBAPP V2 will be one modular web application instead of many standalone
HTML/GAS/GitHub Pages apps. V1 remains live until each module is migrated and
approved for cutover.

## Target Stack

- Frontend and server runtime: Next.js with TypeScript
- Hosting: Vercel
- Database: Supabase Postgres
- Auth: Supabase Auth, with an optional temporary bridge from V1 Main SSO if
  needed during migration
- Authorization: centralized role and permission model backed by Postgres and
  enforced both server-side and with Supabase RLS where appropriate
- Notifications: server-side LINE notification services, not browser-side
  secrets

## Proposed Repo Shape

```text
src/
  app/                  Next.js routes and layouts
  components/           Shared UI components
  lib/
    supabase/           Supabase client/server helpers
  modules/
    auth/               Login, session, profile, permission helpers
    core/               Users, roles, app registry, audit logs
    purchasing/         PR, PO, vendor delivery insight
    receiving/          GR workflows
    warehouse/          TRDAKRA, W1/W2, stock, dispatch
    returns/            Returnitem and claims
    picking/            Picking requisitions and issue reporting
    kpi/                KPI tracking
supabase/
  migrations/           Database migrations
docs/
  architecture/         Architecture notes
  decisions/            Architecture decision records
  handoff/              Agent continuity records
  migration/            Migration plans and inventories
```

## Module Boundary Principles

- A module owns its own workflows and screens.
- Shared entities such as users, roles, products, vendors, warehouses, and audit
  logs live in core/shared modules.
- Cross-module writes should go through server-side services so permissions,
  audit logs, and transaction behavior remain consistent.
- Database transactions should replace client-side or GAS-side race-prone
  counters such as daily bill numbers.

## Server Boundary

Use server-side code for:

- Privileged Supabase access
- LINE notifications
- Data import/export
- Mutation workflows that need transactions or audit logs
- Permission-sensitive operations

Use client-side Supabase access only for low-risk reads/writes that are fully
covered by RLS and do not require secrets.

## Deployment Boundary

Vercel Preview deployments are for testing. Production deployment should remain
protected until a module cutover is approved. V1 production URLs remain the live
entry points until explicit cutover.
