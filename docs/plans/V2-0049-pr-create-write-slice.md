# Plan V2-0049: PR Create Write Slice

Status: Implemented and staging-verified on 2026-06-26; signed-in browser UAT
is still pending before any production cutover.

User command:

```text
เริ่ม "PR/PO/GR write workflow planning/implementation เลย"
```

## 1. Goal

- Primary objective: start the PR/PO/GR write-workflow sequence with the
  smallest safe transactional slice: create a new Purchase Requisition (PR)
  header, lines, and lifecycle event in staging.
- Success definition: an allowed purchasing user can open `/purchasing/pr/new`,
  submit one or more PR lines, and land on a read-only PR detail page showing
  the newly created pending PR; the write is atomic and service-role-only.
- User/business reason: PR is the first step in the grouped PR -> PO -> GR
  workflow. Creating PRs safely in V2 unlocks later approval/rejection and
  PO-from-PR slices without mixing all workflow states into one change.

## 2. Requirement And Scope Definition

### Problem

- `V2-0044` imported historical PO/GR rows and `V2-0047` added read-only PO/GR
  pages, but no PR/PO/GR write workflow exists yet.
- Current PR import source has 0 rows, so the first useful PR runtime work must
  create V2-native staging PR rows rather than relying on imported history.
- ADR `0025` required the operational-readiness package before write work. The
  package exists (`V2-0046`) and the user has now explicitly asked to start
  PR/PO/GR write-workflow planning/implementation. Production cutover remains
  blocked by readiness task 7 and grouped UAT.

### Users

- Primary users: purchasing/requester users who can create PRs in staging.
- Secondary users: supervisors and purchasing staff who will later approve or
  reject PRs and create POs.
- Admin/support users: maintainers verifying transaction safety, RLS, and
  rollback behavior before further write slices.

### MVP Features

- Add one atomic `public.create_purchase_requisition(...)` RPC following ADR
  `0015`: public schema, default `SECURITY INVOKER`, execute revoked from
  `public`/`anon`/`authenticated`, execute granted only to `service_role`.
- Server action checks `purchasing.write` before calling the RPC through
  `createAdminClient()`.
- New `/purchasing/pr/new` page with a semantic multi-line PR form.
- PR reference data from existing shared catalog aliases (`source_app =
  'po-pr-gr'`) and active warehouses.
- New read helpers for recent PRs and PR detail, including events.
- Add a PR section/link from `/purchasing` without replacing the existing PO
  read-only list.
- Keep created PRs in `pr_pending` status only.

### Nice-To-Have Features

- Supervisor approve/reject actions.
- Create PO from approved PR.
- Direct PO create/edit.
- GR receive/reset/confirm.
- LINE notifications.
- Feature flags for fast route disable.

### Out Of Scope

- Production cutover or V1 writeback.
- V1 Sheet/GAS/deployment changes.
- PR approval/rejection.
- PO or GR mutations.
- Warehouse stock movement writes.
- New granular permissions such as `purchasing.approve`; this slice keeps
  current coarse `purchasing.write`.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, existing app shell and form styling.
- Backend/server boundary: server action + service-role Supabase admin client.
- Database: Supabase/Postgres migration under `supabase/migrations`.
- Auth/permissions: server-side `requirePermission({ permission:
  "purchasing.write" })`; normal authenticated client for reads.
- Deployment: staging/local/Preview/Development only. Production remains off.

### Data Model / Schema

- Tables written:
  - `public.purchasing_purchase_requests`
  - `public.purchasing_purchase_request_lines`
  - `public.purchasing_events`
- Tables read for form references:
  - `public.catalog_product_aliases`
  - `public.catalog_products`
  - `public.warehouse_warehouses`
- Status:
  - New PR header and lines start as `pr_pending`.
- Numbering:
  - Use a deterministic V2-native request number format:
    `V2-PR-YYYYMMDD-0001`, where the sequence is counted per Bangkok local day
    from existing V2 PR headers for that date.
  - The RPC locks `purchasing_purchase_requests` in exclusive mode while
    allocating the daily sequence. This is intentionally simple for the first
    staging slice and avoids adding a new counter table until concurrency
    pressure proves it is needed.
- RLS/security notes:
  - Existing RLS select policies already cover PR reads.
  - No authenticated insert/update/delete policy is added.
  - The RPC is service-role-only and called only after the server guard allows
    `purchasing.write`.

### Integration Points

- V1 references: read-only behavior context from `development_context.md` and
  `docs/migration/pr-po-gr-v1-mapping.md`.
- Supabase: official docs/changelog rechecked on 2026-06-26. Relevant current
  guidance remains: Data API access needs explicit grants plus RLS; public
  schema tables must enable RLS; database functions should default to
  `SECURITY INVOKER`, with execute revoked/granted narrowly; recent changelog
  confirms new public tables may no longer be exposed automatically on new
  projects, so migrations keep explicit grants.
- Vercel: no deployment setting changes.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: no new secrets.

## 4. UI/UX And User Flow

### User Flow

1. User signs in and opens `/purchasing`.
2. User chooses "New PR".
3. Server checks `purchasing.write`.
4. User enters warehouse/product/quantity/unit/remark lines; requester comes
   from the authenticated profile.
5. Server action validates the payload and calls the atomic RPC.
6. User redirects to `/purchasing/pr/[id]` showing the pending PR and event.

