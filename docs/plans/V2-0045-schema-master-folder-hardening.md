# Plan V2-0045: Schema, Master Data, And Folder Structure Hardening

Status: Complete

Requested:

```text
มีอะไรต้องปรับปรุงไหม ในเรื่องของ Database Schema / Master data design / Folder Stucture
จัดการด้วย
```

## 1. Goal

Capture the recommended improvements around the existing database schema,
master-data design, and folder structure without changing runtime behavior,
database schema, staging data, V1 production systems, or secrets.

## 2. Scope

- Add a human-readable schema catalog derived from the existing migrations.
- Standardize master-data vocabulary before PR/PO/GR import implementation.
- Record the source-app/module-visibility decision in an ADR.
- Track planned module folders with README boundaries.
- Add a `scripts/lib/` boundary for shared import helper logic planned by
  `V2-0044`.
- Update plan/index/handoff docs so future agents resume from the new
  structure.

## 3. Out Of Scope

- No new Supabase migration.
- No schema alteration.
- No staging import/apply.
- No runtime route or UI changes.
- No V1 repo, Sheet, GAS, deployment, URL, LINE token, or secret change.

## 4. Files Changed

- `docs/database/schema-catalog.md`
- `docs/migration/master-data-vocabulary.md`
- `docs/decisions/0024-master-data-vocabulary-and-folder-boundaries.md`
- `docs/plans/V2-0045-schema-master-folder-hardening.md`
- `src/modules/README.md`
- `src/modules/purchasing/README.md`
- `src/modules/receiving/README.md`
- `src/modules/warehouse/README.md`
- `src/modules/returns/README.md`
- `src/modules/kpi/README.md`
- `scripts/lib/README.md`
- docs index/handoff/decision-board files for discoverability and closeout

## 5. Verification

- Official Supabase changelog/docs were checked read-only on 2026-06-24 for
  current RLS/Data API guidance before documenting the schema posture.
- `git diff --check`
- `npm run check:migrations`
- `npm run check:notes` was attempted but this repo has no such package script;
  no notes-specific checker is currently available.
- Confirm no runtime app code, migration SQL, staging data, V1 production
  files, secrets, GAS deployments, Sheets, URLs, or LINE tokens changed.

## 6. Rollback / No-Production-Impact Note

Documentation and README boundary files only. Rollback is deleting the new docs
and README files plus reverting index/handoff updates. No production system is
touched.

## 7. Handoff Notes

- The schema does not need a rewrite before PR/PO/GR import.
- Use `docs/migration/master-data-vocabulary.md` before writing PR/PO/GR
  import code.
- Use `docs/database/schema-catalog.md` as the quick table-family reference.
- The next implementation decision remains ADR `0023`: full snapshot vs
  active-only import scope for `V2-0044`.
