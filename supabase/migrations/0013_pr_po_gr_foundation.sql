-- Phase 5: PR/PO/GR foundation (schema/RLS only).
--
-- DRAFT migration. Sequential 0013_ prefix used for staging (see
-- supabase/migrations/README.md). Locked by ADR 0020
-- (docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md) from the dry-run
-- report in docs/migration/pr-po-gr-v1-mapping.md.
--
-- Scope: tables, indexes, constraints, RLS, and explicit grants only. No
-- PR/PO/GR row import, no runtime UI, no notification sends, and no
-- transaction RPCs in this migration (see plan
-- docs/plans/V2-0036-pr-po-gr-foundation.md, task breakdown item 4).
--
-- Header/line split mirrors V1: each V1 PR/PO/GR sheet row is one line item.
-- purchasing_purchase_requests / purchasing_purchase_orders /
-- receiving_goods_receipts are V2-only groupings of those rows (PR by
-- PR_Number, PO by V1's poBillGroupKey() identity, GR conservatively by
-- resolved PO bill + receipt date/ATA/receiver/status/remark).

create table public.purchasing_purchase_requests (
  id                     uuid primary key default gen_random_uuid(),
  request_number         text,
  request_date           date,
  raw_request_date        text,
  requester_profile_id     uuid references public.profiles (id) on delete set null,
  requester_name           text not null,
  status                   text not null default 'pr_pending',
  raw_status               text,
  approved_by_profile_id   uuid references public.profiles (id) on delete set null,
  approved_by_name         text,
  approved_at              timestamptz,
  rejected_reason          text,
  legacy_source            text,
  source_file              text,
  source_row               integer,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint purchasing_purchase_requests_requester_not_blank
    check (length(btrim(requester_name)) > 0),
  constraint purchasing_purchase_requests_status_check check (
    status in ('pr_pending', 'pr_approved', 'pr_rejected')
  )
);

create unique index purchasing_purchase_requests_request_number_uidx
  on public.purchasing_purchase_requests (request_number)
  where request_number is not null;

create index purchasing_purchase_requests_requester_profile_idx
  on public.purchasing_purchase_requests (requester_profile_id);

create index purchasing_purchase_requests_approved_by_profile_idx
  on public.purchasing_purchase_requests (approved_by_profile_id);

create index purchasing_purchase_requests_status_date_idx
  on public.purchasing_purchase_requests (status, request_date desc);

create trigger purchasing_purchase_requests_set_updated_at
  before update on public.purchasing_purchase_requests
  for each row execute function public.set_updated_at();


create table public.purchasing_purchase_request_lines (
  id                    uuid primary key default gen_random_uuid(),
  purchase_request_id    uuid not null references public.purchasing_purchase_requests (id) on delete cascade,
  legacy_pr_uid           text,
  line_no                 integer not null,
  catalog_product_id      uuid references public.catalog_products (id) on delete set null,
  catalog_alias_id        uuid references public.catalog_product_aliases (id) on delete set null,
  raw_sku                 text,
  raw_product_name        text not null,
  requested_qty            numeric(12, 3) not null,
  unit                      text not null,
  warehouse_id              uuid references public.warehouse_warehouses (id) on delete set null,
  raw_warehouse             text,
  remark                    text,
  status                    text not null default 'pr_pending',
  raw_status                text,
  match_status              text,
  created_at                 timestamptz not null default now(),
  constraint purchasing_purchase_request_lines_line_no_positive check (line_no > 0),
  constraint purchasing_purchase_request_lines_qty_positive check (requested_qty > 0),
  constraint purchasing_purchase_request_lines_product_name_not_blank
    check (length(btrim(raw_product_name)) > 0),
  constraint purchasing_purchase_request_lines_unit_not_blank
    check (length(btrim(unit)) > 0),
  constraint purchasing_purchase_request_lines_status_check check (
    status in ('pr_pending', 'pr_approved', 'pr_rejected')
  ),
  constraint purchasing_purchase_request_lines_unique_line unique (purchase_request_id, line_no)
);

create unique index purchasing_purchase_request_lines_legacy_pr_uid_uidx
  on public.purchasing_purchase_request_lines (legacy_pr_uid)
  where legacy_pr_uid is not null;

create index purchasing_purchase_request_lines_request_idx
  on public.purchasing_purchase_request_lines (purchase_request_id);

create index purchasing_purchase_request_lines_catalog_product_idx
  on public.purchasing_purchase_request_lines (catalog_product_id);

