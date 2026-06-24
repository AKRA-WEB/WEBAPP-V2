# Plan V2-0042: Obsidian Docs Index

Status: Complete on 2026-06-23

Execution command:

```text
Go: set up Obsidian-friendly docs index for this repo
```

## Goal

Create a lightweight Obsidian navigation layer for `docs/` so project state,
plans, decisions, and migration references can be browsed without changing the
source-of-truth workflow.

## Scope

- Add root-level docs index pages for Obsidian browsing.
- Use relative Markdown links that work in Obsidian and normal markdown
  viewers.
- Add local Obsidian settings folders to `.gitignore`.
- Update plan and handoff docs.

## Out Of Scope

- Creating or committing `.obsidian/` workspace settings.
- Moving existing docs.
- Changing runtime code, database schema, staging data, V1 production files,
  Sheets, GAS deployments, URLs, LINE tokens, or secrets.

## Files Changed

- `.gitignore`
- `docs/00-dashboard.md`
- `docs/01-active-plans.md`
- `docs/02-decisions.md`
- `docs/03-migration-map.md`
- `docs/plans/V2-0042-obsidian-docs-index.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## Verification

- `git diff --check`
- Manual link/path inspection for the new docs index pages.

## Rollback / No Production Impact

Rollback is deleting the four docs index pages, this plan file, and the
`.gitignore` Obsidian entries, then reverting the handoff/index updates. This
is documentation-only and has no production impact.

## Handoff Notes

- Recommended vault root: `C:\dev\AKRA-WEBAPP-V2\docs`.
- Entry page: `docs/00-dashboard.md`.
- If opening the whole repo as the vault, the same relative links still work
  from inside `docs/`.
