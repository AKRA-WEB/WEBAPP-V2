# Monitoring / Observability Plan

Source plan: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
(task 2). Source decision: ADR `0025`.

This is a plan, not an installed tool. Nothing in this document is wired up
yet — see "Current state" at the end of each section and the Open Questions.

## Severity levels

| Level | Definition | Example | Response |
| --- | --- | --- | --- |
| Sev1 | Production data loss/corruption risk, or PR/PO/GR write workflow fully down in Production | Failed transactional RPC leaves a partial PO/GR write; Production Supabase unreachable | Page rollback owner immediately, follow `docs/operations/module-rollback-runbook.md` state 3 |
| Sev2 | Production feature broken but no data risk, or Staging write workflow broken during UAT | A write action silently fails for one role; import job fails partway | Notify on-call within business hours, follow runbook state 1 or 2 |
| Sev3 | Degraded but workable (slow route, cosmetic bug, non-blocking warning) | Slow `/purchasing` list render; mobile layout overflow | Track as a normal bug, no immediate page |
| Sev4 | Informational (expected dry-run skip, expected denial) | `line_notification_skipped` event, `AccessDenied` for a role with no grant | No action; visible in event/audit tables only |

## Alert recipients

Not yet named. This is an explicit gap, not a default. See Open Questions and
the matching gap in `docs/operations/environment-matrix.md` ("Rollback
owner" column).

## Event/error taxonomy

### App/browser errors

- Next.js client-side render errors and unhandled exceptions.
- Form-submit failures on PR/PO/GR write actions (once implemented).
- Source: browser console + whatever error-tracking tool is chosen.

### Server-side errors

- Server action failures (`requirePermission()` denials are expected/Sev4, not
  errors; unexpected throws are Sev2/Sev3 depending on blast radius).
- Service-role write failures (`createAdminClient()` calls).
- Import/apply job failures (`scripts/*-import-apply.mjs` — currently
  surfaced only via script exit code + the generated `import-reports/*.md`
  report, not yet pushed to any monitoring tool).
- Future RPC/database exceptions once PR/PO/GR write RPCs exist (mirrors the
  `0009`/`0010`/`0011` Picking RPC pattern).

### Vercel runtime

- Deployment status (build success/failure).
- Serverless/function errors and slow routes.
- Source: Vercel dashboard today; no programmatic alerting configured yet.

### Supabase platform

- Logs Explorer: API, Auth, Postgres, Storage, Realtime, Edge Functions (as
  applicable — V2 does not use Storage/Realtime/Edge Functions yet).
- Reports: API gateway, Auth, database health.
- Database Performance Advisor and Security Advisor: must be reviewed before
  PR/PO/GR write workflow ships, and again before production cutover (this is
  a recurring checklist item, not a one-time check — see
  `docs/operations/pr-po-gr-readiness-gates.md`).

### Business lifecycle events (already partially implemented)

These already exist as real database rows, not just a future plan:

- `purchasing_events.event_type`: `pr_created`, `pr_approved`, `pr_rejected`,
  `po_created_from_pr`, `po_created_direct`, `po_closed`, `po_apv_marked`,
  `pr_imported`, `po_imported` (migration `0014`).
- `receiving_events.event_type`: `gr_draft_saved`, `gr_submitted_for_review`,
  `gr_confirmed`, `gr_reset`, `gr_recalled`, `gr_split_updated`,
  `gr_corrected`, `gr_imported` (migration `0014`).
- `picking_requisition_events.event_type` (precedent pattern from `V2-0009`/
  `0010`/`0011`/`0012`): includes `line_notification_sent`/
  `line_notification_skipped`/`line_push_failed`.
- Import job outcomes: row counts, skip counts, warning counts are already
  written to `import-reports/*.md` by every `*-import-apply.mjs` script
  (human-readable, not yet machine-monitored).

What is still missing for PR/PO/GR: the write-workflow events themselves
(`pr_approved`, `po_created_from_pr`, `gr_confirmed`, etc.) are schema-ready
(the check constraints already list them, migration `0014`) but nothing
writes them yet, because the write workflow does not exist yet. This is
expected — see ADR `0025`.

## Recommended first implementation (not yet installed)

1. App/browser + server action errors: Sentry (or equivalent) for Next.js,
   added only after this plan is accepted. Free/low tier is sufficient for
   this project's current scale.
2. Database/platform: rely on Supabase's own Logs/Reports/Advisors UI first.
   No external SIEM or log drain until there is a concrete need.
3. Business events: keep using module event tables (`purchasing_events`,
   `receiving_events`, `picking_requisition_events`), not a generic debug log
   table. This is already the established pattern in this repo.
4. OpenTelemetry tracing: explicitly deferred (Nice-to-Have in `V2-0046`),
   only after the above is working.

## PII / secrets rules

- Never log `DATABASE_URL`, `SUPABASE_SECRET_KEY`, `LINE_CHANNEL_TOKEN`,
  `LINE_GROUP_ID`, access tokens, or raw request headers, in any tool chosen
  here.
- Do not put personal data (names, contact info) into low-value debug log
  metadata. Business event tables already store only what the workflow
  needs (actor name/profile id, not contact details).
- Treat PO/GR vendor/product data as business-sensitive in any external
  monitoring tool: log identifiers and counts, not full row payloads, unless
  a controlled support investigation needs more and is explicitly approved.

## Current state (2026-06-24)

- No monitoring tool is installed. No alerts exist anywhere in this project.
- The only operational signal today is: Vercel's own build/deploy status
  page, Supabase's own dashboard, and the human-readable
  `import-reports/*.md` files written by import scripts.
- This is acceptable for the current Staging-only, no-real-writes-yet state,
  but is explicitly listed as a gate item before PR/PO/GR write workflow in
  `docs/operations/pr-po-gr-readiness-gates.md`.

## Open Questions

- Sentry, or a Vercel/Supabase logs-only baseline first? (Carried from
  `V2-0046`'s plan — still undecided.)
- Who receives alerts after business hours, once any alerting exists?
- Should import job failures (`*-import-apply.mjs` non-zero exit) trigger any
  notification, or is manual report review sufficient given imports are
  agent/dev-run, not automated/scheduled?
