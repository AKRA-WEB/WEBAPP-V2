# Plan V2-0024: Project Management Operating Model

Status: Complete on 2026-06-20

User request:

```text
ตรวจดูเรื่องไฟล์ต่าง ๆ ทุก AI Agents ตรงกันไหม เรื่องการ handoff ดูในเรื่องการบริหาร Context ด้วย ทำยังไงให่้ประหยัด แต่ห้ามเสียงาน

โอเค ช่วยจัดการวางแผน จัดระเบียบ และบริหารโปรเจ็คนี้ให้หน่อยนะ เป้าหมายโปรเจคเรามีแล้ว ตอนนี้ผมจะให้คุณมาบริหารโปรเจคนี้ อะไรที่คิดว่าดีแล้วต้องทำ เสนอมาได้เลย ผมจะพิจารณาแล้ว คอยช่วยเช็ค
```

## 1. Goal

- Primary objective: make the project manageable across AI agents without
  losing handoff continuity or wasting context.
- Success definition: read orders, handoff rules, active logs, status docs, and
  project-management docs all point to the same current status and next action.
- User/business reason: V2 is now a multi-week migration project; it needs a
  lightweight management layer so the user can review decisions while agents
  keep implementation moving safely.

## 2. Requirement And Scope Definition

### Problem

- Some docs drifted after rapid progress: Main portal and Picking status
  transitions were complete, while some migration/status docs still described
  older read-only/create-only state.
- The active work log had again grown large enough to cost unnecessary context.
- Agent-specific guidance existed (`AGENTS.md`, `CONDUCTOR.md`, `CLAUDE.md`),
  but context-budget guidance needed to be explicit and consistent.

### Scope

- Sync high-level status docs and agent guidance.
- Archive older active work-log entries without deleting them.
- Add a project-management operating model and decision board.
- Record the management decision in an ADR.

### Out Of Scope

- Runtime code changes.
- Supabase schema changes.
- Staging data writes.
- V1 production changes.
- Solving the next Picking problem-reporting slice in this plan.

## 3. System Architecture And Data Design

No runtime architecture changes.

Documentation source-of-truth hierarchy:

1. `docs/plans/index.md`
2. `docs/handoff/current-state.md`
3. `docs/project-management/decision-board.md`
4. `docs/project-management/operating-model.md`
5. active recent `docs/handoff/work-log.md`
6. active plan files
7. archives only when needed

## 4. UI/UX And User Flow

No app UI changes.

Project-management flow:

1. Agent reads compact status docs.
2. Agent checks the decision board for recommended next action.
3. Agent executes the smallest approved/selected slice.
4. Agent updates source-of-truth docs and archives old log entries when needed.
5. User sees concise recommendations and decisions instead of raw logs.

## 5. Task Breakdown

1. Audit `AGENTS.md`, `README.md`, `CONDUCTOR.md`, `CLAUDE.md`, plan index,
   current state, work log, migration plan, and module inventory.
2. Add context-budget rules consistently.
3. Archive older active log entries into
   `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`.
4. Add `docs/project-management/operating-model.md`.
5. Add `docs/project-management/decision-board.md`.
6. Sync stale migration/status docs to the current `V2-0017`/`V2-0023` state.
7. Add `Let's work` as the context-saving session shortcut across agent and
   project-management docs.
8. Verify docs-only changes.

## 6. Files Expected To Change

- `AGENTS.md`
- `README.md`
- `CONDUCTOR.md`
- `CLAUDE.md`
- `docs/project-management/operating-model.md`
- `docs/project-management/decision-board.md`
- `docs/plans/index.md`
- `docs/plans/V2-0009-next-execution-sequence.md`
- `docs/plans/V2-0021-handoff-work-log-archiving.md`
- `docs/plans/V2-0022-full-v1-parity-timeline.md`
- `docs/plans/V2-0024-project-management-operating-model.md`
- `docs/decisions/0014-active-work-log-and-archive-policy.md`
- `docs/decisions/0017-project-management-operating-model.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/handoff/archive/work-log-2026-06-20-core-through-picking-create.md`
- `docs/migration/migration-plan.md`
- `docs/migration/module-inventory.md`

## 7. Verification Steps

- `git diff --check`
- Confirm active work log has archive pointers and remains under context-budget
  target.
- Confirm stale "no write workflow/status transition" Picking statements are
  removed from active status docs.
- Confirm no runtime code, Supabase schema, staging data, V1 production apps,
  GAS deployments, Sheets, URLs, LINE tokens, or secrets changed.

## 8. Rollback / No-Production-Impact Note

Documentation-only project-management change. Roll back by reverting this plan
and restoring the prior active work-log content from git/archive if needed. No
production impact.

## 9. Open Questions

- Should the user want weekly dated progress reports, add a lightweight
  `docs/project-management/reports/` folder later.
- Should future implementation plans include explicit owner/time-box fields?

## 10. Handoff Notes

- Next action after this management cleanup: execute Picking problem reporting.
- Use `docs/project-management/decision-board.md` for the current proposed
  decision pack.
- Related plans: `V2-0021`, `V2-0022`, `V2-0023`.
- Related ADRs: `0014`, `0016`, `0017`.
