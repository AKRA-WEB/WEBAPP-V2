# PR/PO/GR Readiness Gates

Source plan: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
(task 5). Source decision: ADR `0025`.

This is the single page that says, for PR/PO/GR specifically, what is allowed
to proceed right now versus what is gated. Check this before starting any new
PR/PO/GR work.

## Already allowed and done (not gated by this ADR)

- Schema/RLS foundation (`supabase/migrations/0013_pr_po_gr_foundation.sql`,
  `0014_pr_po_gr_import_events.sql`) — done, `V2-0036`.
- Staging import / read-only validation (`V2-0044`) — done. 253 PO
  headers/748 lines, 588 GR headers/1868 lines/6 splits, 0 PR rows, 16/16
  verify checks pass, idempotent.
- Read-only `/purchasing` and `/receiving` list/detail UI (`V2-0047`) — done.
- Further read-only refinements to the existing UI/read-model (e.g. better
  filtering, pagination, additional display fields) — allowed, same
  reasoning as the items above: no business writes.
- A real PR import, if/when a non-empty V1 PR export becomes available — the
  import code path is already built and mirrors the proven PO/GR path; this
  is data-import work, not write-workflow work, so it is not gated.

## Gated — must wait for this readiness package to be reviewed/accepted

- Any PR/PO/GR transactional write workflow: create, submit, approve, reject,
  close, recall, correct, or any other state-changing action on PR, PO, or GR
  records (mirrors the kind of actions Picking already has via `0009`/`0010`/
  `0011` RPCs — PR/PO/GR's equivalent RPCs do not exist yet).
- Any new write-capable RPC under `public.purchasing_*`/`public.receiving_*`.
- Any server action that calls `createAdminClient()` to write PR/PO/GR rows
  outside of the existing import scripts.

The gate is satisfied (write workflow may start being implemented) once:

1. `docs/operations/environment-matrix.md`,
   `docs/operations/monitoring-observability-plan.md`,
   `docs/operations/backup-dr-plan.md`, and
   `docs/operations/module-rollback-runbook.md` (this package) have been
   reviewed and accepted by the user/business owner.
2. The Open Questions in each of those four documents have been answered (or
   explicitly deferred with a stated reason) — they do not need to be
   answered with final production-grade tooling yet, but they cannot stay
   silently unanswered.

Note what this gate does **not** require: it does not require Sentry to be
installed, a restore drill to be run, or a rollback owner to be named with a
real phone number, before write-workflow *implementation* can begin in
Staging. Those are the stricter bar for *production cutover* (see below).
Implementing the write workflow against Staging with synthetic test accounts,
the same pattern every other module slice in this repo has used (`V2-0019`
through `V2-0027`, `V2-0047`), is reasonable once the package above is
reviewed, even before every operational detail is finalized — the readiness
package just has to exist and be acknowledged, not be perfect.

## Gated — stricter bar — must wait for production cutover

- Production cutover for PR/PO/GR (per ADR `0021`, cut over as one grouped
  release: PR + PO + GR together).
- Any real LINE notification send for PR/PO/GR (mirrors the same posture
  `V2-0027` already established for Picking: dry-run by default, real sends
  require explicit configuration and approval).

Production cutover additionally requires:

1. The readiness checks are **implemented and verified**, not merely
   written:
   - A real restore drill has been run and recorded
     (`docs/operations/backup-dr-plan.md`'s drill history).
   - Monitoring is actually installed and a test event has been confirmed to
     reach whoever is supposed to receive it.
   - A rollback owner is named for Production, with a real escalation path.
2. Production Supabase is a separate project from Staging (ADR `0025`'s
   explicit requirement) — or a separate ADR has explicitly accepted sharing
   one project, which is not the current default and is not recommended.
3. A tabletop rollback exercise has been run for at least the State 3
   (production cutover issue) scenario in
   `docs/operations/module-rollback-runbook.md`.

## Quick check before starting new PR/PO/GR work

Ask: "Does this change create, modify, or close a PR/PO/GR business record
outside of the existing gated import scripts?"

- No → proceed (it falls in the "already allowed" list above, or is a normal
  read-only/docs change with no special gate).
- Yes → check whether this readiness package has been reviewed/accepted yet.
  If not, this is `V2-0046` work, not new write-workflow work — flag it back
  to the user rather than implementing it.

## Open Questions

Carried from the four linked documents — resolving all of them is not a hard
requirement to start Staging-only write-workflow implementation (see above),
but they should not be silently forgotten:

- Rollback owner per environment (`environment-matrix.md`).
- Monitoring tool choice: Sentry vs. logs-only baseline
  (`monitoring-observability-plan.md`).
- DR profile: daily backup vs. PITR (`backup-dr-plan.md`).
- Rollback authorization, business hours vs. after hours
  (`module-rollback-runbook.md`).
- Whether Production Supabase should be created now or only at first real
  cutover (`environment-matrix.md`).
