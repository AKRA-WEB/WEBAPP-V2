# ADR 0016: Module-By-Module V1 Parity Sequence

Date: 2026-06-20

## Status

Proposed

## Context

V2 now has a working foundation: Next.js app shell, Supabase staging schema,
core auth/permissions, real V1 core identity import, shared catalog/warehouse
baseline, and the first two Picking UI/write slices.

The remaining migration work spans every live V1 app: Main, Picking, PR, PO,
GR, TRDAKRA, AKRA W5, Returnitem, and KPITracker. Each app has production
Google Sheets/GAS behavior that must stay live until module-specific V2 cutover
approval.

## Decision

Execute V1 parity as dependency-ordered module waves:

1. Main/Core portal and shared operator UX.
2. Picking pilot closeout.
3. PR/PO/GR purchasing and receiving group.
4. TRDAKRA and AKRA W5 warehouse group.
5. Returnitem.
6. KPITracker and analytics.
7. full-system hardening, UAT, and cutover.

Do not attempt a big-bang replacement. Each module keeps its own staging import,
verification, cutover, and rollback gate.

## Consequences

- V2 can become useful module by module while V1 remains safe as production.
- Shared dependencies such as users, permissions, catalog, vendors, warehouses,
  and products are built before modules that depend on them.
- PR/PO/GR stay grouped because their V1 behavior and data are tightly coupled.
- Warehouse modules stay grouped around shared stock/location/product movement
  concepts, while still allowing TRDAKRA and W5 submodule cutovers if needed.
- KPI/reporting comes after operational tables are stable enough to report on.

## Related

- Plan: `docs/plans/V2-0022-full-v1-parity-timeline.md`
- Migration plan: `docs/migration/migration-plan.md`
- Module inventory: `docs/migration/module-inventory.md`
- Main portal ADR: `docs/decisions/0008-main-portal-redesign-with-v1-behavior.md`
