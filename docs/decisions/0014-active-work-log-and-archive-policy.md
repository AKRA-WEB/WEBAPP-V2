# ADR 0014: Active Work Log And Archive Policy

Date: 2026-06-20

## Status

Accepted

## Context

`docs/handoff/work-log.md` had grown into a long append-only history. Reading it
in every session preserved context but consumed unnecessary tokens because
`docs/handoff/current-state.md` and `docs/plans/index.md` already summarize the
current operational state.

The project still needs historical verification details to remain available
after chat context is cleared.

## Decision

Use `docs/handoff/work-log.md` as the active recent work log only.

Older entries move to dated archive files under `docs/handoff/archive/`.

Agents should:

- read `docs/plans/index.md`, `docs/handoff/current-state.md`, and the active
  `docs/handoff/work-log.md` during normal resume;
- open archive files only when a current plan, ADR, bug investigation, or
  verification question requires historical detail;
- append new entries to the active work log;
- archive old active-log entries periodically when the file becomes long again;
- target the active work log to the latest 3-5 entries or roughly 400 lines,
  with details preserved in dated archive files.

## Consequences

- Resume context is shorter and cheaper.
- Historical entries remain searchable in git and on disk.
- `current-state.md` must stay accurate because it becomes the main continuity
  summary.
- Agents must avoid relying on archive files as the default resume path.
