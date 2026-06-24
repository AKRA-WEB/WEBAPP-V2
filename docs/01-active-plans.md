---
tags:
  - akra-v2
  - plans
---

# Active Plans Map

Use [plans/index.md](plans/index.md) as the canonical board. This page is an
Obsidian-friendly reading map for the current execution lanes.

## Primary Resume Chain

| Read | Purpose |
| --- | --- |
| [Current state](handoff/current-state.md) | Compact project state and next action |
| [Work log](handoff/work-log.md) | Recent execution details |
| [Plan index](plans/index.md) | Canonical plan status board |
| [Decision board](project-management/decision-board.md) | Current project decisions and recommended next move |

## Active Or Recently Touched Plans

| Plan | Current use |
| --- | --- |
| [V2-0047 PR/PO/GR read-only list/detail UI](plans/V2-0047-pr-po-gr-readonly-ui.md) | Draft: read-only `/purchasing`+`/receiving` list/detail over the imported PO/GR rows, not gated by V2-0046; awaiting `Go:` |
| [V2-0040 PR/PO/GR PR CSV reconciliation](plans/V2-0040-pr-po-gr-pr-csv-reconciliation.md) | Current PR/PO/GR data-proof review; empty PR source confirmed, 3 PR-derived PO rows need import posture decision |
| [V2-0044 PR/PO/GR staging import slice](plans/V2-0044-pr-po-gr-staging-import-slice.md) | Complete: 253 PO/588 GR headers imported to staging, 16/16 checks pass |
| [V2-0046 Operational readiness before PR/PO/GR writes](plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md) | Draft operations gate for Environment Matrix, Monitoring, Backup/DR, and Rollback before PR/PO/GR write workflow |
| [V2-0045 Schema/master/folder hardening](plans/V2-0045-schema-master-folder-hardening.md) | Complete documentation and folder-boundary hardening |
| [V2-0036 PR/PO/GR foundation](plans/V2-0036-pr-po-gr-foundation.md) | Applied staging schema/RLS foundation for purchasing and receiving |
| [V2-0039 PR/PO/GR release shape](plans/V2-0039-pr-po-gr-release-shape-decision.md) | Accepted grouped PR/PO/GR operational cutover gate |
| [V2-0034 Picking cutover package](plans/V2-0034-picking-cutover-package.md) | Prepared but not approved; user/business gates remain |
| [V2-0041 Placeholder route guard pass](plans/V2-0041-placeholder-route-guard-pass.md) | Complete guard pass for non-Picking placeholders |
| [V2-0042 Obsidian docs index](plans/V2-0042-obsidian-docs-index.md) | Obsidian navigation setup for repo docs |

## Frontend And Mock-Up Plans

| Plan | Artifact |
| --- | --- |
| [V2-0032 Frontend UI/UX module roadmap](plans/V2-0032-frontend-ui-ux-module-roadmap.md) | Module-by-module frontend roadmap |
| [V2-0033 PO frontend mockup](plans/V2-0033-po-frontend-mockup.md) | [PO mockup](mockups/po-ui-ux-mockup.html) |
| [V2-0035 GR frontend mockup](plans/V2-0035-gr-frontend-mockup.md) | [GR mockup](mockups/gr-ui-ux-mockup.html) |
| [V2-0037 PR frontend mockup](plans/V2-0037-pr-frontend-mockup.md) | [PR mockup](mockups/pr-ui-ux-mockup.html) |
| [V2-0038 KPI frontend mockup](plans/V2-0038-kpi-frontend-mockup.md) | [KPI mockup](mockups/kpi-ui-ux-mockup.html) |

## Next Decision

`V2-0047` (read-only PR/PO/GR UI) is drafted and awaiting `Go:` — it does not
need to wait for `V2-0046`. Before PR/PO/GR **write** workflow starts,
separately execute `V2-0046` readiness docs and resolve its open
sub-decisions: production RPO/RTO, backup/PITR posture, monitoring tool,
alert owners, rollback authority, and production/staging data separation.
