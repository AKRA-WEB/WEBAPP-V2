# Backup / Disaster Recovery Plan

Source plan: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
(task 3). Source decision: ADR `0025`.

Official Supabase docs checked read-only on 2026-06-24 for this plan (same
sources the Architect plan cited):

- `https://supabase.com/docs/guides/platform/backups`
- `https://supabase.com/docs/guides/telemetry/logs`
- `https://supabase.com/docs/guides/telemetry/reports`
- `https://supabase.com/docs/guides/database/database-advisors`

## Facts this plan accounts for

- Supabase daily backups and retention window depend on the project's plan
  tier; this repo has not verified which tier the staging project is on as
  part of this documentation slice.
- Point-in-time recovery (PITR) is an add-on for finer restore granularity
  and has compute/plan prerequisites.
- A restore makes the project inaccessible during the restore window. RTO
  must be proven by an actual drill, not assumed from marketing copy.
- Database backups do not cover Supabase Storage objects. V2 does not use
  Storage yet, so this is a future concern, not a current gap — re-check this
  line item if/when Storage is adopted.
- Restoring from a daily backup may require resetting custom-role passwords
  afterward.

## Candidate DR profiles (decide before production cutover, not now)

| Profile | Candidate RPO | Candidate RTO | Notes |
| --- | --- | --- | --- |
| Daily backup baseline | Up to 24 hours | Same business day, drill required | Lower cost; likely insufficient once PR/PO/GR writes are live and staff depend on same-day data |
| PITR production profile | 15 minutes or better, but only once confirmed against the actual Supabase plan | 1-4 hours, drill required | Better fit for live PR/PO/GR operations; requires a plan/add-on decision and is not yet purchased or configured |

This document does **not** promise `RPO = 15 min` / `RTO = 1 hour` as a
committed target. Those numbers are only candidates until a real restore
drill against a non-production project proves them.

## Current state (2026-06-24)

- No restore drill has been run against the staging project.
- No PITR add-on has been purchased or enabled.
- The de facto recovery path for staging today is re-running the gated import
  scripts (`scripts/pr-po-gr-import-apply.mjs`, `scripts/product-catalog-import-apply.mjs`,
  etc.) against the source CSVs, since staging holds only synthetic test
  accounts plus a re-importable V1 snapshot — not original, hand-entered
  production data. This is acceptable for Staging precisely because nothing
  in it is irreplaceable yet.
- This recovery path is explicitly **not** sufficient once real PR/PO/GR
  write-workflow records exist (those records have no V1-source CSV to
  re-import from — they are V2-original data).

## Restore-drill checklist (run before approving a production RTO/RPO target)

- [ ] Confirm the Supabase plan tier and its included backup retention window.
- [ ] Confirm whether PITR is enabled, and if not, decide whether to enable it
      before cutover.
- [ ] Trigger a restore on a non-production project (or a disposable branch/
      clone of staging) and record:
  - [ ] Actual wall-clock time from restore-start to project-accessible.
  - [ ] Whether any custom-role passwords needed reset after restore.
  - [ ] Whether RLS policies, grants, and `0001`-`0014` migrations survived the
        restore intact (verify with `npm run db:verify-staging-schema`
        against the restored project, or its staging equivalent).
- [ ] Record the drill date, operator, and elapsed time in this file (append a
      dated entry below) once run.
- [ ] Re-run this drill at least once more before production cutover if more
      than 90 days have passed since the last drill, or after any major
      schema change.

## Drill history

None yet. No drill has been run as of 2026-06-24.

## Data-export retention rules

- V1 source CSVs used for staging imports (PR/PO/GR, product catalog,
  warehouse, core) should be retained outside this repo (they are not
  committed — see `.gitignore`'s `import-data/`/`import-snapshots/` entries)
  for as long as they remain the only recovery path for re-importable staging
  data.
- Generated `import-reports/*.md` files are also gitignored; they are
  point-in-time evidence of what an import did and should be kept locally or
  archived by whoever runs the import, not assumed to be permanently
  available in this repo.
- Once real PR/PO/GR write-workflow data exists, it has no CSV fallback —
  this is exactly why the restore-drill/PITR decision above must be settled
  before write workflow ships.

## Open Questions

- Which DR profile should be funded for production: daily backup baseline or
  PITR?
- Who owns running the restore drill, and on what cadence?
- What Supabase plan tier will the eventual production project be on, and
  does it support the chosen profile?
