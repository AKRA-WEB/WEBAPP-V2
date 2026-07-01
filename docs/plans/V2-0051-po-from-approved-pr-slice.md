# Plan V2-0051: PO From Approved PR Slice

Status: Draft (2026-07-01).

Architect command:

```text
Architect:plan PO-from-approved-PR
```

## 1. Goal

- Primary objective: add the next PR/PO/GR write-workflow slice after
  `V2-0050`: create a V2-native Purchase Order (PO) from one approved
  V2-native Purchase Requisition (PR) in one atomic server-side transaction.
- Success definition: a signed-in user with `purchasing.write` can open an
  approved PR that has no linked PO, choose a vendor, optionally set an
  expected date/note, submit the create-PO action, and land on a PO detail page
  whose header, lines, PR linkage, and event history are correct. Pending,
  rejected, duplicate, missing-vendor, and unsupported mixed-warehouse PRs are
  blocked cleanly.
- User/business reason: approved PRs need a controlled handoff into purchasing
  execution before GR receiving and APV/closeout can be implemented.

## 2. Requirement And Scope Definition

### Problem

- `V2-0049` creates PRs and `V2-0050` approves or rejects them, but there is no
  V2 workflow action that turns an approved PR into a PO.
- V1's `approvePR` behavior creates PO rows from approved PR rows, but V2 now
  uses normalized PO headers plus lines and should keep this write atomic and
  auditable.
- The grouped PR -> PO -> GR release needs a reliable PO creation slice before
  GR receiving, PO close/APV, or production UAT can be meaningful.

### Users

- Primary users: purchasing users or supervisors who convert approved PRs into
  vendor-facing POs.
- Secondary users: requesters and receiving staff who need to see which PO was
  created from an approved PR.
- Admin/support users: maintainers verifying transaction safety, duplicate
  prevention, permission behavior, and audit events before GR work starts.

### MVP Features

- Add one service-role-only RPC:
  `public.create_purchase_order_from_requisition(...)`.
- Use the same public-schema, default `SECURITY INVOKER`, service-role-only
  posture as `V2-0049` and `V2-0050` (ADR `0015`).
- Keep MVP authorization on the existing `purchasing.write` permission; do not
  introduce a new `purchasing.approve` or `purchasing.order` permission in this
  slice.
- Allow PO creation only from `pr_approved` PRs.
- Require a selected active vendor from `catalog_vendors`; do not silently infer
  a vendor from product aliases in the first slice.
- Copy all approved PR lines into one PO when the PR lines share one warehouse
  identity. If the PR has mixed normalized/raw warehouses, block with a clear
  unsupported-state error and defer split-by-warehouse behavior.
- Generate a V2 PO number in the RPC, proposed format
  `V2-PO-YYYYMMDD-0001`, using the submitted PO date and a transaction-safe
  table lock/max-suffix allocation.
- Insert:
  - one `purchasing_purchase_orders` header;
  - one `purchasing_purchase_order_lines` row per PR line;
  - one `purchasing_events` row with `event_type = 'po_created_from_pr'`.
- Prevent duplicates by checking both existing PO lines linked to the PR lines
  and the PO header bill identity
  (`legacy_source = 'v2_app'`, `bill_identity_kind = 'pr_uid'`,
  `bill_identity_value = <purchase_request_id>`).
- Add a guarded UI path from `/purchasing/pr/[id]` for approved PRs:
  - if no linked PO exists and the user has `purchasing.write`, show the
    create-PO action;
  - if a linked PO exists, show the PO link and do not show the create action;
  - pending/rejected PRs have no create-PO action.
- Redirect to the existing PO detail route (`/purchasing/[poId]`) after
  successful creation.

### Nice-To-Have Features

- Direct PO creation without PR.
- Splitting one PR into multiple POs by warehouse, vendor, or selected lines.
- Vendor inference from `catalog_product_vendors` or aliases.
- Line-level vendor or expected-date overrides.
- PO editing, cancellation, close/APV, or receive-to-GR workflow.
- LINE notifications for PO creation.
- A dedicated `purchasing.order` or `purchasing.approve` permission.

### Out Of Scope

- Direct PO create flow.
- Editing existing PO headers or lines.
- GR creation, receiving, stock movement, PO close, or APV marking.
- Updating V1 Google Sheets, GAS deployments, LINE tokens, or live URLs.
- Importing or rewriting legacy PR/PO/GR history.
- Production cutover or grouped PR/PO/GR release approval.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, extending the existing purchasing routes.
- Backend/server boundary: server action guarded by `requirePermission()`,
  then service-role Supabase RPC via `createAdminClient()`.
- Database: one new migration under `supabase/migrations`.
- Auth/permissions: existing `purchasing.write`; existing read behavior remains
  `purchasing.read` or `purchasing.write`.
