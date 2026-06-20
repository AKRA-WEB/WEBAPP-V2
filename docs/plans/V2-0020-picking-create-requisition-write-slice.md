# Plan V2-0020: Picking Create Requisition Write Slice

Status: Complete - executed 2026-06-20

User request:

```text
review ดูแล้ว แผนงานต่อไปมาเลย
```

## 1. Goal

- Primary objective: implement the first V2 Picking write path for staging:
  `/picking/new` creates a requisition, allocates a daily bill number, writes
  lines, and records a lifecycle event.
- Success definition: a `picking.write` user can create a requisition in
  staging and land on `/picking/[id]`; readers, guests, and signed-out users
  cannot write; existing list/detail immediately show the created bill.
- User/business reason: the read-only pilot is verified, so the next useful
  risk to prove is the server-side write transaction before LINE, status
  transitions, or problem reporting are added.

## 2. Requirement And Scope Definition

### Problem

- V2 Picking currently reads staging requisitions only.
- Staging create behavior is still unproven: form validation, daily bill
  number allocation, transaction boundaries, line writes, event writes, and
  permission denial all need a small verified slice.
- Existing staging rows are fixtures, so the create slice should also prepare
  real reference data for product/staff selection without importing full V1
  Picking history.

### Users

- Primary users: Picking writers/requesters creating a new requisition.
- Secondary users: Picking readers and supervisors validating created bills.
- Admin/support users: maintainers checking transaction, permission, and
  staging data behavior.

### MVP Features

- Add a small catalog bridge for Picking lines by adding nullable references
  from `picking_requisition_lines` to `catalog_products` and, if useful,
  `catalog_product_aliases`.
- Build dry-run and gated apply scripts for V1 Picking reference data:
  - `ProductName` becomes Picking-source aliases in the shared catalog;
  - `Staff` upserts `picking_staff` and server-only LINE account rows;
  - `Requisition` history is not imported in this slice.
- Add `/picking/new`, guarded by `picking.write`.
- Add a "New requisition" route/action only for writers/admins on `/picking`.
- Product rows support selected shared-catalog products plus explicit
  free-text rows.
- Assignee selection reads active `picking_staff`.
- Server-side create action validates bill type, requester, assignee, product
  rows, quantity, unit, and free-text intent.
- Server-side transaction allocates `private.next_picking_bill_no(bill_date)`,
  inserts `picking_requisitions`, `picking_requisition_lines`, and a
  `created` event, then redirects to detail.
- Existing read model/detail page shows created rows without a separate follow-up
  change.

### Nice-To-Have Features

- LINE Flex card sending and postback handling.
- In-app pick/send/cancel status buttons.
- Problem reporting UI.
- Full V1 `Requisition` history import.
- Rich product autocomplete API, fuzzy matching, or manual alias approval.
- Stock reservation, stock decrement, or warehouse movement writes.
- Main portal polish under `V2-0017`.

### Out Of Scope

- Changing V1 Picking frontend, GAS backend, Google Sheets, GitHub Pages
  deployment, live URLs, LINE tokens, or production data.
- Importing plaintext V1 capability tokens or LINE quote tokens.
- Exposing `SUPABASE_SECRET_KEY`, `DATABASE_URL`, service role keys, LINE user
  IDs, or token hashes to browser code.
- Connecting V2 Production to live Picking traffic.
- Implementing PR/PO/GR, Warehouse, Returns, KPI, or Main portal workflows.
- Replacing the current app shell or design system.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, TypeScript, existing `AppShell`, existing CSS
  primitives, and a small form component only where client-side row add/remove
  behavior is needed.
- Backend/server boundary: server actions and server-only modules under
  `src/modules/picking`.
- Database: Supabase/Postgres staging tables plus a small migration for the
  Picking-to-catalog line bridge.
- Auth/permissions: `requirePermission({ permission: "picking.write" })` for
  create; `picking.read` remains sufficient for list/detail.
- Deployment: local and Vercel Preview/Development only. Production remains no
  cutover.

### Data Model / Schema

- Tables involved:
  - `picking_requisitions`
  - `picking_requisition_lines`
  - `picking_requisition_events`
  - `picking_daily_sequences`
  - `picking_staff`
  - `picking_staff_line_accounts`
  - `catalog_products`
  - `catalog_product_aliases`
