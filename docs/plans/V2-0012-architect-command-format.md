# Plan V2-0012: Architect Command Format

Status: Complete on 2026-06-19

## Goal

Make `Architect:` the standard user command for detailed plan drafting in V2,
and provide a reusable format so agents produce consistent plan files before
implementation.

## Scope

- Define `Architect:` in `CONDUCTOR.md` as a plan-only command.
- Add a detailed plan template covering requirement/scope, architecture/data,
  UI/user flow, task breakdown, verification, rollback, and handoff notes.
- Record the decision in an ADR.
- Update read-first and handoff docs so future agents follow the new command.

## Out Of Scope

- Changing runtime app code.
- Changing Supabase schema, auth, RLS, grants, migrations, or staging data.
- Changing V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or
  GitHub Pages deployments.
- Renaming `CONDUCTOR.md`; the file remains the central coordinator, while
  `Architect:` is the user-facing planning command.

## Files Expected To Change

- `CONDUCTOR.md`
- `docs/plans/templates/architect-plan-template.md`
- `docs/plans/V2-0012-architect-command-format.md`
- `docs/decisions/0007-architect-command-for-plan-drafting.md`
- `docs/plans/index.md`
- `AGENTS.md`
- `README.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification Steps

- Run `git diff --check`.
- Check touched documentation for trailing whitespace.
- Confirm no runtime code, V1 files, secrets, deployment settings, or Supabase
  schema files changed.

## Rollback / No-Production-Impact Note

This is a documentation/process-only change. Reverting it would remove the
`Architect:` command protocol, template, ADR, plan, and handoff links. It has no
runtime, database, or V1 production impact.
