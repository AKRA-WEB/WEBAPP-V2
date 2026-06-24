# Environment Matrix

Source plan: `docs/plans/V2-0046-operational-readiness-before-pr-po-gr-writes.md`
(task 1). Source decision: ADR `0025`.

This matrix is the single place that says what is allowed to happen in each
environment. When in doubt about whether an action is safe in a given
environment, check this table before running it.

| Environment | Vercel target | Supabase project | Data class | Allowed users | Allowed actions | LINE mode | Secrets source | Backup/restore posture | Rollback owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Local | `npm run dev` (Local dev server) | Staging project ref `yqyoxtgrubuspzyfzija` (no local-only Supabase project exists) | Synthetic + staging snapshot | Agent/dev only | Read-only, import dry-run, import apply (gated `--confirm-*` scripts), schema/migration apply | Disabled (default; `PICKING_LINE_PUSH_ENABLED` unset) | `.env.local` (gitignored) | Same as Staging row (shared project) | Unassigned — see Open Questions |
| Preview (Vercel) | Per-PR Preview deployment | Staging project ref `yqyoxtgrubuspzyfzija` | Synthetic + staging snapshot | Agent/dev, business UAT users (synthetic test accounts only) | Read-only, import apply (only if explicitly run from Local — Preview itself has no write UI yet), future write-workflow UAT once implemented | Disabled or dry-run only | Vercel env vars (Preview scope) | Same as Staging row | Unassigned — see Open Questions |
| Development (Vercel) | Development deployment | Staging project ref `yqyoxtgrubuspzyfzija` | Synthetic + staging snapshot | Agent/dev, business UAT users (synthetic test accounts only) | Same as Preview | Disabled or dry-run only | Vercel env vars (Development scope) | Same as Staging row | Unassigned — see Open Questions |
| Staging | Same Supabase project backs Local/Preview/Development above | Staging project ref `yqyoxtgrubuspzyfzija` | Staging snapshot (real V1 export data imported via gated scripts) + synthetic test accounts | Agent/dev, business UAT users | Read-only, import apply, schema/migration apply, future write-workflow once implemented and approved | Disabled or dry-run only (no real LINE sends proven yet — see `V2-0027`) | Local `.env.local` / Vercel env vars (Preview+Development scope) | No PITR, no confirmed backup drill yet — disposable; re-import from V1 source CSVs is the de facto recovery path today | Unassigned — see Open Questions |
| Production | Production deployment (not yet created/connected) | **Does not exist yet** — must be a separate project from staging per ADR `0025` | Production operational data (real staff, real PR/PO/GR records) | Real staff, supervisors, admins | Nothing yet — production cutover has not started for any module except none (Picking cutover is prepared but not approved) | Production only after explicit approval, never defaulted on | Vercel env vars (Production scope) + secure owner-controlled vault for any value beyond Vercel | Must be decided before cutover — see `docs/operations/backup-dr-plan.md` | Must be named before cutover — see Open Questions |

## Required policy (per ADR 0025 / V2-0046)

- Staging import and read-only validation may continue before the full
  operations package below is implemented. This is already true today
  (`V2-0044`, `V2-0047`).
- PR/PO/GR transactional write workflow implementation must wait until this
  operational readiness package (this doc + the other 4 under
  `docs/operations/`) is reviewed and accepted.
- Production cutover has a stricter bar: the readiness checks must be
  **implemented and verified** (e.g. an actual restore drill, an actual test
  alert reaching someone), not merely written down.

## Current real gaps (as of 2026-06-24)

- No Production Supabase project exists. Local/Preview/Development/Staging all
  point at the same staging project ref today — there is only one Supabase
  project in this repo's history so far.
- No rollback owner or alert recipient is named for any environment. This is
  an explicit open question below, not a default assumption.
- No monitoring tool is installed in any environment yet (see
  `docs/operations/monitoring-observability-plan.md`).
- No backup/PITR posture is configured beyond whatever Supabase's plan tier
  provides by default (not verified in this slice — verifying actual tier
  settings is part of `docs/operations/backup-dr-plan.md`'s future
  implementation step, not this documentation pass).

## Open Questions

- Who is the named rollback owner for Staging, and later for Production?
- Should a second, separate Supabase project be created now for future
  Production use, or only at first real cutover?
- Should Preview/Development deployments be password-protected (Vercel
  deployment protection) while they point at staging data with synthetic
  accounts only?
