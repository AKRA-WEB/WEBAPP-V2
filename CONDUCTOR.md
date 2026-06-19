# AKRA WEBAPP V2 Conductor

This is the central coordination file for agents and developers working in the
V2 repository. Use it to find the active plan, continue work after chat context
is cleared, and hand off work to another agent without relying on memory.

## Purpose

- Keep V2 work plan-first and reviewable.
- Make the active execution sequence discoverable from one place.
- Preserve continuity across agents, sessions, and chat resets.
- Keep V2 isolated from V1 production systems until an approved cutover.

## Read Order For Any New Session

1. `AGENTS.md`
2. `README.md`
3. `CONDUCTOR.md`
4. `docs/plans/index.md`
5. `docs/handoff/current-state.md`
6. `docs/handoff/work-log.md`
7. The active plan files listed in `docs/plans/index.md`
8. `docs/architecture/target-architecture.md`
9. `docs/migration/migration-plan.md`
10. `docs/migration/module-inventory.md`
11. `C:\dev\WEBAPP\development_context.md` when V1 behavior is relevant

If the task touches Supabase schema, auth, RLS, grants, migrations, or
privileged database access, verify current official Supabase docs/changelog
before implementation.

## Plan Board

The source of truth for plan status is `docs/plans/index.md`.

Use that file to identify:

- active plan;
- current next action;
- blocked decisions;
- completed baselines;
- owner notes for the next agent.

Do not depend on chat history as the source of truth.

## User Commands

Use these command prefixes consistently:

### `Architect:`

Draft or update a detailed plan only. Do not change runtime app code, database
schema, migrations, deployment settings, V1 files, or secrets unless the user
explicitly adds an execution instruction.

When handling `Architect:`, the agent should:

1. Read this file, `docs/plans/index.md`, current handoff docs, and relevant
   existing plans.
2. Create or update a plan under `docs/plans/`.
3. Use `docs/plans/templates/architect-plan-template.md` as the default format
   unless a narrower plan already exists.
4. Include requirement/scope, MVP, nice-to-have, out-of-scope, architecture/data,
   UI/user flow, system logic, task breakdown, files expected to change,
   verification, rollback/no-production-impact, open questions, and handoff
   notes.
5. Update `docs/plans/index.md`, `docs/handoff/current-state.md`, and
   `docs/handoff/work-log.md`.
6. Add or update an ADR if the plan makes a decision that changes future work.

Example:

```text
Architect: วางแผนทำ Picking read-only list/detail ก่อน ห้ามแก้โค้ด
```

### `Go:`

Execute an approved or clearly selected plan. Before editing, read the plan,
check the working tree, then implement the smallest safe slice and verify it.

Example:

```text
Go: ทำตามแผน V2-0010 เฉพาะ read-only list/detail
```

### `Review:`

Review code, docs, or a plan. Lead with findings, risks, missing tests, and
specific file/line references where possible.

## Plan Lifecycle

Use these statuses consistently:

- `Draft`: proposed or scope-gate work not yet approved/confirmed.
- `In progress`: implementation or verification has started.
- `Blocked`: cannot proceed without user input, credentials, environment, or an
  external decision.
- `Review`: implementation is done but needs user review or external
  verification.
- `Complete`: finished, verified, and recorded in handoff.
- `Superseded`: replaced by a newer plan or decision.

Every non-trivial plan should include:

- Goal
- Scope
- Out of scope
- Files expected to change
- Verification steps
- Rollback or no-production-impact note

## Resume Protocol

When continuing work:

1. Read `docs/plans/index.md`.
2. Read the active plan file and any plan it depends on.
3. Check `git status --short`.
4. Identify existing uncommitted changes and do not revert work you did not make.
5. Execute the smallest next step that matches the active plan.
6. Run the relevant verification.
7. Update the plan status, `docs/plans/index.md`, `docs/handoff/current-state.md`,
   and `docs/handoff/work-log.md`.

## Handoff Rules

- Update `docs/handoff/current-state.md` with the current status and next action.
- Append a dated entry to `docs/handoff/work-log.md`.
- Add or update an ADR under `docs/decisions/` when a decision changes future
  behavior or implementation sequence.
- Update `docs/migration/module-inventory.md` when a module moves phase.
- Keep handoff records in English.

## Safety Boundary

Do not modify V1 production apps, Google Apps Script deployments, production
Sheets, GitHub Pages deployments, live URLs, or LINE tokens from this V2 repo
unless the user explicitly approves a production V1 change or module cutover.

Do not commit secrets. Supabase service role keys, database URLs, LINE tokens,
GAS deployment secrets, and passwords belong only in ignored local env files,
approved hosting environment variables, or a secure secret manager.
