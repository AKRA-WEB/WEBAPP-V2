# Plan V2-0046: Operational Readiness Before PR/PO/GR Writes

Status: Complete (tasks 1-6, 2026-06-24; task 7 deferred — see Handoff Notes)

Architect command:

```text
Architect: วางแผน Operational Readiness สำหรับ Environment Matrix, Monitoring, Backup/DR, Rollback ก่อน PR/PO/GR write workflow
```

## 1. Goal

Plan the operational readiness layer that must exist before V2 starts
transactional PR/PO/GR write workflows.

- Primary objective: define the environment, monitoring, backup/DR, and
  rollback package required before PR/PO/GR writes move beyond schema/import
  and read-only validation.
- Success definition:
  - Environment Matrix exists and is approved for Local, Vercel Preview,
    Vercel Development, Staging, and Production.
  - Monitoring/observability plan exists for app errors, server actions/RPCs,
    import jobs, Supabase database health, and PR/PO/GR business lifecycle
    events.
  - Backup/DR plan exists with explicit RPO/RTO targets, Supabase backup/PITR
    posture, restore-drill owner, and data-export retention rules.
  - Rollback runbook exists for PR/PO/GR write pilot and grouped operational
    cutover, including freeze, traffic-back-to-V1, and data reconciliation
    steps.
  - The readiness gate is reflected in ADR `0025`, the plan board, decision
    board, and handoff docs.
- User/business reason: PR/PO/GR is a core operational workflow. The project
  can safely continue staging import and read-only validation, but write
  workflows need production-grade operations before they create business
  records that staff rely on.

## 2. Requirement And Scope Definition

### Problem

The current V2 architecture direction is strong: modular monolith, Supabase RLS,
server-side privileged writes, module-by-module migration, and grouped PR/PO/GR
release discipline. The operations layer is weaker:

- no complete environment matrix that distinguishes allowed actions and
  integrations by Local/Preview/Development/Staging/Production;
- no app-level monitoring/alerting plan;
- no explicit backup/DR targets or restore drill;
- no PR/PO/GR-specific rollback flow for write workflows;
- Picking has a module rollback package, but PR/PO/GR needs a stricter runbook
  because PR, PO, GR, and inventory-facing receiving data are coupled.

### Users

- Primary users: purchasing staff, receiving/warehouse staff, supervisors, and
  admins using PR/PO/GR workflows.
- Secondary users: management reviewing operational status and KPI/reporting
  outputs derived from PR/PO/GR data.
- Admin/support users: V2 maintainer, database owner, deployment owner, and
  business owner who can authorize cutover or rollback.

### MVP Features

The first useful operational-readiness slice is documentation and gate
definition only:

- Environment Matrix document.
- Monitoring/observability plan and event/error taxonomy.
- Backup/DR plan with candidate RPO/RTO profiles and restore-drill checklist.
- Rollback runbook template plus PR/PO/GR-specific rollback flow.
- Readiness gate checklist that says what blocks PR/PO/GR writes versus what
  can continue earlier.

### Nice-To-Have Features

Defer these until after the readiness plan is approved:

- Actual Sentry or equivalent installation.
- OpenTelemetry tracing.
- Supabase log drains or external SIEM integration.
- Automated uptime checks.
- Automated backup export jobs.
- Production incident dashboard.
- Runbook automation scripts.

### Out Of Scope

This Architect plan does not:

- implement runtime PR/PO/GR write UI/actions/RPCs;
- change Supabase schema, RLS, grants, or migrations;
- create or change Vercel/Supabase projects or environment variables;
- install monitoring dependencies;
- run backup or restore operations;
- change V1 apps, GAS deployments, Sheets, URLs, or LINE tokens;
- approve PR/PO/GR production cutover.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: existing Next.js + TypeScript modular monolith.
- Backend/server boundary: server actions and server-only Supabase admin
  clients for privileged writes, unchanged by this plan.
- Database: Supabase Postgres; current PR/PO/GR schema foundation is
  `supabase/migrations/0013_pr_po_gr_foundation.sql`.
- Auth/permissions: existing Supabase Auth, central roles/permissions,
  `requirePermission()`, RLS, and service-role-only write paths.
- Deployment: Vercel Preview/Development/Production plus separate Supabase
  staging and future production data planes.

### Environment Matrix Design

