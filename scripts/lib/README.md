# `scripts/lib`

Shared helper modules for local import, dry-run, apply, and verification
scripts.

Current purpose:

- Hold reusable parsing, normalization, matching, and report helpers so dry-run,
  apply, and verify scripts do not silently drift.
- `V2-0044` should move PR/PO/GR bill-identity, date-classification,
  Remark-tag, and matching logic here before implementing the apply script.

Rules:

- Helpers in this folder must not write to the database by themselves.
- Helpers must not read secrets by themselves.
- Apply scripts own write gates such as `--confirm-*` and staging project-ref
  checks.
- Keep source vocabulary aligned with
  `docs/migration/master-data-vocabulary.md`.

