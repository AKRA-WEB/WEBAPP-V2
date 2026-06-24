---
tags:
  - akra-v2
  - decisions
---

# Decision Map

Use [project-management/decision-board.md](project-management/decision-board.md)
for live decision status. This page groups ADRs for Obsidian browsing.

## Operating Model

- [0001 Isolated V2 rewrite](decisions/0001-isolated-v2-rewrite.md)
- [0006 Central conductor and plan index](decisions/0006-central-conductor-and-plan-index.md)
- [0007 Architect command for plan drafting](decisions/0007-architect-command-for-plan-drafting.md)
- [0014 Active work-log and archive policy](decisions/0014-active-work-log-and-archive-policy.md)
- [0017 Project management operating model](decisions/0017-project-management-operating-model.md)
- [0019 Frontend sub-conductor](decisions/0019-frontend-sub-conductor.md)

## Operations And Cutover

- [0025 Operational readiness gate before PR/PO/GR writes](decisions/0025-operational-readiness-gate-before-pr-po-gr-writes.md)

## Security And Data Boundaries

- [0002 Secret handling](decisions/0002-secret-handling.md)
- [0003 Core tables in public schema](decisions/0003-core-tables-in-public-schema.md)
- [0010 Reusable server permission guard pattern](decisions/0010-reusable-server-permission-guard-pattern.md)
- [0015 Public schema service-role RPC for atomic writes](decisions/0015-public-schema-service-role-rpc-for-atomic-writes.md)

## Core And Portal

- [0008 Main portal redesign with V1 behavior](decisions/0008-main-portal-redesign-with-v1-behavior.md)
- [0011 V1 core import identity and permission decisions](decisions/0011-v1-core-import-identity-and-permission-decisions.md)
- [0016 Module-by-module V1 parity sequence](decisions/0016-module-by-module-v1-parity-sequence.md)

## Picking

- [0004 Picking public prefixed tables and secret split](decisions/0004-picking-public-prefixed-tables-and-secret-split.md)
- [0005 Picking product scope gate before UI](decisions/0005-picking-product-scope-gate-before-ui.md)
- [0012 Picking read-only first slice](decisions/0012-picking-read-only-first-slice.md)
- [0013 Picking create before LINE, status, and problem](decisions/0013-picking-create-before-line-status-and-problem.md)
- [0018 Picking problem line and history decisions](decisions/0018-picking-problem-line-and-history-decisions.md)

## Shared Catalog And PR/PO/GR

- [0009 Shared catalog source-scoped products](decisions/0009-shared-catalog-source-scoped-products.md)
- [0020 PR/PO/GR schema and RLS lock](decisions/0020-pr-po-gr-schema-and-rls-lock.md)
- [0021 PR/PO/GR grouped release shape](decisions/0021-pr-po-gr-grouped-release-shape.md)
- [0022 PR-derived PO 3-row linkage](decisions/0022-pr-po-gr-3-row-pr-linkage.md)
- [0023 PR/PO/GR staging import scope](decisions/0023-pr-po-gr-staging-import-scope.md)
- [0024 Master data vocabulary and folder boundaries](decisions/0024-master-data-vocabulary-and-folder-boundaries.md)
- [0026 PR/PO/GR synthesized PO number](decisions/0026-pr-po-gr-synthesized-po-number.md)

## Current Open Decision

ADR `0023` is Accepted; `V2-0044`'s staging import is complete (253 PO/588
GR headers, 0 PR rows). No PR/PO/GR import decision remains open.

Operational readiness sub-decisions under ADR `0025` remain open before
PR/PO/GR writes: production RPO/RTO, backup/PITR posture, monitoring tool,
alert owners, rollback authority, and production/staging data separation.
