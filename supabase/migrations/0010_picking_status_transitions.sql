-- Phase 3: Picking status transitions (pending -> picked -> sent).
--
-- DRAFT migration. Sequential 0010_ prefix used for staging (see
-- supabase/migrations/README.md).
--
-- Plan reference: docs/plans/V2-0023-picking-status-transitions.md.
-- Mirrors the 0009 create-requisition pattern: a single atomic `public`
-- function (default SECURITY INVOKER, EXECUTE revoked from
-- public/anon/authenticated, granted only to service_role) updates status and
-- writes the matching lifecycle event in one statement. V1 mapping
-- (docs/migration/picking-v1-mapping.md) only allows pending -> picked and
-- picked -> sent; pending -> sent is blocked. cancelled/line_push_failed and
-- problem reporting stay out of scope for this slice.

create or replace function public.transition_picking_requisition_status(
  p_requisition_id uuid,
  p_target_status text,
  p_actor_profile_id uuid,
  p_actor_name text
)
returns table (id uuid, status text)
language plpgsql
as $$
declare
  v_current_status text;
begin
  if p_target_status not in ('picked', 'sent') then
    raise exception 'Unsupported target status: %', p_target_status;
  end if;

  select pr.status into v_current_status
  from public.picking_requisitions pr
  where pr.id = p_requisition_id
  for update;

  if v_current_status is null then
    raise exception 'Requisition not found';
  end if;

  if p_target_status = 'picked' and v_current_status <> 'pending' then
    raise exception 'Cannot transition % to picked', v_current_status;
  end if;

  if p_target_status = 'sent' and v_current_status <> 'picked' then
    raise exception 'Cannot transition % to sent', v_current_status;
  end if;

  if p_target_status = 'picked' then
    update public.picking_requisitions pr
      set status = 'picked', picked_by_name = p_actor_name, picked_at = now()
      where pr.id = p_requisition_id;
  else
    update public.picking_requisitions pr
      set status = 'sent', sent_by_name = p_actor_name, sent_at = now()
      where pr.id = p_requisition_id;
  end if;

  insert into public.picking_requisition_events (
    requisition_id, event_type, actor_profile_id, actor_name
  ) values (
    p_requisition_id, p_target_status, p_actor_profile_id, p_actor_name
  );

  return query select p_requisition_id, p_target_status;
end;
$$;

revoke all on function public.transition_picking_requisition_status(uuid, text, uuid, text) from public;
revoke all on function public.transition_picking_requisition_status(uuid, text, uuid, text) from anon;
revoke all on function public.transition_picking_requisition_status(uuid, text, uuid, text) from authenticated;
grant execute on function public.transition_picking_requisition_status(uuid, text, uuid, text) to service_role;
