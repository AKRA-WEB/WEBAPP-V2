-- Phase 3: Picking LINE notification/failure recovery.
--
-- DRAFT migration. Sequential 0012_ prefix used for staging (see
-- supabase/migrations/README.md).
--
-- Plan reference: docs/plans/V2-0027-picking-line-notification-failure-recovery.md.
-- Widens the existing event-type check constraint only. No new tables, no new
-- RPC: the notification send/skip/fail outcome is a single
-- picking_requisition_events insert (plus an optional secrets upsert on a
-- real send success) via the existing service-role admin client, which
-- already holds insert grants on both tables from 0005. Failure does not
-- change picking_requisitions.status (V1-faithful, non-blocking; see the
-- plan's "Decision: Failure Does Not Block Status" section) — line_push_failed
-- was already a valid event type from 0004, this migration only adds the
-- success/skip counterparts.

alter table public.picking_requisition_events
  drop constraint picking_requisition_events_type_check;

alter table public.picking_requisition_events
  add constraint picking_requisition_events_type_check check (
    event_type in (
      'created', 'line_push_failed', 'picked', 'problem_reported',
      'sent', 'cancelled', 'line_notification_sent', 'line_notification_skipped'
    )
  );
