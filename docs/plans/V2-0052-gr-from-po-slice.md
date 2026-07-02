# Plan V2-0052: GR From PO Slice

Status: Complete (2026-07-02).

Architect command:

```text
Architect: V2-0052 GR-from-PO slice
```

## 1. Goal

- Primary objective: add the next PR/PO/GR write-workflow slice after
  `V2-0051`: create a V2-native Goods Receipt (GR) from one V2-native PO
  (status `po_pending_receipt`) in one atomic server-side transaction.
- Success definition: a signed-in user with `receiving.write` can open a
  `po_pending_receipt` PO, enter received quantities for each PO line, submit
  the create-GR action, and land on a GR detail page whose header, lines, PO
  linkage, and event history are correct. POs in other statuses and duplicate
  guards are handled cleanly. The PO detail page shows all linked GRs.
- User/business reason: POs created from approved PRs (`V2-0051`) need a
  controlled receiving step before APV/closeout can be planned; GR creation
  is the natural next workflow action in the PR → PO → GR chain.

## 2. Requirement And Scope Definition

### Problem

- `V2-0051` creates POs from approved PRs, but there is no V2 workflow action
  that records receipt of goods against a PO.
- V1's GR workflow records received quantities, receipt dates, and warehouse
  locations per PO line; V2 needs a normalized, auditable, and atomic GR
  creation slice before APV, PO closeout, or production UAT is meaningful.
- The grouped PR → PO → GR staged cutover (`V2-0039` / ADR `0021`) requires
  an end-to-end staging UAT covering all three write steps; GR creation is the
  missing third step.

### Users

- Primary users: receiving staff who log goods receipt against an existing PO.
- Secondary users: purchasing users and supervisors who need to see which GRs
  have been created against a PO.
- Admin/support users: maintainers verifying transaction safety, event history,
  and permission behavior before PR/PO/GR cutover.

### MVP Features

- Add one service-role-only RPC:
  `public.create_goods_receipt_from_order(...)`.
- Use the same public-schema, default `SECURITY INVOKER`, service-role-only
  posture as `V2-0049`, `V2-0050`, `V2-0051` (ADR `0015`).
- Allow GR creation only from `po_pending_receipt` POs.
- Copy all PO lines into the GR as GR lines, with user-entered `received_qty`
  per line. Lines with `received_qty = 0` in the submission are skipped
  (not inserted), keeping GRs meaningful.
- Require at least one line with `received_qty > 0` before insertion.
- Do not add a `receipt_number` column in this slice — GR is identified by
  its UUID, receipt_date, and linked PO number for display (see Open
  Questions for the deferred V2-GR-YYYYMMDD-NNNN format).
- Keep MVP authorization on the existing `receiving.write` permission; do not
  introduce a new `receiving.approve` or `receiving.receive` permission.
- Insert:
  - one `receiving_goods_receipts` header (status `gr_draft`,
    `legacy_source = 'v2_app'`, `purchase_order_id` set);
  - one `receiving_goods_receipt_lines` row per non-zero submitted PO line
    (copying product name/sku/catalog IDs/unit, setting
    `purchase_order_line_id`);
  - one `receiving_events` row with `event_type = 'gr_created_from_po'`.
- Allow multiple GRs per PO (partial delivery). Do not block the second GR on
  a PO in this slice.
- Do not change PO status after GR creation in this slice (PO stays
  `po_pending_receipt`; PO close/APV is deferred).
- Widen `receiving_events_type_check` to add `gr_created_from_po` (same
  "widen-constraint pattern" used in migration `0014`).
- Add a guarded create-GR path from `/purchasing/[id]`:
  - if PO status is `po_pending_receipt` and user has `receiving.write`, show
    a "Create GR" action;
  - show all linked GRs on the PO detail page (readable by both
    `purchasing.*` and `receiving.*` per existing 0013 RLS policy — no RLS
    change needed).
- Align page-level route guards with the existing 0013 cross-module read
  policies:
  - `/purchasing/[id]` must allow `purchasing.read/write` **or**
    `receiving.read/write`, because receiving users need to open the PO before
    creating a GR;
  - `/receiving/[id]` must allow `receiving.read/write` **or**
    `purchasing.read/write`, because purchasing users need to follow linked GRs
    from PO detail.