- Proposed migration:
  - add nullable `catalog_product_id uuid references public.catalog_products(id)
    on delete set null` to `picking_requisition_lines`;
  - add nullable `catalog_alias_id uuid references public.catalog_product_aliases(id)
    on delete set null` if the implementation uses alias-level selection;
  - add indexes for these nullable columns;
  - do not remove existing `product_id`; keep it for compatibility with the
    earlier Picking-local schema and future historical import decisions.
- Important fields:
  - requisition: `bill_date`, `bill_no`, `bill_type`, `status`,
    `requester_profile_id`, `requester_name`, `assignee_staff_id`,
    `assignee_name`, `legacy_source`;
  - line: `line_no`, `product_name`, `requested_qty`, `unit`,
    `is_free_text`, optional catalog references;
  - event: `event_type = "created"`, `actor_profile_id`, `actor_name`,
    metadata with safe non-secret values only.
- Constraints:
  - create must run in one transaction;
  - daily bill numbers come only from `private.next_picking_bill_no(date)`;
  - selected products preserve the source display name/unit used on the bill;
  - unmatched rows must be explicitly marked free text.
- RLS/security notes:
  - exposed tables already have RLS and explicit grants; new columns do not
    change table exposure;
  - operational reads continue through the authenticated Supabase client so RLS
    remains verified;
  - write transaction should use a server-only Postgres connection or an
    equivalent private server-only transaction path after the route guard has
    allowed `picking.write`;
  - do not authorize from user-editable metadata or browser-supplied role data.

### Integration Points

- V1 references: local CSV snapshots under `import-data/Picking/` and
  `docs/migration/picking-v1-mapping.md` are reference inputs only.
- Supabase: current docs/changelog were checked on 2026-06-20. Relevant points:
  explicit Data API grants and RLS still matter for exposed tables; security
  definer functions need restricted execution and fixed `search_path`; server
  code must not trust raw session/user metadata for authorization.
- Vercel: Preview/Development needs required server-only env for the transaction
  path if the implementation uses direct Postgres access.
- LINE/GAS/Sheets/API: no LINE send and no V1 GAS/Sheet writes in this slice.
- Secrets/env vars: no new public env vars. Any `DATABASE_URL` or server secret
  stays server-only and out of git.

## 4. UI/UX And User Flow

### User Flow

1. User signs in.
2. User opens `/picking`.
3. If the user has `picking.write`, the page shows a "New requisition" action.
4. User opens `/picking/new`.
5. Server verifies `picking.write` before rendering create UI data.
6. User chooses bill type, assignee, and one or more product/free-text rows.
7. UI validates obvious missing fields before submit.
8. Server action revalidates everything and writes the transaction.
9. User is redirected to `/picking/[id]` with the new `#NNN` visible bill
   number.

### Screens / States

- Screen: `/picking`
  - add "New requisition" action only for writers/admins;
  - readers keep the read-only list with no misleading write affordance.
- Screen: `/picking/new`
  - bill type segmented/select control;
  - requester default from the signed-in profile, with explicit display;
  - assignee select from active Picking staff;
  - editable line rows with product/free-text, quantity, unit, add/remove;
  - submit button with disabled/loading/error states.
- Empty state: if reference data is absent, explain that staging reference
  import must run before operator testing.
- Loading state: keep server-rendered data where possible; avoid auth flicker.
- Error state: compact operational error without query details or secret names.
- Permission-denied state: shared `AccessDenied`.
- Mobile behavior: no horizontal overflow around 375px/390px; line rows wrap
  before clipping product names or quantity controls.

### System Logic / Pseudocode

```text
render /picking/new:
  guard = requirePermission(permission: "picking.write")
  if denied: render AccessDenied
  load active picking_staff
  load capped product alias suggestions from shared catalog
  render create form

create action:
  guard = requirePermission(permission: "picking.write")
  if denied: reject
  user = validated server-side current user/profile
  validate billType, assignee, rows
  begin transaction
    billNo = select private.next_picking_bill_no(bangkokToday)
    insert picking_requisitions(status="pending", legacy_source="v2_app")
    insert picking_requisition_lines with line_no and catalog refs/free-text
    insert picking_requisition_events(event_type="created")
  commit
  redirect /picking/:id
```

