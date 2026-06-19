# ADR 0007: Use `Architect:` For Detailed Plan Drafting

Date: 2026-06-19

## Status

Accepted

## Context

V2 now has a root conductor and central plan index. The user wants the
user-facing command to be `Architect:` instead of `Conductor:` when requesting a
detailed plan before implementation.

The repo also needs a reusable format so different agents produce plans with
the same level of detail and do not skip requirement/scope, user flow, data, or
verification sections.

## Decision

Use `Architect:` as the plan-only command.

When a user message starts with `Architect:`, the agent must draft or update a
detailed plan before implementation and must not change runtime code unless the
user later sends an execution command such as `Go:`.

The default plan format is stored at
`docs/plans/templates/architect-plan-template.md` and covers:

- goal;
- requirement and scope definition;
- MVP / nice-to-have / out-of-scope;
- system architecture and data design;
- UI/UX and user flow;
- system logic/pseudocode;
- task breakdown;
- files expected to change;
- verification steps;
- rollback/no-production-impact note;
- open questions and handoff notes.

## Consequences

- Future agents have a clear trigger for plan-only mode.
- Plans should be more complete and easier to continue after context reset.
- `CONDUCTOR.md` remains the central coordination file, but `Architect:` is the
  user-facing planning command.
- `Go:` remains the natural execution command after the user approves or narrows
  a plan.
