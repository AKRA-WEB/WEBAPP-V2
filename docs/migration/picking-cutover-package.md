# Picking Cutover Package

Plan: `docs/plans/V2-0034-picking-cutover-package.md`
Generic template used: `docs/migration/cutover-checklist.md`
Status: **Prepared, not approved.** This package is the go/no-go input for the
user. No V1 production system has been changed and no production cutover has
happened.

## 1. What "cutover" means for Picking right now

Per `docs/migration/migration-plan.md` Phase 3 and ADR `0018`, the first
Picking cutover package does **not** import V1 `Requisition` history into V2.
"Cutover" here means: V2 Picking is judged ready (or not) to become the
**primary system for new Picking work**, while V1 Picking stays live and
unchanged as a read-only lookup for pre-cutover history. Full V1 retirement is
a later step (`V2-0022` Phase 11), not part of this package.

## 2. V1 history archive (decision board: "must document where operators can
   read old V1 records")

- V1 Picking (`C:\dev\WEBAPP\Picking`, GAS-backed Google Sheet `Requisition`)
  stays live and unmodified. This package does not touch it.
- After any future cutover, operators/admins who need a bill created before
  the cutover date continue to open the existing V1 Picking app/Sheet at its
  current URL — nothing about V1 access changes.
- V2 will only contain V2-created requisitions going forward
  (`legacy_source = "v2_app"` for real app-created rows;
  `legacy_source = "v2_fixture"` for the staging-only seed fixtures from
  `V2-0019`). Neither value means "imported V1 history."
- No reconciliation between a V1 row and a V2 row is possible or attempted,
  by design (ADR `0018`).

## 3. Data reconciliation (queried against staging on 2026-06-22)

**Review feedback (`Review: V2-0034`, 2026-06-22) correctly flagged that the
original version of this section used a one-off script that was written,
run, and deleted in the same session — the numbers below were asserted, not
reproducible.** Fixed: added `scripts/verify-picking-cutover-reconciliation.mjs`
(npm alias `picking:verify-cutover-reconciliation`), a read-only script
covering the same checks plus two the original ad hoc query didn't
explicitly assert (orphan `picking_requisition_lines`/`picking_requisition_events`,
and `problem_reported` events with no matching `picking_problem_reports`
row). The numbers below are reproducible by anyone with `DATABASE_URL` using
that script. Re-run on 2026-06-22 against the same staging database — numbers
below are unchanged:

Requisitions by `legacy_source` / `status`:

| legacy_source | status | count |
| --- | --- | --- |
| `v2_fixture` | `pending` | 1 |
| `v2_fixture` | `picked` | 1 |
| `v2_fixture` | `sent` | 1 |
| `v2_fixture` | `line_push_failed` | 1 |

Findings:

- **4 total requisitions in staging, all `v2_fixture`.** Zero rows with
  `legacy_source = "v2_app"` — confirms every browser-test requisition created
  during `V2-0020`/`V2-0023`/`V2-0025`/`V2-0027` verification was actually
  deleted afterward, as each slice's handoff claimed. This is real evidence,
  not a repeated claim.
- `picking_problem_reports`: **0 rows**. `picking_requisition_secrets`: **0
  rows**. Both clean.
