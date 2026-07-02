-- V2-0052: Create goods receipt from a pending-receipt purchase order.
-- Posture: SECURITY INVOKER (default), EXECUTE granted only to service_role (ADR 0015).

-- 1. Widen receiving_events_type_check to add 'gr_created_from_po'.
alter table receiving_events
  drop constraint receiving_events_type_check;

alter table receiving_events
  add constraint receiving_events_type_check check (
    event_type in (
      'gr_draft_saved',
      'gr_submitted_for_review',
      'gr_confirmed',
      'gr_reset',
      'gr_recalled',
      'gr_split_updated',
      'gr_corrected',
      'gr_imported',
      'gr_created_from_po'
    )
  );

-- 2. Add create_goods_receipt_from_order RPC.
create or replace function public.create_goods_receipt_from_order(
  p_purchase_order_id  uuid,
  p_actor_profile_id   uuid,
  p_actor_name         text,
  p_receipt_date       date,
  p_line_quantities    jsonb,   -- [{po_line_id: uuid, received_qty: numeric}]
  p_remark             text    default null
) returns uuid
language plpgsql
as $$
declare
  v_po_status  text;
  v_gr_id      uuid;
begin
  -- Lock PO row to serialise concurrent GR creation on the same PO.
  select status
  into   v_po_status
  from   purchasing_purchase_orders
  where  id = p_purchase_order_id
  for    update;

  if not found then
    raise exception 'po_not_found';
  end if;

  if v_po_status != 'po_pending_receipt' then
    raise exception 'po_not_pending_receipt';
  end if;

  -- Require at least one entry.
  if jsonb_array_length(p_line_quantities) = 0 then
    raise exception 'no_lines';
  end if;

  -- Validate all submitted po_line_ids belong to this PO.
  if exists (
    select 1
    from   jsonb_array_elements(p_line_quantities) as entry
    where  not exists (
      select 1
      from   purchasing_purchase_order_lines pol
      where  pol.id                = (entry->>'po_line_id')::uuid
        and  pol.purchase_order_id = p_purchase_order_id
    )
  ) then
    raise exception 'invalid_po_line';
  end if;

  -- Require at least one entry with positive received_qty.
  if not exists (
    select 1
    from   jsonb_array_elements(p_line_quantities) as entry
    where  (entry->>'received_qty')::numeric > 0
  ) then
    raise exception 'no_lines';
  end if;

  -- Insert GR header.
  insert into receiving_goods_receipts (
    purchase_order_id,
    receipt_date,
    raw_receipt_date,
    receiver_profile_id,
    receiver_name,
    status,
    raw_status,
    remark,
    legacy_source,
    metadata
  )
  values (
    p_purchase_order_id,
    p_receipt_date,
    to_char(p_receipt_date, 'DD/MM/YYYY'),
    p_actor_profile_id,
    p_actor_name,
    'gr_draft',
    'V2 Draft',
    p_remark,
    'v2_app',
    jsonb_build_object('source_po_id', p_purchase_order_id)
  )
  returning id into v_gr_id;

  -- Insert GR lines for all entries with positive received_qty,
  -- copying product identity from the corresponding PO lines.
  insert into receiving_goods_receipt_lines (
    goods_receipt_id,
    purchase_order_line_id,
    catalog_product_id,
    catalog_alias_id,
    raw_sku,
    raw_product_name,
    received_qty,
    unit,
    is_extra_item
  )
  select
    v_gr_id,
    pol.id,
    pol.catalog_product_id,
    pol.catalog_alias_id,
    pol.raw_sku,
    pol.raw_product_name,
    (entry->>'received_qty')::numeric,
    pol.unit,
    false
  from   jsonb_array_elements(p_line_quantities) as entry
  join   purchasing_purchase_order_lines pol
           on pol.id = (entry->>'po_line_id')::uuid
  where  (entry->>'received_qty')::numeric > 0;

  -- Record the creation event on the GR.
  insert into receiving_events (
    goods_receipt_id,
    event_type,
    actor_profile_id,
    actor_name
  )
  values (
    v_gr_id,
    'gr_created_from_po',
    p_actor_profile_id,
    p_actor_name
  );

  return v_gr_id;
end;
$$;

revoke all on function public.create_goods_receipt_from_order(uuid, uuid, text, date, jsonb, text) from public;
revoke all on function public.create_goods_receipt_from_order(uuid, uuid, text, date, jsonb, text) from anon;
revoke all on function public.create_goods_receipt_from_order(uuid, uuid, text, date, jsonb, text) from authenticated;
grant  execute on function public.create_goods_receipt_from_order(uuid, uuid, text, date, jsonb, text) to service_role;
