# Plan V2-0047: PR/PO/GR Read-Only List/Detail UI (Purchasing PO, Receiving GR)

Status: Complete - executed 2026-06-24

Architect command:

```text
Read-only /purchasing//receiving list/detail UI — not gated by V2-0046.
```

## 1. Goal

- Primary objective: replace the `/purchasing` and `/receiving` guarded
  placeholders with the first permission-gated read-only V2 routes over the
  PO/GR data already imported in `V2-0044`.
- Success definition: `/purchasing` shows a recent PO list (or empty state)
  and `/purchasing/[id]` shows PO header + lines; `/receiving` shows a recent
  GR list (or empty state) and `/receiving/[id]` shows GR header + lines +
  location splits; denied users cannot read purchasing/receiving operational
  data; legacy-synthesized `po_number` values are never shown as if they were
  real V1-issued numbers.
- User/business reason: prove the read path against real imported staging
  rows (253 PO headers/748 lines, 588 GR headers/1868 lines/6 splits) before
  any write workflow, which `V2-0046`/ADR `0025` explicitly defers. This
  mirrors the `V2-0019` Picking read-only pilot precedent: read-only first,
  writes later.

## 2. Requirement And Scope Definition

### Problem

- V2 has PO/GR staging data (`V2-0044`) and locked schema/RLS (`0013`), but
  `/purchasing` and `/receiving` are still the shared `ModuleLandingPage`
  placeholder (guarded since `V2-0041`, but no real data is rendered).
- Starting with writes would combine UI, validation, and the still-unapproved
  operational-readiness gate (`V2-0046`/ADR `0025`) in one risky slice. This
  plan only reads existing rows; it issues no `insert`/`update`/`delete`.

### Users

- Primary users: purchasing/receiving readers and writers checking PO/GR
  history.
- Secondary users: supervisors/admins validating the data import (`V2-0044`)
  rendered correctly end to end, not just via SQL checks.
- Admin/support users: maintainers preparing the ground for a future write
  slice once `V2-0046` is approved.

### MVP Features

- Permission-gated `/purchasing` route (PO list) and `/receiving` route (GR
  list), each capped to a recent-N window like Picking's `RECENT_LIST_LIMIT`.
