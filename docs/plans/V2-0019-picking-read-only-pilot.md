# Plan V2-0019: Picking Read-Only Pilot

Status: Complete - executed 2026-06-20

User request:

```text
โอเค วางแผนงานไว้เลย
```

## 1. Goal

- Primary objective: replace the current Picking placeholder with the first
  permission-gated read-only V2 Picking route.
- Success definition: `/picking` shows a recent requisition list or a clear
  empty state, `/picking/[id]` shows bill detail, and denied users cannot read
  Picking operational data.
- User/business reason: prove the V2 route, permission, RLS, and data-display
  path before adding create actions, LINE integration, or status workflows.

## 2. Requirement And Scope Definition

### Problem

- V2 Picking has staging schema/RLS but no usable workflow route yet.
- The current `/picking` page is only a module placeholder.
- Starting with writes would combine UI, validation, daily counters,
  lifecycle events, and future LINE behavior in one risky slice.

### Users

- Primary users: Picking readers and writers checking recent requisitions.
- Secondary users: supervisors/admins validating the pilot workflow.
- Admin/support users: maintainers confirming permission and staging data
  behavior before create actions are implemented.

### MVP Features

- Permission-gated `/picking` route using `picking.read` or `picking.write`.
- Server-rendered recent requisition list from staging Supabase.
- Summary counts for recent bills by status where practical.
- Requisition rows showing visible bill number, status, bill type, requester,
  assignee, requested time, and line count.
- Detail route `/picking/[id]` showing bill header, metadata, line items, and
  lifecycle events.
- Clear empty, error, not-configured, signed-out, and access-denied states.
- Compact mobile-friendly layout for operational use.
- Optional staging-only synthetic fixture script if the database has no
  requisitions to verify detail behavior.

### Nice-To-Have Features

- Date/status filters.
- Search by product, requester, assignee, or bill number.
- Create requisition form and server action.
- Product picker against shared catalog.
- In-app status buttons.
- Problem report UI.
- LINE Flex card sending and postback handling.
- Historical V1 Picking import.

### Out Of Scope

- Changing V1 Picking frontend, GAS backend, Sheets, GitHub Pages deployment,
  live URLs, or LINE tokens.
- Writing production data.
- Importing V1 Picking history.
- Creating requisitions or allocating daily bill numbers.
- Reading server-only Picking tables from the UI:
  `picking_requisition_secrets`, `picking_staff_line_accounts`, and
  `picking_daily_sequences`.
- Adding broad app shell redesign work; Main portal polish remains under
  `V2-0017`.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router server components and existing CSS/app shell.
- Backend/server boundary: server-only read helpers under `src/modules/picking`.
- Database: Supabase/Postgres staging tables already applied under
  `public.picking_*`.
- Auth/permissions: `requirePermission({ anyOf: ["picking.read", "picking.write"] })`
  with ADMIN bypass through the existing guard.
- Deployment: V2 local/Preview/Development only; no V1 cutover.

### Data Model / Schema

- Tables involved:
  - `picking_requisitions`
  - `picking_requisition_lines`
  - `picking_requisition_events`
  - optionally `picking_problem_reports` only for problem markers/counts
- Important fields:
  - `bill_date`, `bill_no`, `bill_type`, `status`
  - `requester_name`, `assignee_name`
  - `requested_at`, `picked_at`, `sent_at`, `problem_at`
  - line `product_name`, `requested_qty`, `unit`, `is_free_text`
- Relationships:
  - one requisition has many lines;
  - one requisition has many lifecycle events.
- Constraints:
  - do not add schema changes in this slice unless execution discovers a
    blocker that cannot be solved with existing tables.
  - do not introduce a separate Picking product import; future product search
    should bridge to the shared catalog baseline from `V2-0018`.
- RLS/security notes:
  - use normal authenticated Supabase server reads so table RLS remains part of
    verification;
  - guard routes before querying for user-facing content;
  - never expose service-role or secret data to browser code.

### Integration Points

- V1 references: use `docs/migration/picking-v1-mapping.md` and V1 source as
  behavior references only.
- Supabase: read operational Picking tables through SSR client/RLS.
- Vercel: Preview/Development only unless a later deployment decision changes
  scope.
- LINE/GAS/Sheets/API: no integration in this slice.
- Secrets/env vars: no new secrets; no service-role usage in client code.

## 4. UI/UX And User Flow

### User Flow

1. User signs in.
2. User opens `/picking`.
3. Server checks `picking.read` or `picking.write`.
4. If denied, render the shared access-denied state.
5. If allowed, server queries recent requisitions and renders the list.
6. User opens a requisition detail.
7. Detail page renders header, metadata, lines, and lifecycle events.