- Redirect to the existing GR detail route (`/receiving/[grId]`) after
  successful creation.

### Nice-To-Have Features

- Human-readable `receipt_number` column (`V2-GR-YYYYMMDD-NNNN` format,
  similar to `po_number` in `V2-0051`). Requires a schema column + allocation
  lock in the RPC; defer to a follow-up slice once the basic create flow is
  verified.
- Warehouse/location entry on GR lines or splits.
- Expiry date entry per GR line.
- ATA date entry on GR header.
- Over-receive block (validate `received_qty ≤ ordered_qty`).
- GR status transitions (`gr_draft → gr_pending_review → gr_confirmed`,
  recall, reset).
- LINE notifications for GR creation.
- PO status update to `po_closed_apv_ready` after all lines received.

### Out Of Scope

- GR status transitions (review/confirm/recall/reset).
- PO close or APV marking.
- Direct GR creation without a PO.
- Warehouse split-level entries (`receiving_line_splits`).
- Editing existing GR headers or lines.
- Over-receive validation.
- Updating V1 Google Sheets, GAS deployments, LINE tokens, or live URLs.
- Production cutover or grouped PR/PO/GR release approval.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, extending the existing purchasing/receiving
  routes.
- Backend/server boundary: server action guarded by `requirePermission()`,
  then service-role Supabase RPC via `createAdminClient()`.
- Database: one new migration under `supabase/migrations`.
- Auth/permissions: existing `receiving.write` for GR creation. Route guards
  must mirror 0013 RLS for cross-module reads: PO detail is readable by
  `purchasing.*` or `receiving.*`; GR detail is readable by `receiving.*` or
  `purchasing.*`.
- Deployment: staging/local/Preview/Development only; production remains gated
  by readiness task 7, grouped PR/PO/GR UAT, and explicit user approval.

### Data Model / Schema

- Tables read:
  - `public.purchasing_purchase_orders`
  - `public.purchasing_purchase_order_lines`
  - `public.profiles` (actor lookup)
- Tables written:
  - `public.receiving_goods_receipts`
  - `public.receiving_goods_receipt_lines`
  - `public.receiving_events`
- Constraint widened:
  - `receiving_events_type_check` — add `'gr_created_from_po'`
- GR header fields (MVP):
  - `purchase_order_id`: the source PO's `id`;
  - `receipt_date`: submitted date (defaulted to Bangkok today in the form);
  - `receiver_profile_id`, `receiver_name`: the acting user;
  - `status`: `'gr_draft'`;
  - `raw_status`: `'V2 Draft'`;
  - `legacy_source`: `'v2_app'`;
  - `metadata`: `{po_id, po_number, remark}` where `po_number` is copied at
    create time for display convenience.
- GR line fields (per submitted PO line with `received_qty > 0`):
  - `goods_receipt_id`: FK to the new GR header;
  - `purchase_order_line_id`: FK to the source PO line;
  - `catalog_product_id`, `catalog_alias_id`: copied from PO line;
  - `raw_sku`: copied from PO line;
  - `raw_product_name`: copied from PO line;
  - `received_qty`: user-entered value;
  - `unit`: copied from PO line (user may not override unit in MVP);
  - `match_status`: copied from PO line;
  - `is_extra_item`: `false` for MVP (extra-item flag is V1 import-only).
- GR event fields:
  - `goods_receipt_id`: FK to new GR;
  - `event_type`: `'gr_created_from_po'`;
  - `actor_profile_id`, `actor_name`: acting user.
- RLS/security notes:
  - do not add authenticated insert/update/delete policies;
  - `receiving_goods_receipts` readable by `receiving.*` or `purchasing.*`
    already (0013 policy `receiving_goods_receipts_select_permission`);
  - `purchasing_purchase_orders` and lines readable by `purchasing.*` or
    `receiving.*` already (0013 policies
    `purchasing_purchase_orders_select_permission` and
    `purchasing_purchase_order_lines_select_permission`);
  - no new RLS policies needed;
  - `EXECUTE` revoked from `public`, `anon`, and `authenticated`, granted
    only to `service_role` (ADR `0015`);
  - keep the function default `SECURITY INVOKER`.

### RPC Signature