- Status-count summary panel per list (mirrors Picking's `statusSummary`).
- `/purchasing/[id]` detail: PO header (vendor, warehouse, dates, status,
  bill identity) + ordered lines (product, qty, unit, remark, `match_status`,
  `pr_number_label` manual-review breadcrumb when present).
- `/receiving/[id]` detail: GR header (linked PO if any, dates, receiver,
  status, remark, lift-fee summary) + lines (product, received qty, unit,
  expiry, location summary, `match_status`) + each line's
  `receiving_line_splits` rows.
- Orphan-safe rendering: GR header with no `purchase_order_id` and GR lines
  with no `purchase_order_line_id` render a clear "no linked PO" note instead
  of a broken link or `notFound()`.
- Legacy `po_number` display rule (ADR `0026`): when `po_number` starts with
  `LEGACY-`, show a small caption explaining it is a synthesized identifier,
  not a real V1 PO number; otherwise show the value as-is.
- Clear empty, error, not-configured, signed-out, and access-denied states
  (reuse `AccessDenied`/`StatusPill`/`AppShell`, same as Picking).
- Compact mobile-friendly layout (same CSS classes/pattern as Picking's
  `requisition-list`/`requisition-row`, renamed for this module or shared).

### Nice-To-Have Features

- Date/status/vendor filters, search by PO/GR number or product.
- Cross-linking from a GR line back to its resolved PO line detail anchor.
- PR list/detail (current PR source has 0 imported rows — no real data to
  show yet; revisit once a non-empty PR export is imported and proven, same
  "typed but unproven" posture noted in `V2-0044`'s handoff).
- Vendor lead-time or APV reporting views.

### Out Of Scope

- Any write action (create/edit/close/confirm/recall/reset). Blocked by
  `V2-0046`/ADR `0025` until the operational-readiness package is approved.
- PR list/detail UI (no real data yet; see Nice-To-Have).
- Changing V1 Purchasing/Receiving Sheets, GAS backend, GitHub Pages,
  live URLs, or LINE tokens.
- Schema or migration changes — `0013`/`0014` already cover every field this
  slice reads.
- Re-running or modifying the import scripts (`V2-0044` already verified
  16/16 checks twice).
- Touching `/warehouse`, `/returns`, `/kpi` — they stay on the
  `ModuleLandingPage` placeholder guarded by `V2-0041`.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router server components, existing `AppShell`/
  `StatusPill`/`AccessDenied` components and `globals.css` patterns.
- Backend/server boundary: server-only read helpers under
  `src/modules/purchasing/` and `src/modules/receiving/`, each with their own
  `read-model.ts` + `format.ts` (matches the README boundary files already
  committed in `V2-0045`).
- Database: Supabase/Postgres staging tables from `0013`/`0014`, already
  populated by `V2-0044`. No new tables/columns.
- Auth/permissions: page-level
  `requirePermission({ anyOf: ["purchasing.read", "purchasing.write"] })` for
  `/purchasing*`, and the `receiving.*` equivalent for `/receiving*` — the
  same pattern `src/app/picking/page.tsx` uses today, **not**
  `ModuleLandingPage`'s single-permission-field check.
- Deployment: V2 local/Preview/Development only; no V1 cutover, no production
  impact.

### Data Model / Schema

- Tables read (all already exist, no migration needed):
  - `public.purchasing_purchase_orders`, `public.purchasing_purchase_order_lines`
  - `public.purchasing_events` (for the `po_imported` event per header, shown
    as a minimal one-row "Imported" timeline entry, same idea as Picking's
    lifecycle events but with real content only — no fabricated history)
  - `public.receiving_goods_receipts`, `public.receiving_goods_receipt_lines`,
    `public.receiving_line_splits`
  - `public.receiving_events` (for the `gr_imported` event per header)
- Important fields:
  - PO header: `po_number`, `po_date`/`raw_po_date`, `vendor_id`→
    `catalog_vendors.name`, `warehouse_id`→`warehouse_warehouses`, `status`,
    `bill_identity_kind`, `legacy_group_key`, `is_direct`,
    `is_legacy_ambiguous`.
  - PO line: `line_no`, `raw_product_name` (+ resolved `catalog_product_id`
    name when present), `ordered_qty`, `unit`, `remark`, `pr_number_label`,
    `match_status`, `status`.
  - GR header: `purchase_order_id` (nullable), `receipt_date`/`ata_date`,
    `receiver_name`, `status`, `remark`, `lift_fee_summary`,
    `legacy_group_key`.
  - GR line: `purchase_order_line_id` (nullable), `raw_product_name`,
    `received_qty`, `unit`, `old_qty`, `expiry_date`/`date_parse_status`,
    `location_summary`, `is_extra_item`, `match_status`.
  - Split: `split_no`, `warehouse_key`, `raw_location`, `floor`, `zone`,
    `qty`, `unit`.
- Relationships: one PO has many lines; one GR optionally links to one PO and
  has many lines; one GR line optionally links to one PO line and has many
  splits.
- Constraints: read-only in this slice — do not add `insert`/`update`/
  `delete` paths, even behind a guard, since `V2-0046` is not yet approved.
- RLS/security notes:
  - Use the normal authenticated Supabase server client (not
    `createAdminClient()`), so the real RLS select policies stay part of the
    verification path, exactly like Picking's `read-model.ts`.
  - The `0013` select policies already allow either `purchasing.*` or
    `receiving.*` permission holders to read both PO and GR tables (cross-read
    by design — see the migration's policy definitions). The **app-level**
    page guard still gates `/purchasing` on `purchasing.read`/`.write` and
    `/receiving` on `receiving.read`/`.write` to keep the module entry points
    aligned with `public.apps.required_permission`.
  - **Real gap found while planning, to fix during this slice:**
    `ModuleLandingPage` (used by the current placeholders) checks only the
    single `app.requiredPermission` value (`purchasing.read` /
    `receiving.read`). But the real V1 import (`V2-0009`) only granted
    `purchasing.write`/`receiving.write` to `ADMIN`/`SUPERVISOR`/`AKRA`/
    `WAREHOUSE` — **no role currently holds the `.read` variant** (noted
    already in `V2-0036`'s handoff). That means today, a non-ADMIN role with
    only `purchasing.write` is incorrectly denied on `/purchasing`. Switching
    to `anyOf: ["purchasing.read", "purchasing.write"]` at the page level
    (the Picking pattern) fixes this incidentally, the same way `V2-0023`
    fixed a real PL/pgSQL bug found during an unrelated slice.

### Integration Points

- V1 references: `docs/migration/pr-po-gr-v1-mapping.md` and
  `docs/database/schema-catalog.md` as behavior/shape references only.
- Supabase: read operational PO/GR tables through the SSR client/RLS.
- Vercel: Preview/Development only.
- LINE/GAS/Sheets/API: no integration in this slice.
- Secrets/env vars: none new; no service-role usage in route/page code.

## 4. UI/UX And User Flow

### User Flow

1. User signs in.
2. User opens `/purchasing` (or `/receiving`).
3. Server checks `purchasing.read`/`.write` (or `receiving.read`/`.write`).
4. If denied, render the shared `AccessDenied` state.
5. If allowed, server queries recent PO (or GR) headers and renders the list
   with a status-count summary.
6. User opens a PO (or GR) detail.
7. Detail page renders header, resolved vendor/warehouse/PO-link names, lines,
   and (for GR lines) location splits.

### Screens / States

- Screen: `/purchasing`
  - module header, status-count summary, responsive list of recent PO bills
    (label, status, vendor, line count, date).
  - no create action (out of scope this slice).
- Screen: `/purchasing/[id]`
  - PO label (using the ADR-`0026` legacy-number display rule), status,
    vendor, warehouse, dates, bill-identity note when `is_legacy_ambiguous`.
  - lines table: product, qty/unit, remark, manual-review breadcrumb when
    `pr_number_label` is set.
  - minimal "Imported" event row from `purchasing_events`.
- Screen: `/receiving`
  - module header, status-count summary, responsive list of recent GR
    headers (linked PO label or "No linked PO", status, receiver, line count,
    date).
- Screen: `/receiving/[id]`
  - GR header, linked PO link (when `purchase_order_id` is set) or an
    explicit "No linked PO (orphan import row)" note, receiver, dates,
    remark, lift-fee summary when non-empty.
  - lines table: product, received qty/unit, expiry (or placeholder/
    epoch-artifact/malformed note per `date_parse_status`), location summary,
    extra-item marker, splits sub-list per line.
- Empty state: no PO/GR rows match (should not happen post-`V2-0044`, but
  keep the same defensive empty state Picking uses).
- Loading state: server-rendered, no client auth flicker.
- Error state: compact operational error, no internal/secret detail.
- Permission-denied state: shared `AccessDenied` component.
- Mobile behavior: zero horizontal overflow at 390px, same bar Picking's
  slices were held to.

### System Logic / Pseudocode

```text
guard = requirePermission(anyOf: ["purchasing.read", "purchasing.write"])
if guard denied: render AccessDenied

list = read recent purchasing_purchase_orders (+ line count, + vendor name)
render list with status summary

detail = read purchasing_purchase_orders by id (+ vendor/warehouse names)
if not found: render not found
lines = read purchasing_purchase_order_lines for id, ordered by line_no
events = read purchasing_events for id
render detail, applying the LEGACY- po_number display rule

# mirror the same shape for receiving_goods_receipts / _lines / line_splits,
# with purchase_order_id / purchase_order_line_id treated as optional
```

## 5. Task Breakdown

1. Add `src/modules/purchasing/read-model.ts` (list + detail queries,
   resolving vendor/warehouse display names) and
   `src/modules/purchasing/format.ts` (status labels/tones, bill label with
   the ADR-`0026` legacy-number rule, date/qty formatters — reuse Picking's
   formatter shapes where the logic is identical).
2. Replace `src/app/purchasing/page.tsx` (drop `ModuleLandingPage`) with the
   guarded list; add `src/app/purchasing/[id]/page.tsx` guarded detail route.
3. Add `src/modules/receiving/read-model.ts` (list + detail + splits queries,
   resolving linked PO label when present) and
   `src/modules/receiving/format.ts`.
4. Replace `src/app/receiving/page.tsx` with the guarded list; add
   `src/app/receiving/[id]/page.tsx` guarded detail route.
5. Remove the now-dead `purchasing`/`receiving` entries from
   `moduleNotes` in `src/modules/core/module-landing-page.tsx` (only
   `warehouse`/`returns`/`kpi` still use that shared placeholder).
6. Update `src/modules/purchasing/README.md`, `src/modules/receiving/README.md`,
   and `src/modules/README.md`'s status table to reflect the new read-only
   implementation.
7. Verify admin, a `purchasing.write`-only role (e.g. `SUPERVISOR`), a
   `receiving.write`-only role, a no-permission role, and signed-out
   behavior on all 4 new routes.
8. Verify desktop and mobile (390px) rendering on both list and detail
   screens, including the orphan-GR and legacy-`po_number` display cases
   using real imported rows (not synthetic fixtures — staging already has
   real PO/GR data from `V2-0044`).
9. Update handoff docs with results and next action.

## 6. Files Expected To Change

- `src/app/purchasing/page.tsx`
- `src/app/purchasing/[id]/page.tsx`
- `src/modules/purchasing/read-model.ts`
- `src/modules/purchasing/format.ts`
- `src/modules/purchasing/README.md`
- `src/app/receiving/page.tsx`
- `src/app/receiving/[id]/page.tsx`
- `src/modules/receiving/read-model.ts`
- `src/modules/receiving/format.ts`
- `src/modules/receiving/README.md`
- `src/modules/core/module-landing-page.tsx` (drop dead `moduleNotes` entries)
- `src/modules/README.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- Possibly `src/app/globals.css` if PO/GR list/detail need a new class beyond
  what Picking's classes already cover (reuse first, add only if needed).

## 7. Verification Steps

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Browser check `/purchasing` and `/receiving` signed in as ADMIN.
- Browser check both routes as a `purchasing.write`-only / `receiving.write`-
  only role (confirms the `anyOf` fix from the RLS/security note above) and
  as a no-permission role (denied).
- Browser check signed-out route behavior on all 4 routes.
- Browser check `/purchasing/[id]` and `/receiving/[id]` at desktop and 390px
  mobile width, including one legacy-`po_number` PO and one orphan-`Ref_PO_UID`
  GR (both exist in the real imported staging data).
- Confirm no write call (`insert`/`update`/`delete`, RPC, or
  `createAdminClient()`) was added anywhere in this slice.

## 8. Rollback / No-Production-Impact Note

This plan affects only V2 docs now and, when executed, V2 app routes/module
files reading existing staging rows. No schema, migration, or data changes;
no V1 production files, GAS deployments, Sheets, GitHub Pages, live URLs, or
LINE tokens are touched. Rollback for the execution slice is to revert the
route/module file changes — no data to delete, since this slice performs no
writes.

## 9. Open Questions

- Should `/purchasing` and `/receiving` list views show **all** recent rows
  capped like Picking's 50, or a smaller default given 253/588 headers
  exist? Recommended: same cap (50), newest first by `po_date`/
  `receipt_date`, consistent with Picking's precedent.
- Should the GR detail's `lift_fee_summary` (jsonb) get a dedicated rendered
  section now, or just a raw/compact note until a future slice needs it
  formatted? Recommended: compact note now (e.g. key/value pairs), full
  formatting deferred — avoid over-building a feature with no current user
  story.

## 10. Handoff Notes

- Executed 2026-06-24 (`Go: to execute task breakdown items 1-9`).
  - Added `src/modules/purchasing/{read-model,format}.ts` and
    `src/modules/receiving/{read-model,format}.ts`; replaced
    `ModuleLandingPage` on `/purchasing`/`/receiving` with guarded list pages
    and added `/purchasing/[id]`/`/receiving/[id]` detail pages, mirroring
    `V2-0019`'s shape exactly (own read-model/format per module, normal
    authenticated client, no writes).
  - Confirmed the planned `.read`-vs-`.write` gap is real (`SUPERVISOR` holds
    `purchasing.write`+`receiving.write`, no `.read`; `WAREHOUSE` holds only
    `receiving.write`, not `purchasing.write` — narrower than the plan's
    "ADMIN/SUPERVISOR/AKRA/WAREHOUSE all hold both" assumption) and fixed it
    by using `anyOf: [".read", ".write"]` at the page level on both new
    routes, the same pattern `src/app/picking/page.tsx` already uses.
  - Removed the now-dead `purchasing`/`receiving` entries from
    `moduleNotes` in `src/modules/core/module-landing-page.tsx`; updated
    `src/modules/purchasing/README.md`, `src/modules/receiving/README.md`,
    and `src/modules/README.md`'s status table.
  - Verified end to end against the real running app (not just direct DB
    calls) with a temporary local Playwright install (removed after, same
    pattern as every prior slice): signed-out denied on both routes; a
    synthetic `GUEST` account denied on both; a synthetic `SUPERVISOR`-role
    account (`purchasing.write`+`receiving.write`, no `.read`) **allowed** on
    both list and detail pages — the `anyOf` fix proven, not just
    code-reviewed; a synthetic `ADMIN` account allowed on both. Confirmed
    against real imported rows: a `LEGACY-`-prefixed PO shows the
    ADR-`0026` synthesized-identifier caption; the ADR-`0022` PR-derived PO
    shows the manual-review note; an orphan GR (`purchase_order_id is null`)
    shows the "no linked PO (orphan import row)" note. Zero horizontal
    overflow at 390px on all 4 routes; zero browser console errors.
  - Two auto-mode classifier blocks occurred during verification prep: an
    ad-hoc real-V1-user password reset (blocked — touches a real person's
    account without it being named) and an ad-hoc password reset on existing
    synthetic accounts bypassing the repo's `--confirm-flag`/project-ref-check
    convention (blocked — wrong write pattern). Resolved by using the
    already-committed, already-precedented `scripts/create-test-account.mjs`
    to create 4 new synthetic `v2047-*@akra-v2.test` accounts
    (`ADMIN`/`GUEST`/`WAREHOUSE`/`SUPERVISOR`) instead, then deleting all 4
    via the service-role Admin API after verification. No real V1 user
    account was touched; no password reset on any existing account.
  - `lint`, `typecheck`, `build`, `git diff --check` all pass. No schema,
    migration, staging data writes (read-only test-account create/delete via
    Supabase Auth Admin API only), V1 production files, or secrets changed.
- Next action: no further work required for this slice. The next PR/PO/GR
  step is either `V2-0046` tasks 1-5 (operational readiness, before any
  write workflow) or a real PR import once a non-empty PR export exists.
- Blockers: none.
- Related plans: `V2-0019` (the read-only pattern this mirrors), `V2-0036`,
  `V2-0040`, `V2-0044`, `V2-0045`, `V2-0046`.
- Related ADRs: `0012` (read-only-first precedent), `0020`, `0022`, `0023`,
  `0025`, `0026`.
