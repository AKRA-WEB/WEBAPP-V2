# Plan V2-0010: Picking Product Scope And User Flow

Status: Draft - required before implementing Picking UI or write actions

## Goal

Define the first usable Picking pilot slice before writing production-facing UI
or server actions, so V2 implements the right workflow in a small, testable
shape instead of expanding scope during coding.

## Problem And Users

V1 Picking is live and handles requisition entry, daily visible bill numbers,
LINE-based picking/shipping actions, and problem reporting. The V2 pilot needs
to prove the same operational model against Supabase/Postgres while V1 remains
the live system.

Primary users:

- Requester: creates Picking requisitions from product rows.
- Picker or assignee: sees assigned bills and performs pick/send status actions.
- Supervisor/admin: reviews history, permissions, and pilot correctness.
- Operator reporting a problem: opens a bill-specific problem flow and records
  shortage/issue details.

## MVP Features

The first implementation slice should include only the features needed to prove
the V2 Picking workflow safely:

- Permission-gated `/picking` route.
- Read-only requisition list from staging Supabase data.
- Requisition detail view showing visible `#NNN` bill number, requester,
  assignee, bill type, status, timestamps, and lines.
- Create requisition server action with transaction-safe daily bill number
  allocation.
- Product selection for known products plus explicit handling for free-text or
  unmatched items.
- Basic validation for required requester, assignee, bill type, item name,
  quantity, and unit.
- Server-side permission guard using `picking.write` for create actions.
- Lifecycle event write for created requisitions.
- Mobile-width browser verification for list, detail, and create flow.

## Nice-To-Have Features

These are useful but not part of the first implementation slice:

- LINE Flex card sending and postback handling.
- Problem reporting UI.
- Status transitions from LINE or in-app buttons.
- Rich filters, saved views, date grouping, or analytics.
- Bulk import of historical V1 Picking rows.
- Offline/queued entry behavior.
- Admin tools for editing product/staff master data.
- Exact visual parity with V1 screens beyond the core operational layout.

## Out Of Scope

- Changing V1 Picking frontend, GAS backend, Google Sheets schema, URLs, LINE
  tokens, or GitHub Pages deployment.
- Importing production V1 Picking data before validation tooling exists.
- Connecting V2 Production to live Picking traffic.
- Adding PR/PO/GR, Warehouse, Returns, or KPI workflows.
- Exposing capability tokens, LINE quote tokens, LINE user IDs, or service role
  keys to browser code.
- Building a broad design system or replacing the current app shell.

## User Flow

### Read-Only Pilot Flow

1. User signs in.
2. User opens `/picking`.
3. Server loads the permission snapshot.
4. If the user lacks `picking.read` and `picking.write`, show an access-denied
   state.
5. If allowed, show recent requisitions from staging Supabase.
6. User opens one requisition detail page.
7. Detail page shows bill header, line items, status, and event history.

### Create Requisition Flow

1. User opens `/picking/new`.
2. Server verifies `picking.write`.
3. User selects bill type, requester, assignee, and one or more item rows.
4. UI validates required fields before submit.
5. Server action starts a database transaction.
6. Server allocates the next daily bill number through
   `private.next_picking_bill_no(date)`.
7. Server inserts requisition, lines, and lifecycle event.
8. Server returns the created bill ID and visible `#NNN`.
9. UI redirects to the detail page with a success state.

### Deferred Problem And LINE Flow

1. LINE notification sends after create only after DB create/list is proven.
2. LINE postbacks map to status transitions in a later slice.
3. Problem reporting maps bill-specific issue rows in a later slice.

## Screen Notes

The first UI should stay operational and compact. Use the existing app shell and
avoid decorative cards around every section.

`/picking`:

- Header: module name, status pill, "New requisition" action if writable.
- Summary row: total recent bills, pending, picked, sent.
- List: visible bill number, bill type, requester, assignee, status, requested
  time, line count.
- Empty state: no requisitions in staging yet.
- Denied state: signed-in user lacks Picking permission.

`/picking/[id]`:

- Header: `#NNN`, status, bill type.
- Metadata: requester, assignee, created time, picked/sent/problem timestamps if
  present.
- Lines table: product name, requested quantity, unit, free-text marker.
- Event history: created and later lifecycle events.

`/picking/new`:

- Bill type control.
- Requester and assignee controls.
- Editable line rows with product search/name, quantity, unit, and remove row.
- Submit action with disabled/loading/error states.

## System Logic

Create requisition pseudocode:

```text
require server session
snapshot = getPermissionSnapshot()
if !can(snapshot, "picking.write"):
  deny

validate input
begin transaction
  billNo = next_picking_bill_no(today)
  insert picking_requisitions
  insert picking_requisition_lines
  insert picking_requisition_events(type = "created")
commit
return created id and billNo
```

Read list pseudocode:

```text
require server session
snapshot = getPermissionSnapshot()
if !can(snapshot, "picking.read") && !can(snapshot, "picking.write"):
  return denied state

select recent requisitions with line counts
render list
```

## Data And Integration Points

- Tables are already drafted/applied under `public.picking_*`.
- Daily bill numbers come from `private.next_picking_bill_no(date)`.
- Operational reads must respect `picking.read` or `picking.write`.
- Operational writes should stay server-side/service-role until action-level
  permission checks and audit/event writes are proven.
- LINE integration stays server-side and is deferred until after DB create/list
  behavior is stable.
- V1 Picking source remains read-only reference only.

## Task Breakdown

1. Confirm deployment boundary and staging role matrix from `V2-0009`.
2. Add reusable server permission guard pattern.
3. Build `/picking` read-only list.
4. Build `/picking/[id]` detail view.
5. Build `/picking/new` form without LINE integration.
6. Add server action for create requisition and lifecycle event write.
7. Verify mobile and permission behavior.
8. Decide next slice: LINE notification, in-app status actions, or problem
   reporting.

## Files Expected To Change

- `docs/plans/V2-0010-picking-product-scope-and-flow.md`
- `docs/decisions/0005-picking-product-scope-gate-before-ui.md`
- `docs/plans/V2-0009-next-execution-sequence.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

Future implementation will likely touch:

- `src/app/picking/*`
- `src/modules/picking/*`
- `src/modules/auth/*`
- Focused tests or check scripts if added

## Verification Steps

For this planning change:

- Inspect `git diff --check`.
- Confirm no V1 files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.

For later implementation:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Permission allow/deny checks for admin, Picking writer, Picking reader, and a
  denied user.
- Browser check at mobile width for list/detail/create flows.
- Database verification that each create allocates a distinct daily bill number
  and writes matching lines/events.

## Rollback / No-Production-Impact Note

This plan only adds V2 planning documentation. It does not change application
runtime behavior, staging data, V1 production apps, GAS deployments, Sheets,
GitHub Pages deployments, live URLs, LINE tokens, or Supabase secrets.

## Open Decisions

- Should the first live UI slice include create requisition, or should it stop at
  read-only list/detail until staging data is imported?
- Which non-admin staging roles should be created first: Picking writer,
  Picking reader, and denied user are the minimum recommended set.
- Should V2 preserve V1 behavior where a pending bill with a problem report is
  also treated as picked?
- Should LINE notification be the immediate next slice after create, or should
  in-app status buttons come first for easier staging verification?