## 5. Task Breakdown

1. Reconfirm current staging table counts for Picking products/staff/requisitions
   and catalog Picking-source aliases.
2. Add migration for nullable catalog references on
   `picking_requisition_lines`.
3. Add `scripts/picking-reference-import-dry-run.mjs` to profile ProductName
   and Staff snapshots, match ProductName to `catalog_products` by code/exact
   normalized name, and report unmatched/manual-review rows.
4. Add gated `scripts/picking-reference-import-apply.mjs` with
   `--confirm-picking-reference-import` and known staging project-ref check.
5. Apply reference import to staging after dry-run report is acceptable.
6. Add server-only Picking reference/read helpers for staff and product alias
   suggestions.
7. Add server-only create transaction helper/action.
8. Add `/picking/new` UI and writer-only link from `/picking`.
9. Update list/detail formatting only as needed to show created rows cleanly.
10. Verify permissions, transaction results, mobile layout, and no-secret
   behavior.
11. Update handoff docs and decide the next slice: LINE notification, in-app
   status actions, or problem reporting.

## 6. Files Expected To Change

- `supabase/migrations/0009_picking_catalog_bridge.sql` or the next sequential
  migration name used in this repo
- `scripts/picking-reference-import-dry-run.mjs`
- `scripts/picking-reference-import-apply.mjs`
- `package.json`
- `src/app/picking/page.tsx`
- `src/app/picking/new/page.tsx`
- `src/modules/picking/create-action.ts`
- `src/modules/picking/reference-data.ts`
- `src/modules/picking/read-model.ts`
- `src/modules/picking/format.ts`
- `src/app/globals.css`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 7. Verification Steps

- `npm run check:migrations`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `npm run db:verify-staging-schema` after applying the migration.
- Targeted staging verification that:
  - reference import inserted Picking aliases/staff as expected;
  - `picking_staff_line_accounts` remains unreadable to authenticated users;
  - a create writes exactly one requisition, N lines, one `created` event, and
    advances `picking_daily_sequences`;
  - two near-simultaneous creates get distinct `bill_no` values.
- Browser verification against staging:
  - signed-out sees sign-in required;
  - `GUEST` denied;
  - `PICKING_READER` can read but cannot create;
  - `PICKING_WRITER` and `ADMIN` can create and view detail;
  - `/picking` and `/picking/new` have no horizontal overflow at 390px;
  - no browser console errors.

## 8. Rollback / No-Production-Impact Note

This plan affects only V2 runtime code, V2 docs, and staging Supabase data when
executed. V1 Picking remains live and untouched. Rollback is to revert the V2
code/migration/doc changes before promotion, and delete only clearly marked
staging rows created by the reference import or create-flow verification. Do
not delete V1 production data or modify V1 GAS/Sheets.

## 9. Open Questions

- ~~Should Vercel Preview/Development receive a server-only `DATABASE_URL` for
  transactional writes, or should deployed create testing stay local until a
  private RPC/transaction path is added?~~ Resolved during execution: neither
  — `DATABASE_URL` was never needed. The atomic transaction is
  `public.create_picking_requisition(...)` (migration `0009`), a
  `service_role`-only RPC called via the existing `SUPABASE_SECRET_KEY` (already
  configured in Vercel Preview/Development). See ADR `0015`.
- Should requester name always come from the signed-in V2 profile, or may a
  writer enter another requester display name for legacy parity? Implemented
  as: always the signed-in profile's `display_name`/`email` (no override
  field in this slice).
- ~~Should free-text rows be allowed for the first create slice, or require only
  shared-catalog matched products?~~ Implemented: yes, free-text rows are
  allowed alongside shared-catalog product rows.
- After create is verified, should the next slice be LINE send, in-app status
  buttons, or problem reporting? Still open — recommend the user pick the next
  slice.

## 10. Handoff Notes

- Next action: wait for `Go:` on `V2-0020`, then start with the migration and
  reference-data dry run.
- Blockers: no runtime blocker for local execution; deployed verification may
  need server-only database env configuration in Vercel Preview/Development.
- Related plans: `V2-0009`, `V2-0010`, `V2-0018`, `V2-0019`.
- Related ADRs: `0012`, `0013`.
