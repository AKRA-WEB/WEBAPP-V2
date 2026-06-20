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

Status: Done

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
- Vercel deployment has run from this repo and has been verified for the current
  V2 shell/admin route baseline.
- Core schema and real permission model continue in Phase 2.

## Phase 2 - Core Identity And Permissions

Status: In progress

Deliverables:

- Supabase schema for profiles, roles, permissions, app registry, audit logs
- RLS policies for exposed tables
- Seed/import plan from V1 `User`, `AppConfig`, `RoleConfig`, `PermConfig`
- Admin read-only permission viewer

Exit criteria:

- Users and permissions can be represented without relying on V1 Main SSO.
- Permission checks work in server-side code.
- No `service_role` key is exposed to the browser.

Current notes:

- Draft migrations `0001`-`0003`, plus grant-hardening correction `0006`, have
  been applied to the staging Supabase project and DB-verified.
- V1 core import mapping is drafted in
  `docs/migration/core-v1-import-mapping.md`.
- End-to-end Supabase Auth and `/admin/permissions` verification has passed
  with staging accounts. A reusable server-side permission guard is implemented.
- Core V1 import dry-run and apply tooling exists; the actual staging core
  import completed on 2026-06-20 for 15 V1 users, 5 roles, and mapped
  role-permission grants.

## Phase 3 - Pilot Module

Status: Started (staging schema applied; shared catalog data imported; Main
portal is operator-facing; Picking read-only list/detail, create requisition,
and status-transition routes/actions are implemented and verified against
staging)

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

Current notes:

- V1 Picking source and conductor plans have been read as reference only.
- Draft migrations `0004`-`0005` define the Picking pilot schema and RLS and
  have been applied to the staging Supabase project.
- V1 Picking mapping is drafted in `docs/migration/picking-v1-mapping.md`.
- No V1 Picking requisition history has been imported. The first V2 Picking
  route slice (`V2-0019`, ADR `0012`) is implemented and verified:
  permission-gated `/picking` list and `/picking/[id]` detail, reading staging
  Supabase data through normal authenticated RLS. The create requisition slice
  (`V2-0020`, ADR `0013`/`0015`) is implemented and verified:
  `/picking/new`, shared-catalog bridge, real Picking product/staff reference
  import, and atomic daily bill-number allocation. The status-transition slice
  (`V2-0023`) is implemented and verified: writer/admin-only
  `pending -> picked -> sent` actions backed by an atomic server-only RPC.
  Current staging requisitions are staging-only fixtures and transient
  app-created test rows, not V1 `Requisition` history. Problem reporting,
  LINE integration/failure recovery, and a Picking cutover package remain.
- Shared catalog/warehouse schema and staging snapshot import are available for
  the Picking catalog bridge and later modules.
- V1 production Picking app, GAS deployment, Sheets, URLs, and LINE tokens were
  not changed.

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
