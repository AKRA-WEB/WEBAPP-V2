# Plan V2-0015: Core Import Dry Run

Status: Complete on 2026-06-19


## 1. Goal

- Primary objective: build a validation-first import workflow for V1 `User`,
  `AppConfig`, `RoleConfig`, and `PermConfig` data before writing real rows to
  V2 staging.
- Success definition: exported snapshots can be parsed into a deterministic
  report showing row counts, role/permission mappings, unknown values,
  duplicate identities, users without email, and proposed V2 writes.
- User/business reason: reduce migration risk before moving V1 core access data
  into Supabase.

## 2. Requirement And Scope Definition

### Problem

- V2 core schema exists and is verified, but no real V1 core data has been
  imported.
- V1 identity data may contain users without email addresses, inconsistent role
  strings, or permissions that need mapping.
- Direct import without validation could create wrong access assignments.

### Users

- Primary users: developer/agent preparing migration.
- Secondary users: project owner reviewing import report.
- Admin/support users: future support staff validating account mappings.

### MVP Features

- Read exported CSV or JSON snapshots from a local ignored import folder.
- Validate required headers for `User`, `AppConfig`, `RoleConfig`, and
  `PermConfig`.
- Normalize role names and permission keys according to
  `docs/migration/core-v1-import-mapping.md`.
- Produce a deterministic dry-run report without writing to Supabase.
- Flag users with missing email or duplicate identity candidates.
- Flag unknown apps, roles, and permission keys.
- Flag proposed role/permission changes compared with current structural seed.
- Keep raw exports out of git.

### Nice-To-Have Features

- Add a second command that writes to staging only after report approval.
- Produce machine-readable JSON plus human-readable Markdown report.
- Add anonymized fixture data for repeatable tests.
- Support direct Google Sheets export only after secrets/auth handling is
  designed.

### Out Of Scope

- Importing passwords from V1.
- Changing V1 Sheet schemas or GAS code.
- Writing rows to staging during the first dry-run slice.
- Creating production V2 users.
- Migrating Picking operational data.
- Solving final identity policy for users without email; the dry run only
  reports candidates and options.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: none.
- Backend/server boundary: Node script under `scripts/`.
- Database: optional read-only comparison against staging; no writes in MVP.
- Auth/permissions: mapping into existing V2 roles/permissions model.
- Deployment: local-only tooling.

### Data Model / Schema

- Tables or entities involved: V1 `User`, `AppConfig`, `RoleConfig`,
  `PermConfig`; V2 `profiles`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `apps`.
- Important fields: user id/name/email if available, role strings, app ids,
  permission keys.
- Relationships: V1 role/app matrix maps to V2 roles and permissions.
- Constraints: no passwords or secrets in repo; no user-editable metadata for
  authorization.
- RLS/security notes: import writes, when later approved, must happen through
  server-side/admin tooling, not browser code.

### Integration Points

- V1 references: CSV/JSON exports from V1 Sheets used as local snapshots only.
- Supabase: optional read-only staging comparison through `DATABASE_URL` or
  server-side secret in process environment.
- Vercel: none.
- LINE/GAS/Sheets/API: no direct GAS/Sheets calls in MVP.
- Secrets/env vars: use process environment only; never write connection
  strings, service keys, raw exports, or passwords to tracked files.

## 4. UI/UX And User Flow

### User Flow

1. Developer places V1 export snapshots in an ignored local folder.
2. Developer runs the dry-run script.
3. Script validates headers and data shapes.
4. Script writes a report to an ignored output folder or prints a concise
   summary.
5. Owner reviews unknowns and identity decisions.
6. Only after approval, a later plan can write mapped rows to staging.

### Screens / States

- Screen: command-line output and optional report file.
- Empty state: no input files found.
- Loading state: progress logs per source file.
- Error state: missing required headers or malformed data.
- Permission-denied state: not applicable.
- Mobile behavior: not applicable.

### System Logic / Pseudocode

```text
load mapping docs/config
load V1 snapshots
validate headers
normalize rows
build proposed V2 entities
compare with current known seed
emit report
exit nonzero for blocking errors
do not write database rows
```

## 5. Task Breakdown

1. Define ignored input/output paths for V1 snapshots and reports.
2. Add import validation script under `scripts/`.
3. Parse V1 exports with strict header checks.
4. Encode mapping rules from `core-v1-import-mapping.md`.
5. Generate dry-run report with counts and warnings.
6. Add fixture-based smoke checks if feasible without real data.
7. Update runbook/handoff with how to run and review the dry run.
8. Decide separately whether to implement staging writes.

## 6. Files Expected To Change

- `scripts/*core-import*`
- `docs/runbooks/*core-import*`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- Optional `.gitignore` entry for local import snapshots/reports

## 7. Verification Steps

- Run dry run against a small synthetic fixture.
- Run dry run against real exported snapshots when available.
- Confirm report is deterministic across repeated runs.
- Confirm no raw V1 exports, passwords, secrets, or connection strings appear in
  `git status --short`.
- Run `npm run lint`, `npm run typecheck`, and `git diff --check` if scripts are
  added.

## 8. Rollback / No-Production-Impact Note

The MVP is read-only and local-only. It does not write Supabase rows and does
not modify V1. If generated reports are wrong, delete the ignored report output
and fix the script before any approved staging write step.

## 9. Open Questions

- What export format should be the first supported format: CSV, JSON, or both?
- How should V1 users without email be represented in Supabase Auth?
- Which V1 role strings should collapse into one V2 role versus remain
  separate?
- Should the dry-run report include names, or should it redact names by default?

## 10. Handoff Notes

- Next action: prepare the actual import migration script when user approves database write workflows.
- Outcome: `scripts/core-import-dry-run.mjs` was successfully built, incorporating `@supabase/supabase-js` API client querying to bypass IPv6/port-5432 network issues. It produces a detailed validation and proposal report.
- Related plans: `V2-0004`, `V2-0009`, `V2-0014`, `V2-0016`.