```sql
create or replace function public.create_goods_receipt_from_order(
  p_purchase_order_id  uuid,
  p_actor_profile_id   uuid,
  p_actor_name         text,
  p_receipt_date       date,
  p_line_quantities    jsonb,   -- [{po_line_id: uuid, received_qty: numeric}]
  p_remark             text default null
) returns uuid  -- gr_id
language plpgsql
as $$
...
$$;
```

Returning a plain `uuid` (not `RETURNS TABLE`) avoids the column-ambiguity
issue found in `V2-0051`'s `po_number` OUT-param conflict.

### Integration Points

- V1 references: V1 GR records received quantities, receipt dates, and
  warehouse locations; V2 preserves PO-line linkage through
  `purchase_order_line_id`, catalog IDs, and raw product names.
- Supabase: official Supabase docs/changelog were rechecked during the
  2026-07-02 architect review for RPC, RLS, grants, and function-security
  guidance. The April 2026 Data API change makes explicit `GRANT` statements
  more important; this plan already follows the repository's explicit
  grant/revoke posture and ADR `0015` service-role-only RPC pattern. Recheck
  again at implementation time if Supabase guidance has changed.
- Vercel: no new environment variables or deployment settings.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: no new secrets.

## 4. UI/UX And User Flow

### User Flow

1. User signs in and opens `/purchasing/[id]` (PO detail).
2. Server renders the PO detail if the user has `purchasing.read/write` or
   `receiving.read/write` (requires updating the existing page guard, which
   currently only admits purchasing permissions).
3. If the PO status is `po_pending_receipt` and the user has `receiving.write`,
   show a "Create GR" action link.
4. If linked GRs exist, show them in a "Linked goods receipts" section (visible
   to any user who can view the PO detail — no extra permission required).
5. User opens `/purchasing/[id]/create-gr`.
6. Form shows PO header (PO number, vendor, date) and each PO line as a
   read-only row with an editable `received_qty` input pre-filled to `0`.
7. User fills in `receipt_date` (defaulted to Bangkok today), per-line
   `received_qty`, and optional `remark`.
8. Submit action validates permission and fields, calls the RPC, and redirects
   to `/receiving/[grId]`.
9. GR detail shows copied lines and `gr_created_from_po` in history. Returning
   to the PO detail shows the linked GR in the "Linked goods receipts" section.

### Screens / States

- Screen: `/purchasing/[id]`
  - `po_pending_receipt` + `receiving.write`: show create-GR action link;
  - any status: show all linked GRs (empty state: "No goods receipts yet");
  - other statuses: no create-GR action.
- Screen: `/purchasing/[id]/create-gr`
  - PO header summary (read-only);
  - per-line `received_qty` inputs (defaulted to `0`);
  - `receipt_date` input (defaulted to Bangkok today);
  - optional `remark` textarea;
  - guard: if PO not `po_pending_receipt`, redirect to PO detail with error.
- Empty state: form pre-fills `0` for all lines; submit is enabled only when
  at least one line has `received_qty > 0`.
- Loading state: native submit pending state, button disabled while pending.
- Error state: show validation/RPC errors without SQL internals.
- Permission-denied state: existing `AccessDenied` component.
- Mobile behavior: per-line qty inputs stack cleanly at 390px with no
  horizontal overflow.

### System Logic / Pseudocode

```text
server action createGoodsReceiptFromOrder(purchaseOrderId, form):
  require receiving.write
  validate purchaseOrderId, receiptDate (required)
  validate lineQuantities: at least one line with received_qty > 0
  get authenticated user/profile
  build p_line_quantities jsonb array (exclude 0-qty lines)
  call public.create_goods_receipt_from_order(
    p_purchase_order_id, p_actor_profile_id, p_actor_name,
    p_receipt_date, p_line_quantities, p_remark
  )
  redirect to /receiving/{grId}

RPC create_goods_receipt_from_order(...):
  lock source PO row FOR UPDATE
  require PO status = po_pending_receipt
  load PO lines ordered by line_no
  require at least one PO line
  require at least one submitted line with received_qty > 0
  insert GR header (status gr_draft, legacy_source v2_app, purchase_order_id)
  for each submitted line where received_qty > 0:
    look up PO line by po_line_id (must belong to this PO)
    insert GR line copying product name/sku/catalog IDs/unit/match_status
    set purchase_order_line_id, received_qty, is_extra_item=false
  insert gr_created_from_po event
  return gr_id (uuid)
```

