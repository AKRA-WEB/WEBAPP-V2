-- Phase 3: Picking problem reporting.
--
-- DRAFT migration. Sequential 0011_ prefix used for staging (see
-- supabase/migrations/README.md).
--
-- Plan reference: docs/plans/V2-0025-picking-problem-reporting.md.
-- Mirrors the 0009/0010 pattern: a single atomic `public` function (default
-- SECURITY INVOKER, EXECUTE revoked from public/anon/authenticated, granted
-- only to service_role) writes the problem report, its lines, the
-- requisition's problem_by_name/problem_at columns, and a matching
-- lifecycle event in one transaction. No tables/columns are added here:
-- picking_problem_reports / picking_problem_report_lines already exist
-- (0004) and already have authenticated select policies (0005).
--
-- Per ADR 0018, this function never changes picking_requisitions.status —
-- V1's problem.html promotes a pending bill to picked as a side effect;
-- V2 intentionally does not.

create or replace function public.report_picking_problem(
  p_requisition_id uuid,
  p_actor_profile_id uuid,
  p_actor_name text,
  p_lines jsonb
)
returns table (id uuid)
language plpgsql
as $$
declare
  v_status text;
  v_report_id uuid;
  v_line jsonb;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one line is required';
  end if;

  select pr.status into v_status
  from public.picking_requisitions pr
  where pr.id = p_requisition_id
  for update;

  if v_status is null then
    raise exception 'Requisition not found';
  end if;

  if v_status = 'sent' then
    raise exception 'Cannot report a problem on a sent requisition';
  end if;

  insert into public.picking_problem_reports (
    requisition_id, reported_by_name
  ) values (
    p_requisition_id, p_actor_name
  )
  returning public.picking_problem_reports.id into v_report_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.picking_problem_report_lines (
      report_id, line_id, product_name, requested_qty, actual_qty, unit, note
    ) values (
      v_report_id,
      (v_line ->> 'line_id')::uuid,
      v_line ->> 'product_name',
      (v_line ->> 'requested_qty')::numeric,
      (v_line ->> 'actual_qty')::numeric,
      v_line ->> 'unit',
      nullif(v_line ->> 'note', '')
    );
  end loop;

  update public.picking_requisitions pr
    set problem_by_name = p_actor_name, problem_at = now()
    where pr.id = p_requisition_id;

  insert into public.picking_requisition_events (
    requisition_id, event_type, actor_profile_id, actor_name, metadata
  ) values (
    p_requisition_id, 'problem_reported', p_actor_profile_id, p_actor_name,
    jsonb_build_object('report_id', v_report_id)
  );

  return query select v_report_id;
end;
$$;

revoke all on function public.report_picking_problem(uuid, uuid, text, jsonb) from public;
revoke all on function public.report_picking_problem(uuid, uuid, text, jsonb) from anon;
revoke all on function public.report_picking_problem(uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.report_picking_problem(uuid, uuid, text, jsonb) to service_role;