create index purchasing_purchase_request_lines_catalog_alias_idx
  on public.purchasing_purchase_request_lines (catalog_alias_id);

create index purchasing_purchase_request_lines_warehouse_idx
  on public.purchasing_purchase_request_lines (warehouse_id);


create table public.purchasing_purchase_orders (
  id                       uuid primary key default gen_random_uuid(),
  po_number                 text not null,
  po_date                   date,
  raw_po_date               text,
  vendor_id                 uuid references public.catalog_vendors (id) on delete set null,
  raw_vendor_name           text,
  warehouse_id              uuid references public.warehouse_warehouses (id) on delete set null,
  raw_warehouse             text,
  expected_date             date,
  raw_expected_date         text,
  expected_date_source      text,
  status                    text not null default 'po_pending_receipt',
  raw_status                text,
  closed_by_profile_id      uuid references public.profiles (id) on delete set null,
  closed_by_name            text,
  closed_at                 timestamptz,
  bill_identity_kind        text not null,
  bill_identity_value       text,
  legacy_ref_pr_uid         text,
  legacy_group_key          text,
  is_direct                 boolean not null default false,
  is_legacy_ambiguous       boolean not null default false,
  legacy_source             text,
  source_file               text,
  source_row                integer,
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint purchasing_purchase_orders_po_number_not_blank
    check (length(btrim(po_number)) > 0),
  constraint purchasing_purchase_orders_status_check check (
    status in ('po_pending_receipt', 'po_closed_apv_ready')
  ),
  constraint purchasing_purchase_orders_bill_identity_kind_check check (
    bill_identity_kind in ('pr_uid', 'direct_stable', 'legacy_direct', 'v2_direct')
  )
);

-- Bill identity uniqueness per V1's poBillGroupKey(): a non-blank,
-- non-bare-"DIRECT" Ref_PR_UID is the bill identity by itself (see
-- docs/migration/pr-po-gr-v1-mapping.md). Legacy bare "DIRECT" rows are
-- imported as bill_identity_kind = 'legacy_direct' with no usable
-- bill_identity_value, so they are excluded from this uniqueness check by
-- design (the partial index only covers rows with a real identity value).
create unique index purchasing_purchase_orders_bill_identity_uidx
  on public.purchasing_purchase_orders (legacy_source, bill_identity_kind, bill_identity_value)
  where bill_identity_value is not null;

create index purchasing_purchase_orders_status_date_idx
  on public.purchasing_purchase_orders (status, po_date desc);

create index purchasing_purchase_orders_warehouse_status_date_idx
  on public.purchasing_purchase_orders (warehouse_id, status, po_date desc);

create index purchasing_purchase_orders_vendor_date_idx
  on public.purchasing_purchase_orders (vendor_id, po_date desc);

create index purchasing_purchase_orders_closed_by_profile_idx
  on public.purchasing_purchase_orders (closed_by_profile_id);

create trigger purchasing_purchase_orders_set_updated_at
  before update on public.purchasing_purchase_orders
  for each row execute function public.set_updated_at();


create table public.purchasing_purchase_order_lines (
  id                       uuid primary key default gen_random_uuid(),
  purchase_order_id          uuid not null references public.purchasing_purchase_orders (id) on delete cascade,
  purchase_request_line_id   uuid references public.purchasing_purchase_request_lines (id) on delete set null,
  legacy_po_uid               text,
  line_no                      integer not null,
  catalog_product_id           uuid references public.catalog_products (id) on delete set null,
  catalog_alias_id              uuid references public.catalog_product_aliases (id) on delete set null,
  raw_sku                       text,
  raw_product_name              text not null,
  ordered_qty                    numeric(12, 3) not null,
  unit                            text not null,
  remark                          text,
  pr_number_label                 text,
  raw_po_date                      text,
  status                           text not null default 'po_pending_receipt',
  raw_status                       text,
  match_status                     text,
  created_at                        timestamptz not null default now(),
  constraint purchasing_purchase_order_lines_line_no_positive check (line_no > 0),
  constraint purchasing_purchase_order_lines_qty_positive check (ordered_qty > 0),
  constraint purchasing_purchase_order_lines_product_name_not_blank
    check (length(btrim(raw_product_name)) > 0),
  constraint purchasing_purchase_order_lines_unit_not_blank
    check (length(btrim(unit)) > 0),
  constraint purchasing_purchase_order_lines_status_check check (
    status in ('po_pending_receipt', 'po_closed_apv_ready')
  ),
  constraint purchasing_purchase_order_lines_unique_line unique (purchase_order_id, line_no)
);