## 5. Task Breakdown

1. Re-check current Supabase docs/changelog for RPC grant/RLS/function-security
   guidance immediately before writing/applying the migration if implementation
   happens after the 2026-07-02 architect review.
2. Draft migration:
   a. Widen `receiving_events_type_check` to add `'gr_created_from_po'`.
   b. Add `public.create_goods_receipt_from_order(...)` with ADR `0015`
      grant/revoke block.
3. Extend `scripts/verify-staging-schema.mjs` with the new service-role-only
   RPC name.
4. Extend PO read model (`src/modules/purchasing/read-model.ts`) to expose
   linked GRs on `PurchaseOrderDetail`: a 4th parallel query against
   `receiving_goods_receipts WHERE purchase_order_id = id`.
5. Add `create-gr-from-po` server action
   (`src/modules/receiving/create-gr-from-po-action.ts`) guarded by
   `receiving.write`.
6. Add `CreateGrFromPoForm` client component
   (`src/modules/receiving/create-gr-from-po-form.tsx`) with per-line qty
   inputs and `useActionState`.
7. Add `/purchasing/[id]/create-gr/page.tsx` server component (force-dynamic,
   `receiving.write` guard, redirect if PO not `po_pending_receipt`).
8. Update `/purchasing/[id]/page.tsx`:
   - expand the page guard to allow `purchasing.read`, `purchasing.write`,
     `receiving.read`, or `receiving.write`, matching 0013 PO read RLS;
   - show "Linked goods receipts" section with GR links (visible to all
     allowed readers);
   - show "Create GR" action only when `po_pending_receipt` and
     `can(guard.snapshot, "receiving.write")`.
9. Extend `src/modules/receiving/format.ts` with
   `formatGoodsReceiptEventType()` for `'gr_created_from_po'` label; update
   `/receiving/[id]/page.tsx` to use it and expand the page guard to allow
   `receiving.read`, `receiving.write`, `purchasing.read`, or
   `purchasing.write`, matching 0013 GR read RLS.
10. Apply migration to staging and run direct transaction-wrapped RPC smoke
    tests (valid create, wrong PO status blocked, all-zero-qty blocked, bad
    PO-line-id blocked).
11. Browser-verify writer and denied-user flows, linked-GR display on PO
    detail, GR detail event history, 390px layout, and console cleanliness.
12. Update handoff docs, module/database docs, and close out the plan after
    verification.

## 6. Files Expected To Change

