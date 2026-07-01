-- Phase 5: PR approve/reject write slice.
--
-- Created via `supabase migration new pr_approve_reject_slice`.
-- Plan reference: docs/plans/V2-0050-pr-approve-reject-slice.md.
--
-- Adds one atomic service-role-only RPC for terminal Purchase Requisition
-- transitions. Mirrors ADR 0015: public schema because app server code calls it
-- through PostgREST RPC, default SECURITY INVOKER, EXECUTE revoked from browser
-- roles and granted only to service_role. No authenticated update/delete
-- policies are added.

create or replace function public.transition_purchase_requisition_status(
  p_request_id uuid,
  p_target_status text,
  p_actor_profile_id uuid,
  p_actor_name text,
  p_rejected_reason text default null
)
returns table (id uuid, status text)
language plpgsql
as $$
declare
  v_current_status text;
  v_rejected_reason text;
  v_raw_status text;
begin
  if p_request_id is null then
    raise exception 'Purchase requisition id is required';
  end if;

  if p_target_status not in ('pr_approved', 'pr_rejected') then
    raise exception 'Unsupported target status: %', p_target_status;
  end if;

  if p_actor_profile_id is null then
    raise exception 'Actor profile id is required';
  end if;

  if length(btrim(coalesce(p_actor_name, ''))) = 0 then
    raise exception 'Actor name is required';
  end if;

  v_rejected_reason := nullif(btrim(coalesce(p_rejected_reason, '')), '');
  if p_target_status = 'pr_rejected' and v_rejected_reason is null then
    raise exception 'Rejection reason is required';
  end if;

  select pr.status into v_current_status
  from public.purchasing_purchase_requests pr
  where pr.id = p_request_id
  for update;

  if v_current_status is null then
    raise exception 'Purchase requisition not found';
  end if;

  if v_current_status <> 'pr_pending' then
    raise exception 'Cannot transition % to %', v_current_status, p_target_status;
  end if;

  v_raw_status := case
    when p_target_status = 'pr_approved' then 'V2 Approved'
    else 'V2 Rejected'
  end;

  update public.purchasing_purchase_requests pr
    set
      status = p_target_status,
      raw_status = v_raw_status,
      approved_by_profile_id = case
        when p_target_status = 'pr_approved' then p_actor_profile_id
        else null
      end,
      approved_by_name = case
        when p_target_status = 'pr_approved' then btrim(p_actor_name)
        else null
      end,
      approved_at = case
        when p_target_status = 'pr_approved' then now()
        else null
      end,
      rejected_reason = case
        when p_target_status = 'pr_rejected' then v_rejected_reason
        else null
      end,
      metadata = coalesce(pr.metadata, '{}'::jsonb) || jsonb_build_object(
        'last_transition_source', 'v2_pr_approve_reject_slice'
      )
    where pr.id = p_request_id;

  update public.purchasing_purchase_request_lines line
    set
      status = p_target_status,
      raw_status = v_raw_status
    where line.purchase_request_id = p_request_id;

  insert into public.purchasing_events (
    purchase_request_id,
    event_type,
    actor_profile_id,
    actor_name,
    metadata
  ) values (
    p_request_id,
    p_target_status,
    p_actor_profile_id,
    btrim(p_actor_name),
    jsonb_build_object(
      'target_status', p_target_status,
      'rejected_reason', v_rejected_reason
    )
  );

  return query select p_request_id, p_target_status;
end;
$$;

revoke all on function public.transition_purchase_requisition_status(uuid, text, uuid, text, text) from public;
revoke all on function public.transition_purchase_requisition_status(uuid, text, uuid, text, text) from anon;
revoke all on function public.transition_purchase_requisition_status(uuid, text, uuid, text, text) from authenticated;
grant execute on function public.transition_purchase_requisition_status(uuid, text, uuid, text, text) to service_role;
