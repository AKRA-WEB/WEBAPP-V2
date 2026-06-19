-- Phase 3: Picking pilot RLS policies + explicit grants.
-- DRAFT migration (see 0004 header and supabase/migrations/README.md).
--
-- Operational reads are available to authenticated users with Picking
-- permissions. Mutations, token/contact reads, LINE integration, and daily bill
-- number allocation stay server-side through the service role.

alter table public.picking_products             enable row level security;
alter table public.picking_staff                enable row level security;
alter table public.picking_staff_line_accounts  enable row level security;
alter table public.picking_requisitions         enable row level security;
alter table public.picking_requisition_lines    enable row level security;
alter table public.picking_requisition_secrets  enable row level security;
alter table public.picking_problem_reports      enable row level security;
alter table public.picking_problem_report_lines enable row level security;
alter table public.picking_requisition_events   enable row level security;
alter table public.picking_daily_sequences      enable row level security;

-- Normalize grants first so older Supabase projects with legacy default
-- privileges do not keep broader Data API access than this migration intends.
revoke all on
  public.picking_products,
  public.picking_staff,
  public.picking_staff_line_accounts,
  public.picking_requisitions,
  public.picking_requisition_lines,
  public.picking_requisition_secrets,
  public.picking_problem_reports,
  public.picking_problem_report_lines,
  public.picking_requisition_events,
  public.picking_daily_sequences
  from public, anon, authenticated;

grant select on
  public.picking_products,
  public.picking_staff,
  public.picking_requisitions,
  public.picking_requisition_lines,
  public.picking_problem_reports,
  public.picking_problem_report_lines,
  public.picking_requisition_events
  to authenticated;

grant select, insert, update, delete on
  public.picking_products,
  public.picking_staff,
  public.picking_staff_line_accounts,
  public.picking_requisitions,
  public.picking_requisition_lines,
  public.picking_requisition_secrets,
  public.picking_problem_reports,
  public.picking_problem_report_lines,
  public.picking_requisition_events,
  public.picking_daily_sequences
  to service_role;

-- Products and staff are operational reference data. No authenticated writes.
create policy "picking_products_select_permission" on public.picking_products
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

create policy "picking_staff_select_permission" on public.picking_staff
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

-- Requisition operational data. Capability token hashes and LINE quote tokens
-- live in picking_requisition_secrets and are not granted to authenticated.
create policy "picking_requisitions_select_permission" on public.picking_requisitions
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

create policy "picking_requisition_lines_select_permission" on public.picking_requisition_lines
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

create policy "picking_problem_reports_select_permission" on public.picking_problem_reports
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

create policy "picking_problem_report_lines_select_permission" on public.picking_problem_report_lines
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

create policy "picking_requisition_events_select_permission" on public.picking_requisition_events
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'picking.read'))
    or (select private.has_permission((select auth.uid()), 'picking.write'))
  );

-- No authenticated policies are intentionally defined for:
-- - picking_staff_line_accounts
-- - picking_requisition_secrets
-- - picking_daily_sequences
--
-- Those tables are server-only even though they live in public for now.