### Screens / States

- Screen: `/picking`
  - module header with Pilot status;
  - recent bill summary;
  - responsive list/table of recent requisitions;
  - no create action yet, or a visibly disabled/secondary "planned next" note.
- Screen: `/picking/[id]`
  - visible bill label using `#NNN` when `bill_no` exists;
  - bill status, type, requester, assignee, and timestamps;
  - lines table/list with quantity/unit and free-text marker;
  - lifecycle event timeline.
- Empty state: no requisitions in staging yet; explain that create/import is
  the next slice.
- Loading state: prefer server-rendered content; avoid client auth flicker.
- Error state: compact operational error with no secret details.
- Permission-denied state: shared `AccessDenied` component.
- Mobile behavior: no horizontal overflow at 375px/390px; row content wraps
  before shrinking critical labels.

### System Logic / Pseudocode

```text
guard = requirePermission(anyOf: ["picking.read", "picking.write"])
if guard denied:
  render AccessDenied

list = read recent picking_requisitions
lineCounts = read picking_requisition_lines grouped by requisition_id
render list with summary counts

detail = read picking_requisition by id
if not found:
  render not found
lines = read picking_requisition_lines for id
events = read picking_requisition_events for id
render detail
```

## 5. Task Breakdown

1. Inspect current staging row counts for Picking operational tables.
2. Add server-only read model/types for list and detail queries.
3. Replace `src/app/picking/page.tsx` placeholder with the guarded read-only
   list.
4. Add `src/app/picking/[id]/page.tsx` guarded detail route.
5. Add focused formatting helpers for bill labels, statuses, dates, and
   quantities.
6. If staging has no requisitions, add a staging-only synthetic fixture script
   with an explicit confirmation flag and known project-ref check.
7. Verify admin, Picking writer, Picking reader, guest/denied, and signed-out
   behavior.
8. Verify desktop and mobile browser rendering.
9. Update handoff docs with results and next action.

## 6. Files Expected To Change

- `src/app/picking/page.tsx`
- `src/app/picking/[id]/page.tsx`
- `src/modules/picking/read-model.ts`
- `src/modules/picking/format.ts`
- Optional: `scripts/picking-seed-staging-fixtures.mjs`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 7. Verification Steps

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Browser check `/picking` signed in as ADMIN.
- Browser check `/picking` as Picking writer, Picking reader, and denied user.
- Browser check signed-out route behavior.
- Browser check `/picking/[id]` at desktop and 390px mobile width.
- Confirm UI does not query or render server-only token/contact tables.
- If synthetic fixtures are used, confirm they are staging-only and
  distinguishable from imported V1 data.

## 8. Rollback / No-Production-Impact Note

This plan affects only V2 docs now and, when executed, V2 app routes plus
optional staging-only fixture data. V1 Picking, GAS deployments, Google Sheets,
GitHub Pages, live URLs, LINE tokens, and production traffic remain untouched.

Rollback for the execution slice is to revert the V2 route/helper changes and,
if fixtures were inserted, delete only the synthetic staging rows created by
the fixture script.

## 9. Open Questions

- If staging has no Picking requisitions, approve synthetic fixture rows for
  verification by default? Recommended: yes, staging-only and explicitly
  flagged.
- Should `/picking` show a disabled "New requisition" affordance, or hide it
  until create is implemented? Recommended: show the next-step note, not a
  clickable disabled control.
- Should read-only detail show problem report markers now, or wait until the
  problem workflow slice? Recommended: show only existing problem timestamp/
  status fields, not a full problem UI.

## 10. Handoff Notes

- Executed 2026-06-20. Staging had zero Picking requisitions, so
  `scripts/picking-seed-staging-fixtures.mjs` seeded 4 staging-only fixture
  requisitions (`legacy_source = "v2_fixture"`) before verification.
- Verified ADMIN, PICKING_WRITER, PICKING_READER, GUEST (denied), and
  signed-out behavior against staging with a temporary local Playwright
  install (removed after the run). Fixed an unrelated pre-existing mobile
  overflow bug in the shared `AppShell` sidebar found during 390px checks.
- Next action: `V2-0020` is drafted for the create requisition write slice
  before status/problem workflows or LINE integration, or the user may switch
  to `V2-0017` Main portal direction.
- Blockers: none.
- Related plans: `V2-0009`, `V2-0010`, `V2-0016`, `V2-0018`.
- Related ADRs: `0005`, `0010`, `0012`.
- See `docs/handoff/work-log.md` (2026-06-20 - Picking Read-Only Pilot
  Execution) for full verification detail.