- Deployment: staging/local/Preview/Development only; production remains gated
  by readiness task 7, grouped PR/PO/GR UAT, and explicit user approval.

### Data Model / Schema

- Tables read:
  - `public.purchasing_purchase_requests`
  - `public.purchasing_purchase_request_lines`
  - `public.catalog_vendors`
- Tables written:
  - `public.purchasing_purchase_orders`
  - `public.purchasing_purchase_order_lines`
  - `public.purchasing_events`
- PO header fields:
  - `po_number`: generated as `V2-PO-YYYYMMDD-0001` style;
  - `po_date`: submitted date, defaulted by the server action to the Bangkok
    current date for UI convenience;
  - `vendor_id` and `raw_vendor_name`: selected vendor;
  - `warehouse_id` and `raw_warehouse`: the common PR-line warehouse;
  - `expected_date`, `raw_expected_date`, `expected_date_source`: optional,
    with source `v2_user` only when supplied;
  - `status`: `po_pending_receipt`;
  - `raw_status`: `V2 Pending Receipt`;
  - `bill_identity_kind`: `pr_uid`;
  - `bill_identity_value`: the source PR `id` as text;
  - `legacy_source`: `v2_app`;
  - `is_direct`: `false`;
  - `is_legacy_ambiguous`: `false`;
  - `metadata`: source PR id/number and optional user note.
- PO line fields copied from PR lines:
  - `purchase_request_line_id`
  - `line_no`
  - `catalog_product_id`
  - `catalog_alias_id`
  - `raw_sku`
  - `raw_product_name`
  - `ordered_qty = requested_qty`
  - `unit`
  - `remark`
  - `pr_number_label = request_number`
  - `raw_po_date`
  - `status = po_pending_receipt`
  - `raw_status = V2 Pending Receipt`
  - `match_status`
- Constraints and duplicate protection:
  - existing PO header unique index covers
    `(legacy_source, bill_identity_kind, bill_identity_value)` where identity
    value is not null;
  - RPC must also check existing PO lines for any source PR line before insert
    so duplicate or partially-created states fail before writing.
- RLS/security notes:
  - do not add authenticated insert/update/delete policies;
  - no browser exposure of service-role keys;
  - `EXECUTE` revoked from `public`, `anon`, and `authenticated`, granted only
    to `service_role`;
  - keep the function default `SECURITY INVOKER`.

### Integration Points

- V1 references: V1 `approvePR` creates PO rows from approved PR rows and
  keeps the PR number breadcrumb; V2 will preserve that lineage through
  `purchase_request_line_id`, `bill_identity_value`, and `pr_number_label`.
- Supabase: before implementation, re-check official Supabase docs/changelog
  for RPC, RLS, grants, and function-security guidance, as required by
  `AGENTS.md`.
- Vercel: no new environment variables or deployment settings.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: no new secrets.

## 4. UI/UX And User Flow

### User Flow

1. User signs in and opens `/purchasing/pr/[id]`.
2. Server renders the PR detail if the user has `purchasing.read` or
   `purchasing.write`.
3. If the PR is `pr_approved`, has no linked PO, and the user has
   `purchasing.write`, show a create-PO action.
4. User opens the create-PO screen or inline form.
5. Form shows PR summary and read-only lines, asks for vendor, PO date,
   optional expected date, and optional note.
6. Submit action validates permission and fields, calls the RPC, and redirects
   to `/purchasing/[poId]`.
7. PO detail shows copied lines and `po_created_from_pr` in history. Returning
   to the PR detail shows the linked PO and no second create action.

### Screens / States

- Screen: `/purchasing/pr/[id]`
  - approved/no PO: show create-PO action to `purchasing.write` users;
  - approved/has PO: show linked PO;
  - pending/rejected: no create-PO action.
- Screen: `/purchasing/pr/[id]/create-po` (preferred first implementation)
  - PR summary and read-only line review;
  - vendor select;
  - PO date defaulted to today;
  - optional expected date and note.
- Empty state: no vendors available should block submission and show a compact
  operational error.
- Loading state: native submit pending state is enough for this slice.
- Error state: show validation/RPC errors without SQL internals.
- Permission-denied state: existing `AccessDenied`.
- Mobile behavior: form fields and line review stack cleanly at 390px with no
  horizontal overflow.

### System Logic / Pseudocode

```text
server action createPurchaseOrderFromRequisition(form):
  require purchasing.write
  validate purchaseRequestId, vendorId, poDate
  optionally validate expectedDate >= poDate only if business confirms
  get authenticated user/profile
  call public.create_purchase_order_from_requisition(...)
  redirect to /purchasing/{poId}

RPC create_purchase_order_from_requisition(...):
  lock source PR row for update
  require PR status = pr_approved
  load PR lines ordered by line_no
  require at least one line
  require selected vendor exists
  require all PR lines share one warehouse identity for MVP
  require no existing PO line references any source PR line
  require no existing PO header identity for this PR
  lock purchasing_purchase_orders for V2 PO number allocation
  generate next V2-PO-YYYYMMDD-#### number
  insert PO header
  insert copied PO lines
  insert po_created_from_pr event
  return po id/number
```