create unique index purchasing_purchase_order_lines_legacy_po_uid_uidx
  on public.purchasing_purchase_order_lines (legacy_po_uid)
  where legacy_po_uid is not null;

create index purchasing_purchase_order_lines_order_idx
  on public.purchasing_purchase_order_lines (purchase_order_id);

create index purchasing_purchase_order_lines_request_line_idx
  on public.purchasing_purchase_order_lines (purchase_request_line_id);

create index purchasing_purchase_order_lines_catalog_product_idx
  on public.purchasing_purchase_order_lines (catalog_product_id);

create index purchasing_purchase_order_lines_catalog_alias_idx
  on public.purchasing_purchase_order_lines (catalog_alias_id);


create table public.purchasing_events (
  id                        uuid primary key default gen_random_uuid(),
  purchase_request_id         uuid references public.purchasing_purchase_requests (id) on delete cascade,
  purchase_request_line_id    uuid references public.purchasing_purchase_request_lines (id) on delete cascade,
  purchase_order_id            uuid references public.purchasing_purchase_orders (id) on delete cascade,
  purchase_order_line_id        uuid references public.purchasing_purchase_order_lines (id) on delete cascade,
  event_type                     text not null,
  actor_profile_id                uuid references public.profiles (id) on delete set null,
  actor_name                       text,
  metadata                          jsonb not null default '{}'::jsonb,
  created_at                        timestamptz not null default now(),
  -- Extend this list (new migration, widen-constraint pattern from 0012) when
  -- a UI/action slice implements the matching write.
  constraint purchasing_events_type_check check (
    event_type in (
      'pr_created', 'pr_approved', 'pr_rejected',
      'po_created_from_pr', 'po_created_direct',
      'po_closed', 'po_apv_marked'
    )
  )
);

create index purchasing_events_request_idx
  on public.purchasing_events (purchase_request_id, created_at);

create index purchasing_events_request_line_idx
  on public.purchasing_events (purchase_request_line_id);

create index purchasing_events_order_idx
  on public.purchasing_events (purchase_order_id, created_at);

create index purchasing_events_order_line_idx
  on public.purchasing_events (purchase_order_line_id);

create index purchasing_events_type_idx
  on public.purchasing_events (event_type);

create index purchasing_events_actor_profile_idx
  on public.purchasing_events (actor_profile_id);


create table public.receiving_goods_receipts (
  id                      uuid primary key default gen_random_uuid(),
  purchase_order_id          uuid references public.purchasing_purchase_orders (id) on delete cascade,
  receipt_date                date,
  raw_receipt_date             text,
  ata_date                     date,
  raw_ata                      text,
  receiver_profile_id           uuid references public.profiles (id) on delete set null,
  receiver_name                  text,
  status                          text not null default 'gr_draft',
  raw_status                      text,
  remark                           text,
  raw_remark                       text,
  lift_fee_summary                  jsonb not null default '{}'::jsonb,
  reset_at                           timestamptz,
  reset_by_profile_id                 uuid references public.profiles (id) on delete set null,
  reset_by_name                       text,
  recalled_at                          timestamptz,
  recalled_by_profile_id                uuid references public.profiles (id) on delete set null,
  recalled_by_name                      text,
  legacy_group_key                       text,
  legacy_source                          text,
  source_file                             text,
  source_row                              integer,
  metadata                                 jsonb not null default '{}'::jsonb,
  created_at                                timestamptz not null default now(),
  updated_at                                 timestamptz not null default now(),
  constraint receiving_goods_receipts_status_check check (
    status in ('gr_draft', 'gr_pending_review', 'gr_completed')
  )
);

-- purchase_order_id is nullable: V1 GR rows link to a PO LINE via
-- Ref_PO_UID, not directly to a PO bill (docs/migration/pr-po-gr-v1-mapping.md).
-- The 10 known orphan Ref_PO_UID rows have no matching PO line and therefore
-- no resolvable PO bill either; their receipt header keeps purchase_order_id
-- null rather than fabricating a bill link, the same "do not fabricate" rule
-- already locked for the orphan PO-line case on the lines table below.

create index receiving_goods_receipts_status_date_idx
  on public.receiving_goods_receipts (status, receipt_date desc);

create index receiving_goods_receipts_order_idx
  on public.receiving_goods_receipts (purchase_order_id);

