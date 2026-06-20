-- Phase 3: Picking create requisition write slice.
--
-- DRAFT migration. Sequential 0009_ prefix used for staging (see
-- supabase/migrations/README.md).
--
-- Plan reference: docs/plans/V2-0020-picking-create-requisition-write-slice.md.
-- Adds a nullable bridge from Picking lines to the shared catalog (V2-0018)
-- and a single atomic create-requisition function so the daily bill number
-- allocation, requisition insert, line inserts, and created event insert
-- happen in one transaction.
--
-- Verified against staging (2026-06-20): only `public` (and
-- `graphql_public`) are exposed PostgREST schemas (PGRST106 when probing
-- `private` directly), so a function reachable via `supabase.rpc()` must
-- live in `public`. It is declared without SECURITY DEFINER (default
-- SECURITY INVOKER) and EXECUTE is revoked from public/anon/authenticated and
-- granted only to service_role, so it only ever runs as service_role, which
-- already bypasses RLS and already holds EXECUTE on
-- private.next_picking_bill_no(date) and INSERT on the picking_* tables
-- (migrations 0004/0005). This matches the
-- "operational mutations remain server-side/service-role only" rule in
-- docs/migration/database-strategy.md while keeping next_picking_bill_no
-- itself private and unexposed.

alter table public.picking_requisition_lines
  add column catalog_product_id uuid references public.catalog_products (id) on delete set null,
  add column catalog_alias_id uuid references public.catalog_product_aliases (id) on delete set null;

create index picking_requisition_lines_catalog_product_idx
  on public.picking_requisition_lines (catalog_product_id);

create index picking_requisition_lines_catalog_alias_idx
  on public.picking_requisition_lines (catalog_alias_id);

create or replace function public.create_picking_requisition(
  p_bill_type text,
  p_bill_date date,
  p_requester_profile_id uuid,
  p_requester_name text,
  p_assignee_staff_id uuid,
  p_assignee_name text,
  p_lines jsonb
)
returns table (id uuid, bill_no integer)
language plpgsql
as $$
declare
  v_bill_no integer;
  v_requisition_id uuid;
  v_line jsonb;
  v_line_no integer := 0;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one line is required';
  end if;

  v_bill_no := private.next_picking_bill_no(p_bill_date);

  insert into public.picking_requisitions (
    bill_date, bill_no, bill_type, status,
    requester_profile_id, requester_name,
    assignee_staff_id, assignee_name,
    legacy_source
  ) values (
    p_bill_date, v_bill_no, p_bill_type, 'pending',
    p_requester_profile_id, p_requester_name,
    p_assignee_staff_id, p_assignee_name,
    'v2_app'
  )
  returning public.picking_requisitions.id into v_requisition_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_line_no := v_line_no + 1;

    insert into public.picking_requisition_lines (
      requisition_id, line_no,
      catalog_product_id, catalog_alias_id,
      product_name, requested_qty, unit, is_free_text
    ) values (
      v_requisition_id,
      v_line_no,
      (v_line ->> 'catalog_product_id')::uuid,
      (v_line ->> 'catalog_alias_id')::uuid,
      v_line ->> 'product_name',
      (v_line ->> 'requested_qty')::numeric,
      v_line ->> 'unit',
      coalesce((v_line ->> 'is_free_text')::boolean, false)
    );
  end loop;

  insert into public.picking_requisition_events (
    requisition_id, event_type, actor_profile_id, actor_name
  ) values (
    v_requisition_id, 'created', p_requester_profile_id, p_requester_name
  );

  return query select v_requisition_id, v_bill_no;
end;
$$;

revoke all on function public.create_picking_requisition(text, date, uuid, text, uuid, text, jsonb) from public;
revoke all on function public.create_picking_requisition(text, date, uuid, text, uuid, text, jsonb) from anon;
revoke all on function public.create_picking_requisition(text, date, uuid, text, uuid, text, jsonb) from authenticated;
grant execute on function public.create_picking_requisition(text, date, uuid, text, uuid, text, jsonb) to service_role;