## 5. Task Breakdown

1. Re-check current Supabase docs/changelog for RPC grant/RLS/function-security
   guidance before writing the migration.
2. Draft migration for `public.create_purchase_order_from_requisition(...)`.
3. Extend `scripts/verify-staging-schema.mjs` with the new service-role-only
   RPC signature.
4. Extend Purchasing reference data to load active vendors for the create-PO
   form.
5. Extend PR read model to expose whether a PR already has linked PO lines and
   the first linked PO id/number when present.
6. Add `create-po-from-pr` server action guarded by `purchasing.write`.
7. Add `/purchasing/pr/[id]/create-po` form route and link/linked-PO state on
   `/purchasing/pr/[id]`.
8. Update purchasing status/event labels and minimal CSS for the new form state.
9. Apply migration to staging and run direct transaction-wrapped RPC smoke
   tests.
10. Browser-verify writer and denied-user flows, duplicate prevention, linked
    PO display, 390px layout, and console cleanliness.
11. Update handoff docs, module/database docs if schema assumptions changed,
    and close out the plan after verification.

## 6. Files Expected To Change

- `supabase/migrations/*_po_from_approved_pr_slice.sql`
- `scripts/verify-staging-schema.mjs`
- `src/modules/purchasing/create-po-from-pr-action.ts`
- `src/modules/purchasing/create-po-from-pr-form.tsx`
- `src/modules/purchasing/reference-data.ts`
- `src/modules/purchasing/read-model.ts`
- `src/modules/purchasing/format.ts`
- `src/app/purchasing/pr/[id]/page.tsx`
- `src/app/purchasing/pr/[id]/create-po/page.tsx`
- `src/app/globals.css`
- `src/modules/purchasing/README.md`
- `src/modules/README.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/migration/database-strategy.md`
- `docs/migration/module-inventory.md` if the module phase/status changes.

## 7. Verification Steps

- `npm run check:migrations`
- `npm run db:apply-migrations -- <new migration>` against staging.
- `npm run db:verify-staging-schema`
- Direct transaction-wrapped RPC smoke tests:
  - approved PR with one warehouse and selected vendor creates one PO header,
    all expected PO lines, and one `po_created_from_pr` event;
  - pending PR is blocked;
  - rejected PR is blocked;
  - missing vendor is blocked;
  - duplicate PO creation is blocked;
  - mixed-warehouse PR is blocked for this MVP.
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Browser UAT:
  - writer creates a PR, approves it, creates PO, lands on PO detail;
  - PR detail shows linked PO and hides second create action;
  - GUEST or no-permission user is denied;
  - pending/rejected PRs do not expose create controls;
  - 390px viewport has zero horizontal overflow;
  - zero browser console errors.
- `git diff --check`

## 8. Rollback / No-Production-Impact Note

This is V2-only and staging-first. V1 remains the live production workflow.
Before cutover, rollback is disabling or reverting the create-PO UI/server
action and dropping or replacing the new RPC in a follow-up migration if needed.
Synthetic staging PR/PO rows created during tests should be deleted after UAT.
Do not modify V1 Sheets, GAS deployments, URLs, LINE tokens, or production data.

## 9. Open Questions

- Recommended MVP decision: block mixed-warehouse PRs instead of splitting them
  in this slice. Confirm whether the business expects multi-warehouse PRs to
  become one PO or multiple POs.
- Recommended MVP decision: vendor is required at create time; do not infer a
  vendor automatically. Confirm whether vendor selection belongs to the PO
  creator or should be constrained by product-vendor mappings later.
- Recommended MVP decision: use `V2-PO-YYYYMMDD-####` numbering. Confirm if a
  specific human PO-number format is required before staging UAT.
- Should `expected_date` be optional, required, or required only for certain
  vendors?
- Should this slice allow a user note on the PO header metadata, or keep only
  the optional expected date and vendor?

## 10. Handoff Notes

- Next action: review/accept this plan, then execute with `Go:` when ready.
- Housekeeping before or alongside execution: local `main` is ahead of
  `origin/main` by the V2-0050 commit, and V2-0050 UAT test accounts
  `v2050-sup@akra-v2.test` and `v2050-guest@akra-v2.test` still need deletion
  via service-role Admin API.
- Blockers: no technical blocker for staging implementation after plan
  acceptance; production cutover remains blocked by readiness task 7, grouped
  PR/PO/GR UAT, and explicit user approval.
- Related plans: `V2-0039`, `V2-0046`, `V2-0047`, `V2-0049`, `V2-0050`.
- Related ADRs: `0015`, `0020`, `0021`, `0025`, `0026`.
