# `src/modules`

Domain modules live here. Route files under `src/app/**` should stay thin and
delegate workflow reads, server actions, validation, formatting, and reference
data to the matching module folder.

## Current Module Status

| Module | Status |
| --- | --- |
| `auth` | Implemented permission/session helpers and route guards. |
| `core` | Implemented app registry and shared placeholder landing page. |
| `picking` | Implemented read/create/status/problem/LINE-retry workflow slices. |
| `purchasing` | Implemented read-only PO list/detail slice (`V2-0047`); no write actions yet. |
| `receiving` | Implemented read-only GR list/detail slice (`V2-0047`); no write actions yet. |
| `warehouse` | README boundary only; shared warehouse baseline exists, no runtime workflow yet. |
| `returns` | README boundary only; no runtime workflow yet. |
| `kpi` | README boundary only; mock-up exists, no runtime workflow yet. |

## Boundary Rules

- Shared infrastructure belongs in `src/lib/`.
- Shared UI belongs in `src/components/`.
- Cross-module data model decisions belong in `docs/migration/` and ADRs
  before runtime code depends on them.
- Do not duplicate shared product/vendor/warehouse logic inside domain modules;
  use the shared catalog/warehouse model.
- Keep module-specific implementation small and reviewable:
  `read-model.ts`, `format.ts`, `reference-data.ts`, form components, and
  server actions only when the plan authorizes them.
