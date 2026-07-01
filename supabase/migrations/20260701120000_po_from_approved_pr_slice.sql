-- V2-0051: Create purchase order from an approved purchase requisition.
-- Posture: SECURITY INVOKER (default), EXECUTE granted only to service_role (ADR 0015).
-- The caller (server action) already holds service_role via createAdminClient(), so
-- RLS is bypassed there; this function itself runs with the invoker's privileges.

create or replace function public.create_purchase_order_from_requisition(
  p_request_id        uuid,
  p_actor_profile_id  uuid,
  p_actor_name        text,
  p_vendor_id         uuid,
  p_po_date           date,
  p_expected_date     date    default null,
  p_note              text    default null
)
returns table (po_id uuid, po_number text)
language plpgsql
as $$
declare
  v_pr_status              text;
  v_request_number         text;
  v_line_count             integer;
  v_null_warehouse_count   integer;
  v_distinct_warehouse_count integer;
  v_common_warehouse_id    uuid;
  v_common_raw_warehouse   text;
  v_vendor_name            text;
  v_date_str               text;
  v_next_suffix            integer;
  v_po_number_val          text;
  v_po_id_val              uuid;
begin
  -- Lock PR row for update so concurrent PO-creation calls on the same PR serialise.
  select status, request_number
  into   v_pr_status, v_request_number
  from   purchasing_purchase_requests
  where  id = p_request_id
  for    update;

  if not found then
    raise exception 'pr_not_found';
  end if;

  if v_pr_status != 'pr_approved' then
    raise exception 'pr_not_approved';
  end if;

  -- Count lines and validate warehouse uniformity in one pass.
  select
    count(*) filter (where warehouse_id is null),
    count(distinct warehouse_id),
    count(*)
  into
    v_null_warehouse_count,
    v_distinct_warehouse_count,
    v_line_count
  from purchasing_purchase_request_lines
  where purchase_request_id = p_request_id;

  if v_line_count = 0 then
    raise exception 'pr_no_lines';
  end if;

  -- Mixed-warehouse PRs (including any null warehouse_id) are unsupported in MVP.
  if v_null_warehouse_count > 0 or v_distinct_warehouse_count != 1 then
    raise exception 'pr_mixed_warehouse';
  end if;

  -- Grab the single common warehouse from the first line.
  select warehouse_id, raw_warehouse
  into   v_common_warehouse_id, v_common_raw_warehouse
  from   purchasing_purchase_request_lines
  where  purchase_request_id = p_request_id
  limit  1;

  -- Validate vendor is active.
  select display_name
  into   v_vendor_name
  from   catalog_vendors
  where  id = p_vendor_id and is_active = true;

  if not found then
    raise exception 'vendor_not_found';
  end if;

  -- Guard against duplicate: check PO lines already linked to any PR line.
  if exists (
    select 1
    from   purchasing_purchase_order_lines pol
    join   purchasing_purchase_request_lines prl
             on prl.id = pol.purchase_request_line_id
    where  prl.purchase_request_id = p_request_id
  ) then
    raise exception 'po_already_exists';
  end if;

  -- Guard against duplicate: check PO header bill identity.
  if exists (
    select 1
    from   purchasing_purchase_orders
    where  legacy_source       = 'v2_app'
      and  bill_identity_kind  = 'pr_uid'
      and  bill_identity_value = p_request_id::text
  ) then
    raise exception 'po_already_exists';
  end if;

  -- Lock table to make V2 PO number allocation serialise across concurrent calls.
  lock table purchasing_purchase_orders in share row exclusive mode;

  v_date_str := to_char(p_po_date, 'YYYYMMDD');

  select coalesce(
    max(cast(substring(ppo.po_number from '^V2-PO-\d{8}-(\d+)$') as integer)),
    0
  ) + 1
  into v_next_suffix
  from purchasing_purchase_orders ppo
  where ppo.po_number ~ ('^V2-PO-' || v_date_str || '-\d+$')
    and ppo.legacy_source = 'v2_app';

  v_po_number_val := 'V2-PO-' || v_date_str || '-' || lpad(v_next_suffix::text, 4, '0');

  -- Insert PO header.
  insert into purchasing_purchase_orders (
    po_number,
    po_date,
    raw_po_date,
    vendor_id,
    raw_vendor_name,
    warehouse_id,
    raw_warehouse,
    expected_date,
    raw_expected_date,
    expected_date_source,
    status,
    raw_status,
    bill_identity_kind,
    bill_identity_value,
    legacy_source,
    is_direct,
    is_legacy_ambiguous,
    metadata
  )
  values (
    v_po_number_val,
    p_po_date,
    to_char(p_po_date, 'DD/MM/YYYY'),
    p_vendor_id,
    v_vendor_name,
    v_common_warehouse_id,
    v_common_raw_warehouse,
    p_expected_date,
    case when p_expected_date is not null then to_char(p_expected_date, 'DD/MM/YYYY') else null end,
    case when p_expected_date is not null then 'v2_user' else null end,
    'po_pending_receipt',
    'V2 Pending Receipt',
    'pr_uid',
    p_request_id::text,
    'v2_app',
    false,
    false,
    jsonb_build_object(
      'source_pr_id',     p_request_id,
      'source_pr_number', v_request_number,
      'note',             p_note
    )
  )
  returning id into v_po_id_val;

  -- Insert one PO line per PR line, copying all relevant fields.
  insert into purchasing_purchase_order_lines (
    purchase_order_id,
    purchase_request_line_id,
    line_no,
    catalog_product_id,
    catalog_alias_id,
    raw_sku,
    raw_product_name,
    ordered_qty,
    unit,
    remark,
    pr_number_label,
    raw_po_date,
    status,
    raw_status,
    match_status
  )
  select
    v_po_id_val,
    id,
    line_no,
    catalog_product_id,
    catalog_alias_id,
    raw_sku,
    raw_product_name,
    requested_qty,
    unit,
    remark,
    v_request_number,
    to_char(p_po_date, 'DD/MM/YYYY'),
    'po_pending_receipt',
    'V2 Pending Receipt',
    match_status
  from purchasing_purchase_request_lines
  where purchase_request_id = p_request_id
  order by line_no;

  -- Record the creation event on the PO.
  insert into purchasing_events (
    purchase_order_id,
    event_type,
    actor_profile_id,
    actor_name
  )
  values (
    v_po_id_val,
    'po_created_from_pr',
    p_actor_profile_id,
    p_actor_name
  );

  return query select v_po_id_val, v_po_number_val;
end;
$$;

revoke all on function public.create_purchase_order_from_requisition(uuid, uuid, text, uuid, date, date, text) from public;
revoke all on function public.create_purchase_order_from_requisition(uuid, uuid, text, uuid, date, date, text) from anon;
revoke all on function public.create_purchase_order_from_requisition(uuid, uuid, text, uuid, date, date, text) from authenticated;
grant  execute on function public.create_purchase_order_from_requisition(uuid, uuid, text, uuid, date, date, text) to service_role;
