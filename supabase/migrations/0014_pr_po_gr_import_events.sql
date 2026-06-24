-- Phase 5: PR/PO/GR staging import event types.
--
-- DRAFT migration. Sequential 0014_ prefix used for staging (see
-- supabase/migrations/README.md).
--
-- Plan reference: docs/plans/V2-0044-pr-po-gr-staging-import-slice.md.
-- Widens the existing event-type check constraints only (widen-constraint
-- pattern from 0012). The import-apply script records one audit event per
-- imported header row; neither constraint had a value for that yet (0013's
-- locked lists only cover future write-workflow actions: pr_created,
-- po_created_from_pr/direct, po_closed, po_apv_marked, gr_draft_saved,
-- gr_submitted_for_review, gr_confirmed, gr_reset, gr_recalled,
-- gr_split_updated, gr_corrected). No new tables, no new RPC.

alter table public.purchasing_events
  drop constraint purchasing_events_type_check;

alter table public.purchasing_events
  add constraint purchasing_events_type_check check (
    event_type in (
      'pr_created', 'pr_approved', 'pr_rejected',
      'po_created_from_pr', 'po_created_direct',
      'po_closed', 'po_apv_marked',
      'pr_imported', 'po_imported'
    )
  );

alter table public.receiving_events
  drop constraint receiving_events_type_check;

alter table public.receiving_events
  add constraint receiving_events_type_check check (
    event_type in (
      'gr_draft_saved', 'gr_submitted_for_review', 'gr_confirmed',
      'gr_reset', 'gr_recalled', 'gr_split_updated', 'gr_corrected',
      'gr_imported'
    )
  );
