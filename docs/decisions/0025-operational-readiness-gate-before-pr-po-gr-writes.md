# ADR 0025: Operational Readiness Gate Before PR/PO/GR Writes

Date: 2026-06-24

Status: Accepted

## Context

The V2 architecture direction is intentionally a modular monolith on Next.js,
Supabase Auth/Postgres, central permissions, server guards, RLS, and
server-side privileged writes. PR/PO/GR schema/RLS foundation is already applied
to staging (`0013`), and `V2-0044` plans staging-only import/read-only
validation.

The remaining gap is operational readiness. There is no complete environment
matrix, app monitoring plan, backup/DR plan, or PR/PO/GR-specific rollback
runbook. PR/PO/GR write workflows are core business operations, so they should
not begin until the operations layer is explicit.

Official Supabase operational docs were checked read-only on 2026-06-24 while
drafting this decision:

- `https://supabase.com/docs/guides/platform/backups`
- `https://supabase.com/docs/guides/telemetry/logs`
- `https://supabase.com/docs/guides/telemetry/reports`
- `https://supabase.com/docs/guides/database/database-advisors`

## Decision

Accept an operational-readiness gate before PR/PO/GR transactional write
workflow begins.

The gate requires a documented and reviewed package covering:

1. Environment Matrix.
2. Monitoring/observability plan.
3. Backup/DR plan with RPO/RTO targets and restore-drill evidence requirement.
4. Module rollback runbook, including PR/PO/GR-specific rollback and data
   reconciliation.
5. PR/PO/GR readiness gates that distinguish import/read-only validation from
   write workflow and production cutover.

This gate does **not** block `V2-0044` staging import or read-only validation.
It does block PR/PO/GR transactional write workflow implementation from being
treated as ready to start.

Production cutover has an additional bar: readiness checks must be implemented
and verified, not merely drafted.

Production data separation is also part of the gate: production PR/PO/GR
cutover should use a separate production Supabase data plane from staging. Any
proposal to share a staging project or schema with production requires a
separate ADR before cutover.

## Consequences

- `V2-0046` becomes the planning source for operational readiness before
  PR/PO/GR writes.
- PR/PO/GR import/read-only validation can proceed in parallel because it does
  not create production business writes.
- Sentry/OpenTelemetry/log drains are not decided by this ADR. Tooling choices,
  alert owners, and RPO/RTO targets remain open sub-decisions.
- The project cannot claim production readiness for PR/PO/GR core workflows
  until restore/rollback evidence and monitoring coverage exist.

## Alternatives Considered

### Continue PR/PO/GR writes after import without operations gate

Rejected. This would make V2 create core operational records before the team can
answer who gets alerted, how to recover data, how long downtime may last, and
how to return staff to V1 if needed.

### Block all PR/PO/GR work until operations is complete

Rejected. Staging import and read-only validation are low-risk and are still
needed to expose real data anomalies. The gate should block writes, not
evidence-gathering.

### Require final monitoring/DR tooling before any further planning

Rejected. The correct next step is to define the required operational package,
owners, and target posture first; implementation/tooling should follow in small
reviewable slices.