- `supabase/migrations/*_gr_from_po_slice.sql` (new)
- `scripts/verify-staging-schema.mjs`
- `src/modules/purchasing/read-model.ts`
- `src/modules/receiving/create-gr-from-po-action.ts` (new)
- `src/modules/receiving/create-gr-from-po-form.tsx` (new)
- `src/modules/receiving/format.ts`
- `src/app/purchasing/[id]/page.tsx`
- `src/app/purchasing/[id]/create-gr/page.tsx` (new)
- `src/app/receiving/[id]/page.tsx`
- `src/app/globals.css` (if new form states need styles)
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md`

## 7. Verification Steps

- `npm run typecheck` — passed.
- `npm run lint` — passed with only the pre-existing FigJam generator warnings.
- `npm run check:migrations` — passed.
- `npm run build` — passed and confirmed `/purchasing/[id]/create-gr` is a
  dynamic route.
- `npm run db:apply-migrations -- 20260702120000_gr_from_po_slice.sql` —
  applied to staging without error.
- `npm run db:verify-staging-schema` — passed (36 tables, 34 policies,
  7 public service-role RPCs).
- Direct RPC smoke tests (9/9, transaction-wrapped / cleanup-safe):
  happy path with header/line/event verification and cleanup, no-positive-qty,
  invalid PO line id, unknown PO, and wrong PO status.
- Browser UAT (headless Playwright, 19/19 checks passed):
  receiving.write user can open PO detail and sees create-GR action; form
  renders PO lines and qty inputs; 390px create-GR form has zero horizontal
  overflow; submit creates a GR and redirects to `/receiving/[grId]`; GR
  detail shows "Created from purchase order" and copied line; 390px GR detail
  has zero horizontal overflow; PO detail shows linked GR; non-pending PO has
  no create-GR action; GUEST is denied on PO detail, create-GR route, and GR
  detail; temporary purchasing.write-only user can see linked GR on PO detail,
  has no create-GR action, and can open linked GR detail; no browser console
  or page errors.
- Cleanup verification after Browser UAT: 0 `v2052-*` profiles, 0 matching
  Auth users, 0 `V2052_PURCHASING_ONLY` temp roles, and 0 UAT actor events
  remained in staging.

## 8. Rollback / No-Production-Impact Note

V2-only, staging-first. V1 remains the live production GR workflow. Before
cutover, rollback is disabling or reverting the create-GR UI/server action and
dropping or replacing the new RPC in a follow-up migration if needed. Synthetic
GR rows created during tests should be deleted after UAT. Do not modify V1
Sheets, GAS deployments, URLs, LINE tokens, or production data.

## 9. Open Questions

- **GR number format**: should V2-native GRs have a human-readable
  `receipt_number` column (`V2-GR-YYYYMMDD-NNNN`)? This parallels `po_number`
  from `V2-0051` and requires a schema column + table-lock allocation logic in
  the RPC. Recommended deferral: implement without a GR number first (display
  uses UUID + receipt_date + PO number), then add `receipt_number` in a
  follow-up migration once the create flow is proven. If a GR number is
  required for V1 parity before cutover, do it in this slice.
- **Over-receive**: should `received_qty > ordered_qty` be blocked at the
  database level? V1 allowed "extra items" as a flag. Recommendation: do not
  validate in MVP; record `is_extra_item = false` for all V2-native GR lines
  and defer over-receive validation.
- **PO status after GR**: should a PO move from `po_pending_receipt` to a
  `po_partially_received` or `po_fully_received` status after GR creation?
  The current schema only has `po_pending_receipt` and `po_closed_apv_ready`.
  Recommendation: do not change PO status in this slice; defer to the APV/close
  slice.
- **GR receiver**: in V1, the receiver is a named person, not necessarily the
  logged-in user. Should the form have a separate "receiver name" field, or
  always use the logged-in user's `display_name`? Recommendation: use the
  logged-in user as receiver for MVP.
- **Unit override**: should users be able to change the unit per GR line (in
  case goods arrived in a different unit)? Recommendation: copy unit from PO
  line for MVP; defer unit override.
- **Receiving PO queue**: should receiving users have a PO-to-receive queue
  under `/receiving`, instead of reaching PO detail via a direct `/purchasing`
  link? Recommendation: defer the queue/list UX; this slice only makes the PO
  detail route correctly accessible to `receiving.*` users and adds the create
  action there.

## 10. Handoff Notes

- Next action: choose the next PR/PO/GR slice (likely PO close/APV or a
  grouped PR→PO→GR staging UAT package), or run deployed Vercel verification
  for the existing PR/PO/GR write chain.
- Blockers: none for this slice. Production cutover remains gated by grouped
  UAT, readiness task 7, deployed verification, and explicit user approval.
- Architect review 2026-07-02: keep the MVP defaults unless the user says
  otherwise before `Go:`:
  defer `receipt_number`, do not block over-receive yet, do not change PO
  status after GR creation, use the logged-in user as receiver, copy unit from
  PO line, and defer a dedicated `/receiving` PO queue.
- Related plans: `V2-0049`, `V2-0050`, `V2-0051` (write workflow chain);
  `V2-0039` (grouped PR/PO/GR release decision); `V2-0047` (read-only GR UI,
  existing `/receiving/[id]` detail route).
- Related ADRs: `0015` (public SECURITY INVOKER service-role-only RPCs),
  `0020` (PR/PO/GR schema/RLS lock), `0021` (grouped cutover decision).
- Key lesson from `V2-0051`: `RETURNS TABLE (..., po_number text)` caused
  an ambiguous column reference inside the function. To avoid the same risk,
  this RPC returns `uuid` (plain scalar), not `RETURNS TABLE`. If a richer
  return type is needed later, use a named composite type or ensure table
  aliases are applied to any column reference that might conflict with an
  OUT-param name.
