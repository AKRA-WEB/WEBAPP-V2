# ADR 0006: Central Conductor And Plan Index

Date: 2026-06-19

## Status

Accepted

## Context

V2 already had individual plan files, handoff state, and work-log records, but
it did not have a single conductor-style entry point equivalent to the V1
planning workflow. Future agents could find the plans by browsing `docs/plans`,
but the active queue, next action, and resume protocol were not centralized.

This made it easier for context to fragment after chat resets or handoffs.

## Decision

Add root `CONDUCTOR.md` and `docs/plans/index.md`.

`CONDUCTOR.md` defines:

- read order;
- plan lifecycle statuses;
- resume protocol;
- handoff rules;
- V1 safety boundaries.

`docs/plans/index.md` becomes the central plan board for:

- active queue;
- next action;
- completed/baseline plans;
- open decisions that block or shape implementation.

Future agents must read both files before selecting or continuing a non-trivial
task.

## Consequences

- A new agent can resume from `CONDUCTOR.md` and `docs/plans/index.md` without
  relying on chat history.
- Active work remains connected to plan files instead of scattered across
  handoff notes only.
- Plan status changes must update the central index in addition to handoff docs.
- This is a process/documentation change only; it has no runtime or V1
  production impact.
