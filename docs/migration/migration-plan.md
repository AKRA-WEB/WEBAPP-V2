# Migration Plan

Plan ID: `V2-0001`

## Goal

Move the AKRA WEBAPP ecosystem from separate HTML/GAS/Google Sheets apps into a
single modular Next.js application backed by Supabase/Postgres and deployed on
Vercel.

## Non-Goals

- No big-bang migration.
- No immediate change to V1 production URLs.
- No production Sheet schema changes during planning.
- No reuse of V1 secrets in repo files.

## Phase 0 - Planning Baseline

Status: Done

Deliverables:

- Handoff docs
- Target architecture
- Module inventory
- Database strategy
- Cutover checklist

Exit criteria:

- Repo has a clear read-first structure.
- Any future agent can continue without chat history.
- No production impact.

## Phase 1 - App Shell

Status: In progress

Deliverables:

- Next.js TypeScript scaffold
- Shared app layout
- Login/session shell
- Permission guard stubs
- Vercel preview deployment
- Supabase local/staging connection placeholders

Exit criteria:

- App boots locally.
- Preview deployment works.
- No production data connected by default.

Current notes:

- Next.js scaffold exists and builds.
- Supabase helpers exist but real env values are not committed.
- Vercel deployment has not been run from this repo yet.
- Core schema and real permission model are still Phase 2.

## Phase 2 - Core Identity And Permissions

Deliverables:

- Supabase schema for profiles, roles, permissions, app registry, audit logs
- RLS policies for exposed tables
- Seed/import plan from V1 `User`, `AppConfig`, `RoleConfig`, `PermConfig`
- Admin read-only permission viewer

Exit criteria:

- Users and permissions can be represented without relying on V1 Main SSO.
- Permission checks work in server-side code.
- No `service_role` key is exposed to the browser.

## Phase 3 - Pilot Module

Recommended pilot: `Picking`

Why:

- Clear module boundary.
- Useful but smaller than PO/GR/TRDAKRA.
- Exercises auth, permissions, daily bill numbering, LINE notifications, and
  mobile UI.

Exit criteria:

- Staging data imported.
- V2 pilot can run without writing to V1 production Sheets.
- Behavior is verified against V1 expectations.
- Cutover checklist is completed and approved before production switch.

## Phase 4 - Purchasing And Receiving

Modules:

- PR
- PO
- GR

Reason to migrate together:

- Shared purchasing GAS backend in V1.
- Direct PO grouping, GR receiving, 2-way matching, expected date, and vendor
  lead-time logic are tightly linked.

Exit criteria:

- PR/PO/GR data model supports stable bill identity.
- Legacy `DIRECT` and UID fallback behavior is mapped.
- Vendor delivery insights are reproduced.
- GR receiving state transitions are transaction-safe.

## Phase 5 - Warehouse And Returns

Modules:

- TRDAKRA
- AKRA W5
- Returnitem

Exit criteria:

- Product/location/par metadata is normalized.
- Stock movement, dispatch, return, claim, and audit workflows are covered.
- Notification and daily summary jobs are server-side.

## Phase 6 - KPI And Analytics

Deliverables:

- KPI module
- Cross-module reporting tables/views
- Analytics dashboards

Exit criteria:

- Reports use V2 database as source of truth.
- Views are secured with RLS-aware or non-exposed patterns.

## Cutover Rule

Each module must have its own cutover decision. Do not redirect users or disable
V1 writes until the module-specific checklist is complete and the user approves.
