# Module Inventory

This file tracks V1 modules, their production dependencies, and recommended V2
migration order.

## Summary Table

| Module | V1 State | V1 Data Source | V1 Backend | V2 Target Module | Migration Priority |
| --- | --- | --- | --- | --- | --- |
| Main / SSO | Live | Google Sheets | GAS | `auth`, `core` | Foundation |
| Picking | Live, backend deploy pending in V1 | Google Sheets | GAS | `picking` | Pilot |
| PR | Live | Google Sheets | Shared purchasing GAS | `purchasing` | After core |
| PO | Live | Google Sheets | Shared purchasing GAS | `purchasing` | With PR/GR |
| GR | Live | Google Sheets | GR GAS | `receiving` | With PO |
| TRDAKRA | Live | Google Sheets | GAS | `warehouse` | Later |
| Returnitem | Live | Google Sheets | GAS | `returns` | Later |
| AKRA W5 | Live | Google Sheets | GAS | `warehouse` | Later |
| KPITracker | Live | Google Sheets | GAS | `kpi` | After data stabilizes |

## Current Recommended Order

1. Core auth and permissions
2. Picking pilot
3. PR/PO/GR as a grouped migration
4. Warehouse modules
5. Returns
6. KPI and analytics

## Inventory Fields To Fill Per Module

For each module, capture:

- V1 repo path
- V1 deployed URL
- GAS deployment URL
- Sheets/tabs used
- Read actions
- Write actions
- Permission keys
- Status values
- LINE notification paths
- Known legacy data quirks
- V2 table mapping
- Migration test cases
- Cutover checklist status

## Notes From V1 Context

- V1 uses Google Sheets as the primary database and GAS as backend.
- `Code.gs` / `Code.gs.txt` files are git-ignored in V1 to avoid leaking
  secrets.
- V1 apps have client-side version guards and module-specific versions.
- PO/PR/GR have recent work around stable Direct PO bill grouping.
- Picking has recent local backend changes around daily bill numbers that still
  need V1 GAS deployment verification.
