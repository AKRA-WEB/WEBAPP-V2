# Plan V2-0011: Conductor Planning Index

Status: Complete on 2026-06-19

## Goal

Add a central V2 planning conductor so future agents can find the active plan,
resume work, and hand off changes without relying on chat history.

## Scope

- Add root `CONDUCTOR.md` with resume protocol, plan lifecycle, handoff rules,
  and V1 safety boundaries.
- Add `docs/plans/index.md` as the central plan board.
- Link the conductor/index into read-first docs and handoff state.
- Record the change in the work log.

## Out Of Scope

- Changing V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  GitHub Pages deployments.
- Changing runtime app code.
- Changing Supabase schema, RLS, grants, migrations, or staging data.
- Rewriting existing plan files beyond linking this central index.

## Files Expected To Change

- `CONDUCTOR.md`
- `docs/plans/index.md`
- `docs/plans/V2-0011-conductor-planning-index.md`
- `docs/decisions/0006-central-conductor-and-plan-index.md`
- `AGENTS.md`
- `README.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- Run `git diff --check`.
- Check touched documentation for trailing whitespace.
- Confirm no V1 files, secrets, runtime code, Supabase schema, or deployment
  settings changed.

## Rollback / No-Production-Impact Note

This is a documentation/process-only change inside the V2 repository. Rolling it
back would remove the central conductor and plan index files plus their links
from read-first/handoff docs. It has no runtime or production V1 impact.
