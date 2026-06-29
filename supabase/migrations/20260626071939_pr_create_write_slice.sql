-- Phase 5: PR create write slice.
--
-- Created via `supabase migration new pr_create_write_slice`.
-- Plan reference: docs/plans/V2-0049-pr-create-write-slice.md.
--
-- Adds one atomic service-role-only RPC for creating a V2-native purchase
-- requisition header, its lines, and the matching lifecycle event. Mirrors ADR
-- 0015: public schema because app server code calls it through PostgREST RPC,
-- default SECURITY INVOKER, EXECUTE revoked from browser roles and granted only
-- to service_role. No authenticated insert/update/delete policies are added.

create or replace function public.create_purchase_requisition(
  p_request_date date,
  p_requester_profile_id uuid,
  p_requester_name text,
  p_lines jsonb
)
returns table (created_id uuid, created_request_number text)
language plpgsql
as $$
declare
  v_request_id uuid;
  v_request_number text;
  v_sequence integer;
  v_line jsonb;
  v_line_no integer := 0;
  v_raw_product_name text;
  v_unit text;
  v_requested_qty numeric;
  v_raw_warehouse text;
  v_day_key text;
begin
  if p_request_date is null then
    raise exception 'Request date is required';
  end if;

  if length(btrim(coalesce(p_requester_name, ''))) = 0 then
    raise exception 'Requester name is required';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one line is required';
  end if;

  -- Small, explicit staging-first sequence guard. This avoids a new counter
  -- table until PR concurrency pressure proves one is needed.
  lock table public.purchasing_purchase_requests in exclusive mode;

  v_day_key := to_char(p_request_date, 'YYYYMMDD');

  select coalesce(
    max((substring(pr.request_number from '^V2-PR-[0-9]{8}-([0-9]{4})$'))::integer),
    0
  ) + 1
    into v_sequence
  from public.purchasing_purchase_requests pr
  where pr.request_number like 'V2-PR-' || v_day_key || '-%';

  v_request_number := 'V2-PR-' || v_day_key || '-' || lpad(v_sequence::text, 4, '0');

  insert into public.purchasing_purchase_requests (
    request_number,
    request_date,
    raw_request_date,
    requester_profile_id,
    requester_name,
    status,
    raw_status,
    legacy_source,
    metadata
  ) values (
    v_request_number,
    p_request_date,
    p_request_date::text,
    p_requester_profile_id,
    btrim(p_requester_name),
    'pr_pending',
    'V2 Pending',
    'v2_app',
    jsonb_build_object('source', 'v2_pr_create_write_slice')
  )
  returning public.purchasing_purchase_requests.id into v_request_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    if jsonb_typeof(v_line) <> 'object' then
      raise exception 'Line payload must be an object';
    end if;

    v_line_no := v_line_no + 1;
    v_raw_product_name := btrim(coalesce(v_line ->> 'raw_product_name', ''));
    v_unit := btrim(coalesce(v_line ->> 'unit', ''));
    v_raw_warehouse := btrim(coalesce(v_line ->> 'raw_warehouse', ''));
    v_requested_qty := nullif(v_line ->> 'requested_qty', '')::numeric;

    if length(v_raw_product_name) = 0 then
      raise exception 'Line % product name is required', v_line_no;
    end if;

    if v_requested_qty is null or v_requested_qty <= 0 then
      raise exception 'Line % quantity must be greater than zero', v_line_no;
    end if;

    if length(v_unit) = 0 then
      raise exception 'Line % unit is required', v_line_no;
    end if;

    if length(v_raw_warehouse) = 0 then
      raise exception 'Line % warehouse is required', v_line_no;
    end if;

    insert into public.purchasing_purchase_request_lines (
      purchase_request_id,
      line_no,
      catalog_product_id,
      catalog_alias_id,
      raw_sku,
      raw_product_name,
      requested_qty,
      unit,
      warehouse_id,
      raw_warehouse,
      remark,
      status,
      raw_status,
      match_status
    ) values (
      v_request_id,
      v_line_no,
      nullif(v_line ->> 'catalog_product_id', '')::uuid,
      nullif(v_line ->> 'catalog_alias_id', '')::uuid,
      nullif(v_line ->> 'raw_sku', ''),
      v_raw_product_name,
      v_requested_qty,
      v_unit,
      nullif(v_line ->> 'warehouse_id', '')::uuid,
      v_raw_warehouse,
      nullif(btrim(coalesce(v_line ->> 'remark', '')), ''),
      'pr_pending',
      'V2 Pending',
      coalesce(nullif(v_line ->> 'match_status', ''), 'matched_code')
    );
  end loop;

  insert into public.purchasing_events (
    purchase_request_id,
    event_type,
    actor_profile_id,
    actor_name,
    metadata
  ) values (
    v_request_id,
    'pr_created',
    p_requester_profile_id,
    btrim(p_requester_name),
    jsonb_build_object('request_number', v_request_number, 'line_count', v_line_no)
  );

  return query select v_request_id, v_request_number;
end;
$$;

revoke all on function public.create_purchase_requisition(date, uuid, text, jsonb) from public;
revoke all on function public.create_purchase_requisition(date, uuid, text, jsonb) from anon;
revoke all on function public.create_purchase_requisition(date, uuid, text, jsonb) from authenticated;
grant execute on function public.create_purchase_requisition(date, uuid, text, jsonb) to service_role;