- `picking_requisition_events` totals: `created` 4, `picked` 2, `sent` 1,
  `line_push_failed` 1, `problem_reported` 1 (9 rows total, matching the 4
  seeded fixtures' lifecycles from `scripts/picking-seed-staging-fixtures.mjs`).
- **Known pre-existing inconsistency, not a regression**: the seed script
  writes a `problem_reported` *event* for the `line_push_failed` fixture but
  never inserts a matching `picking_problem_reports` row. That fixture's
  detail page will show a `problem_reported` entry in the lifecycle timeline
  with no corresponding content in the "Problem reports" section. Low
  priority (seed-data-only, does not affect real create/report flow); leaving
  it as a known gap rather than fixing it as part of this docs-only package.

No real V1 Picking data has ever been imported into staging, by design (ADR
`0018`). There is nothing to reconcile against a V1 source for this module.

## 3a. Reference data freshness (ProductName / Staff) — gap found in review

**Review feedback correctly flagged a real gap**: section 3's reconciliation
only covers `picking_requisitions` and related tables. It says nothing about
whether the `catalog_product_aliases` (`source_app = 'picking'`) and
`picking_staff` rows imported once, back in `V2-0020` (2026-06-20), are still
an accurate picture of the live V1 `ProductName`/`Staff` sheets two days
later at cutover-decision time.

Re-ran `npm run picking:reference-import-dry-run` on 2026-06-22 against the
**same on-disk CSV snapshot** used by the original `V2-0020` import
(`import-data/Picking/Picking - ProductName.csv` /
`Picking - Staff.csv`, both last modified 2026-06-20 — i.e. no newer export
exists in this repo). Result: identical to the original import — 4761
product rows (4758 `matched_code`, 0 `matched_exact_name`, 3
`manual_review`), 1 staff row ("Chen"), **0 blockers, 2 warnings**:

1. 3 ProductName rows still need manual review (no code/name match in
   `catalog_products`) — known/accepted since `V2-0020`, unchanged.
2. Re-running the gated apply (`picking:reference-import-apply`) would
   delete-then-insert all 4761 existing `source_app = 'picking'` aliases —
   expected/idempotent-by-design behavior, not a new risk, but worth knowing
   before anyone runs apply again pre-cutover.

**What this does and does not prove:**

- It proves the snapshot file itself is being read consistently and the
  existing staging aliases/staff rows still match what was imported.
- It does **not** prove the live V1 Google Sheet hasn't changed since
  2026-06-20 — this repo cannot read the live V1 Sheet (no Google Sheets API
  access from here), only whatever CSV someone last exported.

**Required pre-cutover step (not yet done, blocks cutover approval on its
own)**: before actually approving Picking for production cutover, re-export
`Picking - ProductName.csv` and `Picking - Staff.csv` from the live V1
Sheet, drop the fresh files into `import-data/Picking/`, and re-run
`npm run picking:reference-import-dry-run`. Review any new `manual_review`
rows or staff changes before running
`npm run picking:reference-import-apply -- --confirm-picking-reference-import`
to bring staging current. This is a user/export action (no V1 write
involved, but does need someone with Sheet access to produce a fresh CSV) —
the agent cannot do this step alone.

## 4. UAT checklist

Per-slice role/browser verification already happened individually for
`V2-0019`, `V2-0020`, `V2-0023`, `V2-0025`, `V2-0027` (signed-out, `GUEST`,
`PICKING_READER`, `PICKING_WRITER`, `ADMIN`; 390px overflow checks; console
error checks) — see those plans and the archived work-log entries for detail.

**Gap**: every one of those checks was an agent-run, scripted Playwright pass
against synthetic test accounts, slice by slice. There has not yet been one
continuous UAT pass by an actual Picking staff member (or the user acting as
one), and the slices have never been exercised back-to-back in one session.

Recommended UAT script before approving cutover:

1. Sign in as `PICKING_WRITER` (or a real staff account once available).
2. Create a requisition via `/picking/new` with at least one catalog-matched
   line and one free-text line.
3. Confirm the LINE notification outcome shown in the timeline matches the
   current `PICKING_LINE_PUSH_ENABLED` setting (skipped by default).
4. Mark the bill picked, then sent, confirming buttons disappear/appear
   correctly at each step.
5. On a second bill, submit a problem report before marking it picked;
   confirm status stays `pending` and the report renders.
6. Attempt (and confirm rejection of) an out-of-order transition and a
   problem report on an already-`sent` bill.
7. Repeat steps 1-3 signed in as `PICKING_READER`; confirm no write actions
   are reachable but problem-report content is still readable.
8. Confirm zero horizontal overflow at a 390px width throughout.

This script has not been run yet as a single combined pass. Recommend running
it (ideally by the user or a real Picking staff member, not just the agent)
before treating Picking as cutover-approved.

## 5. Vercel Preview/Development verification — OPEN GATE, user action required

This is the one item in this package that cannot be closed by the agent
alone, for two independent reasons:

1. **Push state.** `git log origin/main..main` currently shows 2 unpushed
   local commits: `35897fd` (`V2-0028`, docs-only) and `86968b5` (`V2-0027`,
   Picking LINE notification/failure recovery code). The deployed
   Preview/Development build on Vercel was last built from `origin/main`
   **without** `V2-0027`, so the live deployed Picking detail page does not
   yet have the "Retry LINE notification" button or the
   `line_notification_sent`/`skipped` event types. Pushing is a shared-state
   action; per the open decision in `docs/plans/index.md` ("Open Decisions To
   Resolve Soon") about whether direct-to-`main` should continue, this is not
   pre-authorized and is not done as part of this package.
2. **Access.** The local `vercel` CLI is logged in as account `akra-web`,
   which only has access to team scope `buymoreth-erp-projects`. The real V2
   project lives under `akrapanich-3912s-projects/project-webapp-v2`, a
   different scope the CLI cannot reach (`vercel switch` fails with
   `scope_not_accessible`). Even after a push and auto-deploy, the agent has
   no way to open and click through the deployed Preview/Development URL.

**What this means**: nobody has exercised the create -> status -> problem ->
LINE-retry flow through an actual deployed Vercel build, only through local
dev against staging. Closing this gate needs the user to either:

- Authorize pushing `35897fd`/`86968b5` to `origin/main` and then personally
  open the resulting Preview/Development deployment to click through the UAT
  script in section 4, or
- Explicitly accept staging-only (local dev + direct DB) verification as
  sufficient for this cutover decision and defer deployed-build verification.

This package does not check this item off either way; it is named here as an
open decision for the user.

## 5a. Cutover runbook (execution steps) — blocker found in review

**Review feedback correctly flagged a blocker**: this package said V2 would
become the primary system, but never wrote down the actual mechanical steps
to make that switch happen. Adding them here. None of these steps have been
executed — this section is the runbook to follow **only after** the user
approves cutover, not a report of work already done.

1. **Pause/redirect V1 writes for Picking — business action, outside this
   repo's authority.** V1 Picking is a live GAS-backed Google Sheet app this
   V2 repo is not allowed to modify (`AGENTS.md` Section 1; only an explicit
   user-approved production-V1 task could change it). V2 has no technical
   mechanism to disable V1. The realistic mechanism is operational, not
   code: the user/business owner tells Picking staff to stop creating new
   bills in V1 as of the cutover date/time and start using V2 instead. This
   step is a **user/business action**, not something the agent can do.
2. **Enable the V2 production route.** Current state (`V2-0014`): Vercel
   Production is intentionally disconnected from the staging Supabase
   project — no Picking-specific production env work has been done. Before
   go-live:
   - Decide whether Production points at the same staging Supabase project
     or a separate production-grade project (open question, not resolved by
     this package).
   - Add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     / `SUPABASE_SECRET_KEY` to the Vercel **Production** environment scope
     (currently only set for Preview/Development per `V2-0014`).
   - Push `main` to trigger a Production deployment, then verify it the same
     way Preview/Development verification in section 5 was supposed to
     happen (sign-in, `/picking` list/detail, create → pick → send →
     problem → LINE-retry).
   - Decide whether Production should stay access-restricted (e.g. Vercel
     deployment protection) until the announcement step below happens.
3. **Notify users.** Give real Picking staff the V2 production URL, sign-in
   instructions/credentials (real staff accounts do not exist yet — only
   synthetic `@akra-v2.test` test accounts; provisioning real staff accounts
   is a separate, not-yet-done step), the cutover date/time, and a contact
   for issues during the transition window.
4. **Rollback if needed.** See section 7 — V1 stays untouched and is the
   fallback; rolling back means redirecting staff back to V1 and leaving V2
   data in place for review, not a data restore.

## 6. Filled cutover checklist

Using `docs/migration/cutover-checklist.md` as the template:

### Planning

- [x] Module owner and scope identified — Picking, decision board "Recommended Next Move."
- [x] V1 source files and GAS actions inventoried — `docs/migration/picking-v1-mapping.md`.
- [x] Sheets/tabs and columns mapped — same file, `ProductName`/`Staff`/`Requisition`.
- [x] Permission keys mapped — `picking.read` / `picking.write`.
- [x] LINE notification behavior documented — `V2-0027`, ADR `0018`.
- [x] Known V1 quirks listed — `picking-v1-mapping.md` Status/Workflow sections.

### Data

- [x] Staging import completed — N/A by design; V1 history intentionally not imported (ADR `0018`). Reference data (`ProductName` aliases, `Staff`) was imported under `V2-0020`.
- [x] Row counts reconciled — section 3 above, reproducible via
  `npm run picking:verify-cutover-reconciliation`.
- [x] Required IDs validated — 0 orphan lines, 0 orphan events (FK-enforced,
  but asserted directly rather than assumed from the schema).
- [ ] Dates and numeric values normalized — N/A, no V1 history rows exist to normalize.
- [x] Legacy references preserved — `legacy_source`/`legacy_uid` columns in place.
- [x] Duplicate or malformed records reviewed — none found; only the 4 known seed fixtures exist.
- [ ] Reference data (`ProductName`/`Staff`) re-verified fresh against the
  live V1 Sheet immediately before cutover — see section 3a; only the
  2026-06-20 snapshot has been checked so far, not a fresh export.

### App Behavior

- [x] Core happy paths verified — create, pick, send, problem report, LINE retry (each slice's handoff).
- [x] Edge cases from V1 handoff verified — out-of-order transition rejected, `sent`-blocks-problem-report, resubmission additive not overwrite, LINE failure non-blocking.
- [x] Permission allow/deny behavior verified — signed-out/guest/reader/writer/admin matrix, every slice.
- [x] Mobile layout verified for primary workflows — 390px, zero overflow, every slice (two real overflow regressions were found and fixed along the way).
- [x] No secrets exposed to client code — admin/service-role client is server-only; LINE token/group id are server env only.
- [ ] **Combined single-session UAT pass** — not yet run; see section 4.

### Database Security

- [x] RLS enabled where applicable — all Picking tables, migrations `0004`/`0005`.
- [x] Policies reviewed — `picking.read`/`picking.write` select policies confirmed working via `PICKING_READER` browser checks in `V2-0019`/`V2-0025`.
- [x] Required grants reviewed — service-role-only execute on all Picking RPCs (ADR `0015`).
- [x] Privileged operations are server-side — `createAdminClient()` only inside server actions, guarded by `requirePermission()`.
- [ ] Audit logs capture sensitive mutations — `picking_requisition_events` covers Picking-specific lifecycle audit, but Picking mutations do **not** also write to the shared `public.audit_logs` table used by core/admin. Known gap, not blocking for this module (the events table already serves the same purpose for Picking specifically); flagged for the Phase 11 hardening pass.

### Deployment

- [ ] Vercel Preview verified — **open, see section 5.**
- [x] Supabase staging verified — `npm run check:migrations` and `npm run db:verify-staging-schema` pass after every migration in this module (`0004`, `0005`, `0009`, `0010`, `0011`, `0012`).
- [ ] Production env vars prepared — **not done, intentionally.** Vercel
  Production remains disconnected from staging per `V2-0014`; no
  Picking-specific production env work exists yet. See runbook step 2,
  section 5a, for what this actually requires before cutover. (Review
  feedback, round 2: this line previously read `[x] ... but not exposed`,
  which contradicted section 5a/the "Cutover" checklist below — corrected.)
- [x] Rollback path documented — section 7 below.
- [ ] User approval received — **this package is the request for that approval; not yet given.**

### Cutover

- [ ] V1 writes paused or redirected for the module — not done; runbook step 1 in section 5a (business/user action, outside this repo's authority).
- [ ] V2 production route enabled — not done; runbook step 2 in section 5a (env vars, push, deploy, verify).
- [x] Smoke test completed — staging-only, repeated across every slice.
- [x] Handoff updated — this package + plan index + current-state + work-log.
- [x] V1 module status documented as read-only/archive — section 2 above.

## 7. Rollback plan

No production cutover has happened, so there is nothing in production to roll
back yet. This section documents the rollback posture for **if/when** a
production cutover is approved later:

- V1 Picking's URL, GAS deployment, and Sheet are never modified by V2 work,
  so V1 remains a working fallback at all times — rollback is "send users back
  to the existing V1 URL," not a data restore.
- V2 never writes into V1 Sheets, so a V2-side rollback cannot corrupt V1 data.
- If a future production cutover needs to be reversed: disable/hide the V2
  Picking entry point on Main, resume directing staff to the V1 Picking URL,
  and leave V2's Picking data in place (do not delete) for post-incident
  review.
- Real LINE sends remain unproven (no staging credentials) — do not enable
  `PICKING_LINE_PUSH_ENABLED` in any production environment until a real send
  has been explicitly tested and approved, independent of this cutover
  decision.

## 8. Explicit approval gate

This package is **not** a claim that Picking is ready to go live. It is the
evidence set for the user to decide. Summary:

**Verified (staging, local dev, agent-run):**

- Create, status transitions, problem reporting, LINE dry-run/failure/retry —
  all implemented, RPC-smoke-tested, and browser-verified per role.
- Staging data is clean (section 3) — no leftover test rows, no malformed
  records.
- Security posture (RLS, grants, server-only privileged calls) reviewed.

**Open / not yet done:**

- Deployed Vercel Preview/Development verification (section 5) — needs a push
  authorization decision plus the user personally exercising the deployed
  build (CLI/account access gap).
- One combined, human-run UAT pass (section 4) rather than per-slice automated
  checks only.
- A fresh reference-data export/re-check against the live V1 Sheet (section
  3a) — only a 2026-06-20 snapshot has been verified so far.
- The cutover runbook itself (section 5a) — pausing/redirecting V1, enabling
  the V2 production route, and notifying real users are all undone; real
  staff Supabase Auth accounts don't exist yet either (only synthetic test
  accounts).
- Real LINE send test — explicitly deferred per ADR `0018`/`V2-0027`, not a
  blocker for this package, but should not be treated as "done."

**Resolved since first prepared** (per `Review: V2-0034` feedback,
2026-06-22): data-reconciliation evidence (section 3) is now backed by a
re-runnable script (`npm run picking:verify-cutover-reconciliation`) instead
of a deleted one-off query.

**Decision needed from the user:** approve Picking as ready for a future
production cutover once the open items above close, hold for more
verification, or explicitly accept staging/local verification as sufficient
and proceed anyway. No code, schema, or production state changes until that
decision is made.