Create `docs/operations/environment-matrix.md` in the implementation slice with
at least these columns:

| Field | Required detail |
| --- | --- |
| Environment | Local, Preview, Development, Staging, Production |
| Vercel target | Local dev server, Preview deployment, Development deployment, Production |
| Supabase project | Local/staging/prod project ref, never secret values |
| Data class | Synthetic, staging snapshot, production operational data |
| Allowed users | Agent/dev, test users, business UAT users, real staff |
| Allowed actions | Read-only, import apply, write workflow, notification send, cutover |
| LINE mode | Disabled, dry-run, sandbox, production |
| Secrets source | Local ignored env, Vercel env, secure owner-controlled vault |
| Backup/restore posture | None, disposable, daily backup, PITR, restore-drill required |
| Rollback owner | Named role/person responsible for rollback authorization |

Required policy:

- Staging import/read-only validation may continue before the full operations
  package is implemented.
- PR/PO/GR transactional write workflow must wait until the operational
  readiness package is approved.
- Production cutover must wait until the readiness package is not only written
  but also verified through the agreed checks.

### Monitoring / Observability Design

Create `docs/operations/monitoring-observability-plan.md` in the implementation
slice.

Minimum monitoring surfaces:

- App/browser errors: Next.js client errors, route render errors, form-submit
  failures.
- Server-side errors: server actions, service-role writes, import/apply jobs,
  RPC/database exceptions if introduced later.
- Vercel runtime: deployment status, serverless/function errors, slow routes.
- Supabase:
  - Logs Explorer / product logs for API, Auth, Postgres, Storage, Realtime,
    and Edge Functions where applicable.
  - Reports for API gateway, Auth, and database health.
  - Database Performance and Security Advisors before write workflow and before
    cutover.
- Business events:
  - PR created/submitted/approved/rejected/cancelled/reopened.
  - PO created/approved/cancelled/direct/manual-review.
  - GR received/partial/closed/reopened/orphan/manual-review.
  - Import started/completed/failed, row counts, warning counts, source
    snapshot identifiers.

Recommended first implementation option:

- Use Sentry or equivalent for Next.js browser/server action errors.
- Use Supabase Logs/Reports/Advisors for database and platform observability.
- Use module event tables for business lifecycle events, not general debug
  logging.
- Add OpenTelemetry only after the basic error and business-event coverage is
  working.

PII/secrets rules:

- Do not log `DATABASE_URL`, service-role keys, LINE tokens, access tokens, or
  raw headers.
- Do not put personal data in low-value log metadata.
- Treat PO/GR vendor/product data as business-sensitive; log identifiers and
  counts unless detail is needed for a controlled support investigation.

### Backup / Disaster Recovery Design

Create `docs/operations/backup-dr-plan.md` in the implementation slice.

Official Supabase docs checked on 2026-06-24 for this plan:

- `https://supabase.com/docs/guides/platform/backups`
- `https://supabase.com/docs/guides/telemetry/logs`
- `https://supabase.com/docs/guides/telemetry/reports`
- `https://supabase.com/docs/guides/database/database-advisors`

Facts to account for:

- Supabase daily backups and retention depend on plan tier.
- PITR is an add-on for finer restore granularity and requires appropriate
  compute posture.
- Restores make the project inaccessible during the restore window; RTO must be
  proven by drill, not guessed.
- Database backups do not restore objects deleted from Supabase Storage; if V2
  later stores files, Storage backup rules must be added separately.
- Custom-role passwords may need reset after restoring from daily backups.

Candidate DR profiles to decide before production cutover:

| Profile | Candidate RPO | Candidate RTO | Notes |
| --- | --- | --- | --- |
| Daily backup baseline | Up to 24 hours | Same business day, drill required | Lower cost; may be insufficient for PR/PO/GR once live |
| PITR production profile | 15 minutes or better target, confirmed against plan | 1-4 hours, drill required | Better fit for core operations; requires Supabase plan/add-on decision |

The plan must not promise the reviewer-suggested `RPO = 15 min` and
`RTO = 1 hour` until the Supabase tier, PITR setting, restore procedure, and a
non-production restore drill prove that target is realistic.

### Rollback Design

Create `docs/operations/module-rollback-runbook.md` and, if useful,
`docs/operations/pr-po-gr-readiness-gates.md`.

Rollback states:

1. **Import/read-only staging issue**
   - Stop import pipeline.
   - Re-run dry-run report.
   - Truncate/reload staging PR/PO/GR import tables if needed.
   - No production impact.
2. **Pre-cutover write workflow issue in staging/UAT**
   - Disable write route/action by permission or feature flag.
   - Keep V1 as source of truth.
   - Export V2 test writes for diagnosis.
   - Fix/retest before re-enabling.
3. **Production cutover issue after PR/PO/GR writes start**
   - Freeze V2 writes immediately.
   - Announce incident and expected fallback.
   - Send traffic/operators back to V1 if V1 remains operational.
   - Export V2-created deltas after cutover timestamp.
   - Reconcile whether V2-created PR/PO/GR records must be copied to V1,
     voided, or re-entered manually.
   - Record final incident notes and data reconciliation evidence before
     reattempting cutover.

PR/PO/GR-specific rule:

- PR/PO/GR production cutover remains grouped per ADR `0021`. If anyone wants
  PR/PO write workflows live before GR is also ready, a separate bridge/writeback
  ADR is required first.

### Data Model / Schema

No schema changes are part of this plan.

Possible future implementation work may add:

- app-level error tracking configuration;
- environment variables for the chosen monitoring tool;
- additional business-event rows written by PR/PO/GR actions once those actions
  are implemented;
- operational docs under `docs/operations/`.

Any future schema or RLS change must follow the existing Supabase rules:
explicit migrations under `supabase/migrations`, RLS on exposed tables, no
secret/service-role exposure to the browser, and updated
`docs/migration/database-strategy.md`.

### Integration Points

- V1 references: V1 remains source of truth until explicit module cutover.
- Supabase: backup/PITR posture, Logs Explorer, Reports, Database Advisors,
  Postgres logs, and future production project separation.
- Vercel: Preview/Development/Production target separation and future app-error
  monitoring configuration.
- LINE/GAS/Sheets/API: no production changes; LINE modes must be declared per
  environment before real sends.
- Secrets/env vars: document key names and owners only; do not commit values.

## 4. UI/UX And User Flow

No user-facing UI is implemented by this plan.

Operational user flow for future approval:

1. Maintainer prepares the Environment Matrix.
2. Business owner confirms which environments can write, send notifications,
   and use real users.
3. Maintainer prepares monitoring, backup/DR, and rollback documents.
4. Technical owner verifies monitoring and DR assumptions in staging/non-prod.
5. Business owner approves readiness gate.
6. PR/PO/GR write workflow implementation can start.

## 5. Task Breakdown

Use small, reviewable tasks after the user sends `Go:`:

1. Create `docs/operations/environment-matrix.md`.
   - Include environment rows, allowed actions, integration mode, secrets owner,
     and rollback owner.
   - Mark production Supabase separation as required before cutover unless a
     later ADR accepts an exception.
2. Create `docs/operations/monitoring-observability-plan.md`.
   - Define severity levels, alert recipients, event taxonomy, and tool choice
     recommendation.
   - Include Supabase Logs/Reports/Advisors and Vercel runtime logs.
3. Create `docs/operations/backup-dr-plan.md`.
   - Choose candidate DR profile for approval.
   - Include restore-drill checklist and what evidence must be captured.
4. Create `docs/operations/module-rollback-runbook.md`.
   - Include generic module rollback and PR/PO/GR-specific rollback steps.
   - Include data reconciliation and authority-to-rollback fields.
5. Create or update `docs/operations/pr-po-gr-readiness-gates.md`.
   - Distinguish what can proceed now (`V2-0044` import/read-only validation)
     versus what is blocked (transactional PR/PO/GR writes).
6. Update cutover/checklist references.
   - Link readiness docs from `docs/migration/cutover-checklist.md` or the
     PR/PO/GR cutover package when that package exists.
7. Optional later implementation slice:
   - Install/configure chosen app monitoring tool.
   - Add safe test error verification in Preview/Development only.
   - Run Supabase advisor/log review and record evidence before writes.

## 6. Files Expected To Change

This Architect slice:

