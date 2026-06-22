# Decision Board

Last updated: 2026-06-22

This board is for project-level decisions and recommended next actions. The
source-of-truth implementation status remains `docs/plans/index.md`.

## Recommended Next Move

Prepare the Picking cutover package next.

Reason:

- Main portal is complete.
- Picking create, status transitions, problem reporting (`V2-0025`), and LINE
  notification/failure recovery (`V2-0027`) are all complete.
- The cutover package is the last item in `V2-0022`'s Picking-closeout chain
  before PR/PO/GR foundation planning starts.
- Real LINE sends still need credentials + explicit approval; the cutover
  package should explicitly note this as a follow-up, not a blocker.

Suggested command:

```text
Go: ทำ Picking cutover package ตาม V2-0022 ต่อจาก V2-0027
```

## Near-Term Queue

| Order | Work | Why Now | Decision Needed |
| --- | --- | --- | --- |
| 1 | Picking problem reporting | Completes shortage/exception workflow before LINE | Done (`V2-0025`, 2026-06-20): pending/picked bills stay in their current status when a problem is reported |
| 2 | Picking LINE notification/failure recovery | Needed before realistic pilot/cutover | Done (`V2-0027`, 2026-06-22): disabled/dry-run by default, event-only failure (status untouched), retry action; real sends still unproven |
| 3 | Picking cutover package | Lets user decide whether V2 Picking can replace V1 Picking | Resolved: keep V1 history as read-only archive |
| 4 | PR/PO/GR foundation plan | Next dependency group after Picking | Decide grouped cutover vs staged PR/PO/GR |
| 5 | Placeholder route guard pass | Prevents future route content from inheriting open placeholders | Can be bundled before non-Picking real content |

## Resolved Decisions

### Picking Problem Behavior

Decision: do not mark a `pending` bill as `picked` when a problem report is
submitted.

Implication: problem reporting is an exception record only. Picking status must
change through explicit status-transition actions.

### Picking History Strategy

Decision: keep V1 Picking history as a read-only archive for backward lookup.
Do not import V1 Picking requisition history into V2 for the first cutover
package.

Implication: cutover package must document where operators/admins can read old
V1 records after switching new Picking work to V2.

### LINE Staging Policy

Decision: use disabled send/dry-run mode first. Real LINE sends require later
explicit approval.

Implication: LINE implementation should record intended payload/result in V2
without sending external messages until approved.

Implemented (`V2-0027`, 2026-06-22): `PICKING_LINE_PUSH_ENABLED` defaults to
disabled; every notification attempt is recorded as a
`picking_requisition_events` row only and never changes
`picking_requisitions.status` (V1-faithful — V1's own push failure is
non-blocking). The reserved `line_push_failed` *status* value (migration
`0004`) stays unused by design; a writer/admin "Retry LINE notification"
button reads the *event* log instead. Real sends remain unproven — no
staging LINE credentials exist yet.

## Open Decisions

### PR/PO/GR Release Shape

Recommended: design PR/PO/GR schema together, but release only after an
end-to-end PR -> PO -> GR staging flow passes.

Why: V1 behavior is tightly coupled around direct PO identity, receiving, and
matching.

## Watch List

- Non-Picking placeholder routes are currently reachable by direct URL and
  should receive server-side guards before real content is added.
- Vercel deployed-create was noted as not separately exercised through a
  deployed Preview/Development build after `V2-0020`; the same caveat now
  also applies to the LINE real-send branch added in `V2-0027`.
- LINE real-send path (`fetch` to the Messaging API) is implemented but
  unproven — needs real `LINE_CHANNEL_TOKEN`/`LINE_GROUP_ID` plus explicit
  approval before any real send test.
- Active work-log length should stay below the context budget; archive before
  it becomes the default history dump again.
