# Plan V2-0043: App Flow Diagrams (Mermaid)

Status: Complete on 2026-06-23

Execution command:

```text
ช่วยทำ Flow ของทุกแอปเบื้องต้นมาให้หน่อยได้มั้ย สำหรับใช้ใน Mermaid live
```

## Goal

Give the user basic, copy-pasteable Mermaid flowcharts for all 8 V2 modules,
ready for `https://mermaid.live`, without implying any of the planned
(not-yet-built) modules are proven behavior.

## Scope

- One Mermaid flowchart per module: Main/Auth, Picking, Purchasing PR,
  Purchasing PO, Receiving GR, Warehouse (TRDAKRA + W5), Returns, KPI.
- Label each diagram with its real implementation status so a reader can tell
  proven flow (Picking, Main/Auth) from planned spec (PR/PO/GR, Warehouse,
  KPI) from generic placeholder (Returns, which has no mockup/plan yet).
- Source flows from existing docs only: `docs/architecture/target-architecture.md`,
  `docs/migration/module-inventory.md`, `docs/migration/migration-plan.md`,
  `docs/plans/V2-0032-frontend-ui-ux-module-roadmap.md`, and the Picking
  work-log history.

## Out Of Scope

- New flow design/decisions not already recorded somewhere in the repo.
- Runtime code, schema, staging data, V1 production files, secrets.
- A real Returns/Returnitem flow spec (none exists yet; diagram is generic).

## Files Changed

- `docs/architecture/app-flow-diagrams.md` (new)
- `docs/plans/V2-0043-app-flow-diagrams.md` (this file)
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification

- `git diff --check`.
- Manual Mermaid syntax check (quoted node labels throughout to avoid
  parenthesis/slash parsing issues; verified shape syntax against Mermaid
  flowchart grammar).

## Rollback / No Production Impact

Documentation-only. Rollback is deleting
`docs/architecture/app-flow-diagrams.md` and this plan file, then reverting
the index/handoff edits. No production impact.

## Handoff Notes

- Found `docs/plans/index.md`, `docs/handoff/current-state.md`, and
  `docs/handoff/work-log.md` had been concurrently modified by another
  session (`V2-0042`, Obsidian docs index) between this session's initial
  `Let's work` read and this edit. Did not revert that work; renumbered this
  plan to `V2-0043` (next free ID) and layered these edits on top.
- An untracked `WEBAPP V2/` directory (Obsidian vault scratch files) exists
  at the repo root; the `V2-0042` session already noted it and left it
  untouched. This plan does not touch it either.