create index receiving_goods_receipts_receiver_profile_idx
  on public.receiving_goods_receipts (receiver_profile_id);

create index receiving_goods_receipts_reset_by_profile_idx
  on public.receiving_goods_receipts (reset_by_profile_id);

create index receiving_goods_receipts_recalled_by_profile_idx
  on public.receiving_goods_receipts (recalled_by_profile_id);

create trigger receiving_goods_receipts_set_updated_at
  before update on public.receiving_goods_receipts
  for each row execute function public.set_updated_at();


create table public.receiving_goods_receipt_lines (
  id                     uuid primary key default gen_random_uuid(),
  goods_receipt_id         uuid not null references public.receiving_goods_receipts (id) on delete cascade,
  purchase_order_line_id    uuid references public.purchasing_purchase_order_lines (id) on delete set null,
  legacy_ref_po_uid          text,
  legacy_gr_uid               text,
  catalog_product_id           uuid references public.catalog_products (id) on delete set null,
  catalog_alias_id               uuid references public.catalog_product_aliases (id) on delete set null,
  raw_sku                         text,
  raw_product_name                 text not null,
  received_qty                      numeric(12, 3) not null,
  unit                                text not null,
  old_qty                              numeric(12, 3),
  expiry_date                          date,
  raw_expiry_date                       text,
  date_parse_status                     text,
  location_summary                       text,
  raw_loc_in                              text,
  raw_remark                               text,
  is_extra_item                             boolean not null default false,
  match_status                               text,
  created_at                                  timestamptz not null default now(),
  constraint receiving_goods_receipt_lines_received_qty_nonnegative
    check (received_qty >= 0),
  constraint receiving_goods_receipt_lines_old_qty_nonnegative
    check (old_qty is null or old_qty >= 0),
  constraint receiving_goods_receipt_lines_product_name_not_blank
    check (length(btrim(raw_product_name)) > 0),
  constraint receiving_goods_receipt_lines_unit_not_blank
    check (length(btrim(unit)) > 0),
  -- date_parse_status mirrors scripts/pr-po-gr-import-dry-run.mjs's
  -- classifyDateField categories: placeholder ("-" no-expiry marker),
  -- epoch_artifact (pre-1980 spreadsheet epoch-zero export artifact), and
  -- malformed (genuinely bad string, kept in raw_expiry_date for review).
  constraint receiving_goods_receipt_lines_date_parse_status_check check (
    date_parse_status is null
    or date_parse_status in ('parsed', 'placeholder', 'epoch_artifact', 'malformed')
  )
);

-- purchase_order_line_id is nullable: the 10 known orphan Ref_PO_UID rows
-- (no matching PO_UID in PO.csv) stay importable with a null FK, raw
-- legacy_ref_po_uid, and match_status = 'orphan_ref_po_uid'. Do not fabricate
-- a PO line to satisfy this FK.
create unique index receiving_goods_receipt_lines_legacy_gr_uid_uidx
  on public.receiving_goods_receipt_lines (legacy_gr_uid)
  where legacy_gr_uid is not null;

create index receiving_goods_receipt_lines_receipt_idx
  on public.receiving_goods_receipt_lines (goods_receipt_id);

create index receiving_goods_receipt_lines_order_line_idx
  on public.receiving_goods_receipt_lines (purchase_order_line_id);

create index receiving_goods_receipt_lines_catalog_product_idx
  on public.receiving_goods_receipt_lines (catalog_product_id);

create index receiving_goods_receipt_lines_catalog_alias_idx
  on public.receiving_goods_receipt_lines (catalog_alias_id);


create table public.receiving_line_splits (
  id                    uuid primary key default gen_random_uuid(),
  goods_receipt_line_id   uuid not null references public.receiving_goods_receipt_lines (id) on delete cascade,
  split_no                 integer not null,
  warehouse_id              uuid references public.warehouse_warehouses (id) on delete set null,
  warehouse_key             text,
  raw_location              text not null,
  floor                     text,
  zone                      text,
  qty                       numeric(12, 3),
  unit                      text,
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  constraint receiving_line_splits_split_no_positive check (split_no > 0),
  constraint receiving_line_splits_raw_location_not_blank
    check (length(btrim(raw_location)) > 0),
  constraint receiving_line_splits_qty_nonnegative check (qty is null or qty >= 0),
  constraint receiving_line_splits_unique_split unique (goods_receipt_line_id, split_no)
);

