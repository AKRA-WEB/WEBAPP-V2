---
tags:
  - akra-v2
  - migration
---

# Migration Map

This page links migration docs by module and workflow. Use
[migration/migration-plan.md](migration/migration-plan.md) and
[migration/module-inventory.md](migration/module-inventory.md) as the canonical
phase and module references.

## Architecture And Strategy

- [Target architecture](architecture/target-architecture.md)
- [Migration plan](migration/migration-plan.md)
- [Module inventory](migration/module-inventory.md)
- [Database strategy](migration/database-strategy.md)
- [Supabase staging migration runbook](runbooks/supabase-staging-migration.md)
- [Database/data-flow HTML](database/data-flow.html)

## Core And Shared Data

- [Core V1 import mapping](migration/core-v1-import-mapping.md)
- [Product catalog V1 mapping](migration/product-catalog-v1-mapping.md)
- [V2-0018 shared catalog plan](plans/V2-0018-shared-catalog-warehouse-data-structure.md)

## Picking

- [Picking V1 mapping](migration/picking-v1-mapping.md)
- [Picking cutover package](migration/picking-cutover-package.md)
- [Cutover checklist template](migration/cutover-checklist.md)
- [V2-0034 Picking cutover package plan](plans/V2-0034-picking-cutover-package.md)

## PR/PO/GR

- [PR/PO/GR V1 mapping](migration/pr-po-gr-v1-mapping.md)
- [V2-0036 PR/PO/GR foundation](plans/V2-0036-pr-po-gr-foundation.md)
- [V2-0039 PR/PO/GR release shape](plans/V2-0039-pr-po-gr-release-shape-decision.md)
- [V2-0040 PR/PO/GR PR CSV reconciliation](plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md)
- [ADR 0020 PR/PO/GR schema and RLS lock](decisions/0020-pr-po-gr-schema-and-rls-lock.md)
- [ADR 0021 PR/PO/GR grouped release shape](decisions/0021-pr-po-gr-grouped-release-shape.md)

## Frontend References

- [Frontend UI/UX operating model](frontend/ui-ux-operating-model.md)
- [V2 UI/UX mockup](mockups/v2-ui-ux-mockup.html)
- [PO mockup](mockups/po-ui-ux-mockup.html)
- [GR mockup](mockups/gr-ui-ux-mockup.html)
- [PR mockup](mockups/pr-ui-ux-mockup.html)
- [KPI mockup](mockups/kpi-ui-ux-mockup.html)
