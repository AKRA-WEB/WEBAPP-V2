# Plan V2-0021: Handoff Work Log Archiving

Status: Complete on 2026-06-20

User request:

```text
จัดการเอกสารให้ด้วย
```

## Goal

Keep handoff continuity while reducing token/context cost for every future
session.

Success definition:

- `docs/handoff/work-log.md` contains only recent entries and archive pointers.
- Older entries remain available under `docs/handoff/archive/`.
- Read-order rules tell agents to read archive files only when needed.

## Scope

- Split old work-log entries into an archive file.
- Keep recent 2026-06-20 entries in the active work log.
- Update agent/conductor/readme guidance.
- Record the process decision in an ADR.
- Update handoff docs and plan index.

## Out Of Scope

- Deleting historical work-log entries.
- Changing runtime app code, Supabase schema, staging data, or V1 systems.
- Rewriting every old entry for style or length.

## Files Changed

- `docs/handoff/work-log.md`
- `docs/handoff/archive/work-log-2026-06-18-to-2026-06-19.md`
- `AGENTS.md`
- `CONDUCTOR.md`
- `README.md`
- `docs/decisions/0014-active-work-log-and-archive-policy.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification

- `git diff --check`
- Confirm active log still points to the archive.
- Confirm archive retains historical headings.

## Rollback / No-Production-Impact Note

This is a documentation-only process change. Rollback is to restore the prior
single-file `docs/handoff/work-log.md` content from git history or by combining
the archive and active log. No production V1 apps, GAS deployments, Sheets,
Supabase schema, staging data, URLs, LINE tokens, or secrets are touched.

## Handoff Notes

- Future agents should read `current-state.md`, `plans/index.md`, and the
  active recent `work-log.md` first.
- Archive files are for historical investigation only.
- Keep the active work log to the latest 3-5 entries or roughly 400 lines. When
  it grows beyond that, archive older entries with a dated pointer and keep
  `current-state.md` as the compact continuity summary.