create index receiving_line_splits_line_idx
  on public.receiving_line_splits (goods_receipt_line_id);

create index receiving_line_splits_warehouse_idx
  on public.receiving_line_splits (warehouse_id);


create table public.receiving_events (
  id                     uuid primary key default gen_random_uuid(),
  goods_receipt_id         uuid references public.receiving_goods_receipts (id) on delete cascade,
  goods_receipt_line_id     uuid references public.receiving_goods_receipt_lines (id) on delete cascade,
  event_type                 text not null,
  actor_profile_id             uuid references public.profiles (id) on delete set null,
  actor_name                    text,
  metadata                       jsonb not null default '{}'::jsonb,
  created_at                      timestamptz not null default now(),
  -- Extend this list (new migration, widen-constraint pattern from 0012) when
  -- a UI/action slice implements the matching write.
  constraint receiving_events_type_check check (
    event_type in (
      'gr_draft_saved', 'gr_submitted_for_review', 'gr_confirmed',
      'gr_reset', 'gr_recalled', 'gr_split_updated', 'gr_corrected'
    )
  )
);

create index receiving_events_receipt_idx
  on public.receiving_events (goods_receipt_id, created_at);

create index receiving_events_line_idx
  on public.receiving_events (goods_receipt_line_id);

create index receiving_events_type_idx
  on public.receiving_events (event_type);

create index receiving_events_actor_profile_idx
  on public.receiving_events (actor_profile_id);


-- Enable Row Level Security (RLS) on all tables.
alter table public.purchasing_purchase_requests      enable row level security;
alter table public.purchasing_purchase_request_lines  enable row level security;
alter table public.purchasing_purchase_orders          enable row level security;
alter table public.purchasing_purchase_order_lines     enable row level security;
alter table public.purchasing_events                   enable row level security;
alter table public.receiving_goods_receipts             enable row level security;
alter table public.receiving_goods_receipt_lines        enable row level security;
alter table public.receiving_line_splits                enable row level security;
alter table public.receiving_events                     enable row level security;


-- Revoke all privileges from public, anon, and authenticated before explicit grants.
revoke all on
  public.purchasing_purchase_requests,
  public.purchasing_purchase_request_lines,
  public.purchasing_purchase_orders,
  public.purchasing_purchase_order_lines,
  public.purchasing_events,
  public.receiving_goods_receipts,
  public.receiving_goods_receipt_lines,
  public.receiving_line_splits,
  public.receiving_events
  from public, anon, authenticated;


-- Grant SELECT to authenticated; RLS policies below narrow by permission.
-- No anon grants or policies, and no authenticated insert/update/delete
-- policies in this schema-only migration (writes stay service-role only,
-- following ADR 0015).
grant select on
  public.purchasing_purchase_requests,
  public.purchasing_purchase_request_lines,
  public.purchasing_purchase_orders,
  public.purchasing_purchase_order_lines,
  public.purchasing_events,
  public.receiving_goods_receipts,
  public.receiving_goods_receipt_lines,
  public.receiving_line_splits,
  public.receiving_events
  to authenticated;


-- Grant full privileges to service_role (server-side import & write actions bypass RLS).
grant select, insert, update, delete on
  public.purchasing_purchase_requests,
  public.purchasing_purchase_request_lines,
  public.purchasing_purchase_orders,
  public.purchasing_purchase_order_lines,
  public.purchasing_events,
  public.receiving_goods_receipts,
  public.receiving_goods_receipt_lines,
  public.receiving_line_splits,
  public.receiving_events
  to service_role;


-- Operational read policies based on user permissions (ADR 0020).
create policy "purchasing_purchase_requests_select_permission" on public.purchasing_purchase_requests
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "purchasing_purchase_request_lines_select_permission" on public.purchasing_purchase_request_lines
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "purchasing_events_select_permission" on public.purchasing_events
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "purchasing_purchase_orders_select_permission" on public.purchasing_purchase_orders
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write'))
  );

create policy "purchasing_purchase_order_lines_select_permission" on public.purchasing_purchase_order_lines
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write'))
  );

create policy "receiving_goods_receipts_select_permission" on public.receiving_goods_receipts
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "receiving_goods_receipt_lines_select_permission" on public.receiving_goods_receipt_lines
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "receiving_line_splits_select_permission" on public.receiving_line_splits
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );

create policy "receiving_events_select_permission" on public.receiving_events
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.write')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.write'))
  );