### Screens / States

- Screen: `/purchasing`
  - Keep existing PO list.
  - Add PR summary/list and "New PR" action for writers.
- Screen: `/purchasing/pr/new`
  - Semantic form, visible labels, native `required`/numeric constraints,
    one or more line rows, mobile one-column fallback.
- Screen: `/purchasing/pr/[id]`
  - Header, lines, and event timeline.
- Empty state: no V2-native PRs yet.
- Error state: compact operational error; no secret/internal details.
- Permission-denied state: shared `AccessDenied`.
- Mobile behavior: no horizontal overflow at 390px.

### System Logic / Pseudocode

```text
server action createPurchaseRequisition(input):
  require purchasing.write
  get authenticated user/profile
  validate requester, at least one line, qty > 0, unit/product/warehouse
  verify catalog aliases/products and warehouses with the admin client after
  the server-side permission guard
  call service-role RPC create_purchase_requisition(...)
  redirect to /purchasing/pr/{id}

RPC create_purchase_requisition(...):
  validate lines jsonb
  lock purchasing_purchase_requests for sequence allocation
  build request number V2-PR-YYYYMMDD-NNNN
  insert PR header
  insert lines with product/alias/warehouse/raw fields
  insert pr_created event
  return id/request_number
```

## 5. Task Breakdown

1. [x] Create the migration file through Supabase CLI when available and add
   `public.create_purchase_requisition(...)`.
2. [x] Update schema verification so public service-role-only RPCs are checked
   consistently (`create_picking_requisition` plus this new function).
3. [x] Add purchasing reference data helpers for PR form options.
4. [x] Extend purchasing read model/format helpers with PR list/detail types.
5. [x] Add `create-pr-action.ts` and `new-pr-form.tsx`.
6. [x] Add `/purchasing/pr/new` and `/purchasing/pr/[id]` routes.
7. [x] Extend `/purchasing` with a PR section and writer-only "New PR" action.
8. [x] Update module README/status docs and handoff docs.
9. [x] Run verification and apply the migration to staging if environment access
   allows.

## 6. Files Expected To Change

- `supabase/migrations/*_pr_create_write_slice.sql`
- `scripts/verify-staging-schema.mjs`
- `src/modules/purchasing/reference-data.ts`
- `src/modules/purchasing/read-model.ts`
- `src/modules/purchasing/format.ts`
- `src/modules/purchasing/create-pr-action.ts`
- `src/modules/purchasing/new-pr-form.tsx`
- `src/app/purchasing/page.tsx`
- `src/app/purchasing/pr/new/page.tsx`
- `src/app/purchasing/pr/[id]/page.tsx`
- `src/modules/purchasing/README.md`
- `src/modules/README.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/migration/module-inventory.md`
- `docs/migration/database-strategy.md`

## 7. Verification Steps

- `npm run check:migrations` - passed 2026-06-26.
- `npm run db:apply-migrations -- 20260626071939_pr_create_write_slice.sql`
  against staging - passed 2026-06-26.
- `npm run db:verify-staging-schema` - passed 2026-06-26; verifier now checks
  the new public service-role-only RPC grant/revoke posture.
- `npm run lint` - passed 2026-06-26 with only pre-existing FigJam script
  warnings from `V2-0048`.
- `npm run typecheck` - passed 2026-06-26.
- `npm run build` - passed 2026-06-26; routes include
  `/purchasing/pr/new` and `/purchasing/pr/[id]`.
- Direct RPC smoke test - passed 2026-06-26 in a transaction with
  `set local role service_role`; created one PR header, one line, and one
  `pr_created` event, then rolled back.
- Production-server HTTP route smoke - passed 2026-06-26 against
  `http://127.0.0.1:3000/purchasing/pr/new` with status 200/content check
  true, then the local server was stopped.
- Not run: signed-in browser interaction as a `purchasing.write` user and
  390px visual no-overflow check. `next dev` fails in the sandbox with
  `spawn EPERM`; production route smoke was used instead. Complete this as
  human/Playwright UAT before any production cutover.
- `git diff --check` - passed during 2026-06-29 closeout with line-ending
  warnings only.

## 8. Rollback / No-Production-Impact Note

This slice is staging-only and V2-only. V1 remains the production system. If
the PR create path fails before cutover, disable the route/action in V2 and
delete any synthetic staging test PR rows created during verification. No V1
Sheet, GAS deployment, URL, LINE token, or production data is touched.

## 9. Open Questions

- Should future PR approval use `purchasing.write` or add a new
  `purchasing.approve` permission? Deferred until approval slice.
- Should PR numbers use a dedicated daily sequence table instead of lock/count
  once production volume is known? Deferred unless concurrency testing shows a
  real issue.
- Which role should own PR approval/rejection in UAT? Deferred to the next
  write slice.

## 10. Handoff Notes

- Next action: signed-in UAT for the new PR form using a writer/admin account,
  then plan the PR approve/reject slice or PO-from-approved-PR slice.
- Blockers: none for staging implementation. Production cutover remains gated
  by operational readiness implementation, grouped PR/PO/GR UAT, signed-in
  browser UAT, and explicit user approval.
- Related plans: `V2-0036`, `V2-0039`, `V2-0044`, `V2-0046`, `V2-0047`.
- Related ADRs: `0015`, `0020`, `0021`, `0025`, `0026`.
