---
tags:
  - akra-v2
  - dashboard
---

# AKRA WEBAPP V2 Dashboard

Open `C:\dev\AKRA-WEBAPP-V2\docs` as an Obsidian vault for the cleanest note
graph. This page is a navigation layer only; the source of truth remains the
plan board, current-state handoff, and decision board.

## Resume First

- [Current state](handoff/current-state.md)
- [Recent work log](handoff/work-log.md)
- [Plan board](plans/index.md)
- [Decision board](project-management/decision-board.md)
- [Operating model](project-management/operating-model.md)

## Current Work

- [V2-0047 PR/PO/GR read-only list/detail UI](plans/V2-0047-pr-po-gr-readonly-ui.md)
- [V2-0046 Operational readiness before PR/PO/GR writes](plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md)
- [V2-0044 PR/PO/GR staging import slice](plans/V2-0044-pr-po-gr-staging-import-slice.md)
- [V2-0045 Schema/master/folder hardening](plans/V2-0045-schema-master-folder-hardening.md)
- [V2-0040 PR/PO/GR PR CSV reconciliation](plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md)
- [V2-0036 PR/PO/GR foundation](plans/V2-0036-pr-po-gr-foundation.md)
- [V2-0039 PR/PO/GR release shape](plans/V2-0039-pr-po-gr-release-shape-decision.md)
- [V2-0034 Picking cutover package](plans/V2-0034-picking-cutover-package.md)
- [V2-0041 Placeholder route guard pass](plans/V2-0041-placeholder-route-guard-pass.md)

## Obsidian Maps

- [Active plans map](01-active-plans.md)
- [Decision map](02-decisions.md)
- [Migration map](03-migration-map.md)

## Management And Review

- [Thai executive summary](project-management/executive-summary-th.md)
- [Frontend UI/UX operating model](frontend/ui-ux-operating-model.md)
- [Schema catalog](database/schema-catalog.md)
- [Master data vocabulary](migration/master-data-vocabulary.md)
- [Database/data-flow HTML](database/data-flow.html)

## Working Notes

- V2 work stays isolated from V1 production unless a cutover task is explicitly
  approved.
- `docs/handoff/work-log.md` intentionally keeps only recent entries; older
  entries live under [handoff/archive](handoff/archive/).
- `import-data/` and `import-reports/` are local artifacts and are ignored by
  git.