- `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
- `docs/decisions/0025-operational-readiness-gate-before-pr-po-gr-writes.md`
- `docs/plans/index.md`
- `docs/project-management/decision-board.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/00-dashboard.md`
- `docs/01-active-plans.md`
- `docs/02-decisions.md`
- `docs/03-migration-map.md`

Future `Go:` slice:

- `docs/operations/environment-matrix.md`
- `docs/operations/monitoring-observability-plan.md`
- `docs/operations/backup-dr-plan.md`
- `docs/operations/module-rollback-runbook.md`
- `docs/operations/pr-po-gr-readiness-gates.md`
- possibly `.env.example`, `package.json`, and app-monitoring config files only
  if the user approves a tooling implementation slice.

## 7. Verification Steps

For this planning slice:

- `git diff --check`
- Inspect the new plan and ADR links from the docs dashboard/maps.

For future implementation slices:

- Documentation-only readiness docs: `git diff --check`.
- Monitoring implementation: run `npm run lint`, `npm run typecheck`, and
  `npm run build`; verify a safe non-production test event reaches the chosen
  monitoring tool.
- Supabase posture: review Logs/Reports/Advisors and record findings before
  PR/PO/GR writes.
- Backup/DR: run a non-production restore drill and record actual elapsed time
  before committing to a production RTO.
- Rollback: run a tabletop exercise for PR/PO/GR write failure and cutover
  failure.

## 8. Rollback / No-Production-Impact Note

This Architect slice is documentation-only. It does not touch runtime app code,
database schema, staging data, Vercel/Supabase project settings, V1 production,
GAS deployments, Sheets, URLs, LINE tokens, or secrets.

If this plan is rejected, revert the docs/ADR additions and remove the V2-0046
references from the plan board, decision board, dashboard/maps, and handoff
docs.

## 9. Open Questions

- Should production Supabase be a separate project from staging before first
  production cutover? Recommendation: yes; if not, require a separate ADR.
- Which DR profile should be funded/approved for production PR/PO/GR: daily
  backup baseline or PITR?
- What are the real RPO/RTO targets for core operations?
- Who receives production alerts after hours?
- Which app monitoring tool should be used first: Sentry or a Vercel/Supabase
  logs-only baseline?
- Who can authorize rollback during business hours and outside business hours?
- Should LINE production sends remain disabled until after PR/PO/GR write UAT,
  or can sandbox/production notification tests run earlier?

## 10. Handoff Notes

Executed 2026-06-24 (`ลุยเลย` after confirming scope: this plan only, no
second parallel worktree). Tasks 1-6 done:

- Task 1: `docs/operations/environment-matrix.md`.
- Task 2: `docs/operations/monitoring-observability-plan.md`.
- Task 3: `docs/operations/backup-dr-plan.md`.
- Task 4: `docs/operations/module-rollback-runbook.md`.
- Task 5: `docs/operations/pr-po-gr-readiness-gates.md`.
- Task 6: linked all of the above from
  `docs/migration/cutover-checklist.md` (no PR/PO/GR-specific cutover package
  exists yet to link from instead).

Each document states its own real gaps as Open Questions rather than
fabricating numbers (no monitoring tool installed, no restore drill run, no
named rollback owner, only one Supabase project exists today). This was a
documentation-only slice: no runtime code, schema, staging data, V1
production files, or secrets changed.

- Task 7 (install monitoring tooling, run a real restore drill, run a
  tabletop rollback exercise) is **not done** — it is the explicitly optional,
  later implementation slice from section 5, and per
  `docs/operations/pr-po-gr-readiness-gates.md` it is not a hard prerequisite
  for starting PR/PO/GR write-workflow *implementation* against Staging. It
  remains a hard prerequisite for production cutover.
- Next action: user reviews/accepts this readiness package; PR/PO/GR
  write-workflow implementation can then be planned as a new slice.
- Blockers (updated):
  - PR/PO/GR write workflow should not start implementation planning until
    this package is reviewed/accepted (now exists, previously did not).
  - Production cutover should not start until readiness checks are
    implemented and verified (task 7 work), not merely documented.
- Related plans:
  - `V2-0044` PR/PO/GR staging import slice.
  - `V2-0045` schema/master/folder hardening.
  - `V2-0039` PR/PO/GR grouped release shape.
  - `V2-0034` Picking cutover package.
- Related ADRs:
  - `0021` PR/PO/GR grouped release shape.
  - `0023` PR/PO/GR staging import scope (Proposed).
  - `0025` Operational readiness gate before PR/PO/GR writes.
