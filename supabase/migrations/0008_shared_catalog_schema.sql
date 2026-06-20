-- Phase 4: Shared Catalog and Warehouse schema.
--
-- DRAFT migration. Sequential 0008_ prefix used for staging.
-- Mapping reference: docs/plans/V2-0018-shared-catalog-warehouse-data-structure.md.

create table public.catalog_products (
  id             uuid primary key default gen_random_uuid(),
  canonical_code text,
  canonical_name text not null,
  name_key       text not null,
  default_unit   text,
  category       text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint catalog_products_name_not_blank check (length(btrim(canonical_name)) > 0),
  constraint catalog_products_name_key_not_blank check (length(btrim(name_key)) > 0)
);

create unique index catalog_products_code_uidx
  on public.catalog_products (canonical_code)
  where canonical_code is not null;

create index catalog_products_active_name_key_idx
  on public.catalog_products (is_active, name_key);

create trigger catalog_products_set_updated_at
  before update on public.catalog_products
  for each row execute function public.set_updated_at();


create table public.catalog_product_aliases (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid references public.catalog_products (id) on delete set null,
  source_app         text not null,
  source_file        text not null,
  legacy_code        text,
  source_name        text not null,
  source_name_key    text not null,
  source_unit        text,
  source_category    text,
  source_vendor_code text,
  source_vendor_name text,
  match_status       text not null,
  match_confidence   numeric(5, 2),
  import_batch_id    uuid,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  constraint catalog_product_aliases_source_name_not_blank check (length(btrim(source_name)) > 0),
  constraint catalog_product_aliases_source_name_key_not_blank check (length(btrim(source_name_key)) > 0),
  constraint catalog_product_aliases_match_status_check check (
    match_status in ('matched_code', 'matched_exact_name', 'suggested_fuzzy', 'manual_review', 'ignored_blank', 'rejected')
  )
);

create index catalog_product_aliases_product_id_idx
  on public.catalog_product_aliases (product_id);

create index catalog_product_aliases_source_app_key_idx
  on public.catalog_product_aliases (source_app, source_name_key);


create table public.catalog_product_scopes (
  product_id uuid not null references public.catalog_products (id) on delete cascade,
  scope_type text not null,
  scope_key  text not null,
  source_app text not null,
  evidence   text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (product_id, scope_type, scope_key, source_app)
);

create index catalog_product_scopes_filter_idx
  on public.catalog_product_scopes (scope_type, scope_key, is_active);


create table public.catalog_vendors (
  id           uuid primary key default gen_random_uuid(),
  vendor_key   text not null unique,
  display_name text not null,
  phone        text,
  email        text,
  address      text,
  tax_id       text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint catalog_vendors_key_not_blank check (length(btrim(vendor_key)) > 0),
  constraint catalog_vendors_display_name_not_blank check (length(btrim(display_name)) > 0)
);

create trigger catalog_vendors_set_updated_at
  before update on public.catalog_vendors
  for each row execute function public.set_updated_at();


create table public.catalog_product_vendors (
  product_id         uuid not null references public.catalog_products (id) on delete cascade,
  vendor_id          uuid not null references public.catalog_vendors (id) on delete cascade,
  vendor_product_code text,
  vendor_product_name text,
  is_primary         boolean not null default false,
  lead_time_days     integer,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (product_id, vendor_id)
);

create trigger catalog_product_vendors_set_updated_at
  before update on public.catalog_product_vendors
  for each row execute function public.set_updated_at();


create table public.warehouse_warehouses (
  id            uuid primary key default gen_random_uuid(),
  warehouse_key text not null unique,
  display_name  text not null,
  business_unit text,
  legacy_code   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint warehouse_warehouses_key_not_blank check (length(btrim(warehouse_key)) > 0),
  constraint warehouse_warehouses_name_not_blank check (length(btrim(display_name)) > 0)
);


create table public.warehouse_locations (
  id            uuid primary key default gen_random_uuid(),
  warehouse_id  uuid references public.warehouse_warehouses (id) on delete set null,
  location_code text,
  floor         text,
  zone          text,
  raw_location  text not null,
  source_app    text not null,
  created_at    timestamptz not null default now(),
  constraint warehouse_locations_raw_not_blank check (length(btrim(raw_location)) > 0)
);

create index warehouse_locations_warehouse_idx
  on public.warehouse_locations (warehouse_id);


create table public.warehouse_product_locations (
  product_id    uuid not null references public.catalog_products (id) on delete cascade,
  warehouse_id  uuid not null references public.warehouse_warehouses (id) on delete cascade,
  location_id   uuid references public.warehouse_locations (id) on delete set null,
  location_role text not null,
  par_level     numeric(12, 3),
  source_app    text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  primary key (product_id, warehouse_id, location_role, source_app)
);


create table public.warehouse_inventory_balances (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.catalog_products (id) on delete set null,
  warehouse_id    uuid not null references public.warehouse_warehouses (id) on delete cascade,
  qty_on_hand     numeric(12, 3) not null,
  unit            text not null,
  source_name     text not null,
  source_app      text not null,
  as_of           timestamptz not null,
  import_batch_id uuid,
  created_at      timestamptz not null default now(),
  constraint warehouse_inventory_balances_unit_not_blank check (length(btrim(unit)) > 0),
  constraint warehouse_inventory_balances_source_name_not_blank check (length(btrim(source_name)) > 0)
);

create index warehouse_inventory_balances_product_warehouse_idx
  on public.warehouse_inventory_balances (warehouse_id, product_id);


create table public.warehouse_stock_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.catalog_products (id) on delete set null,
  warehouse_id   uuid references public.warehouse_warehouses (id) on delete set null,
  movement_type  text not null,
  qty            numeric(12, 3) not null,
  unit           text,
  occurred_at    timestamptz,
  actor_name     text,
  source_app     text not null,
  legacy_id      text,
  source_name    text not null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  constraint warehouse_stock_movements_source_name_not_blank check (length(btrim(source_name)) > 0)
);

create index warehouse_stock_movements_product_warehouse_idx
  on public.warehouse_stock_movements (warehouse_id, product_id);


-- Enable Row Level Security (RLS) on all tables.
alter table public.catalog_products            enable row level security;
alter table public.catalog_product_aliases    enable row level security;
alter table public.catalog_product_scopes     enable row level security;
alter table public.catalog_vendors            enable row level security;
alter table public.catalog_product_vendors    enable row level security;
alter table public.warehouse_warehouses       enable row level security;
alter table public.warehouse_locations        enable row level security;
alter table public.warehouse_product_locations enable row level security;
alter table public.warehouse_inventory_balances enable row level security;
alter table public.warehouse_stock_movements   enable row level security;


-- Revoke all privileges from public, anon, and authenticated before explicit grants.
revoke all on
  public.catalog_products,
  public.catalog_product_aliases,
  public.catalog_product_scopes,
  public.catalog_vendors,
  public.catalog_product_vendors,
  public.warehouse_warehouses,
  public.warehouse_locations,
  public.warehouse_product_locations,
  public.warehouse_inventory_balances,
  public.warehouse_stock_movements
  from public, anon, authenticated;


-- Grant SELECT privileges to authenticated users (operational reference reads).
grant select on
  public.catalog_products,
  public.catalog_product_aliases,
  public.catalog_product_scopes,
  public.catalog_vendors,
  public.catalog_product_vendors,
  public.warehouse_warehouses,
  public.warehouse_locations,
  public.warehouse_product_locations,
  public.warehouse_inventory_balances,
  public.warehouse_stock_movements
  to authenticated;


-- Grant full privileges to service_role (server-side import & sync tasks bypass RLS).
grant select, insert, update, delete on
  public.catalog_products,
  public.catalog_product_aliases,
  public.catalog_product_scopes,
  public.catalog_vendors,
  public.catalog_product_vendors,
  public.warehouse_warehouses,
  public.warehouse_locations,
  public.warehouse_product_locations,
  public.warehouse_inventory_balances,
  public.warehouse_stock_movements
  to service_role;


-- Operational read policies based on user permissions.
create policy "catalog_products_select_permission" on public.catalog_products
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'returns.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "catalog_product_aliases_select_permission" on public.catalog_product_aliases
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'returns.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "catalog_product_scopes_select_permission" on public.catalog_product_scopes
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'returns.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "catalog_vendors_select_permission" on public.catalog_vendors
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'warehouse.read'))
  );

create policy "catalog_product_vendors_select_permission" on public.catalog_product_vendors
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'warehouse.read'))
  );

create policy "warehouse_warehouses_select_permission" on public.warehouse_warehouses
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'returns.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "warehouse_locations_select_permission" on public.warehouse_locations
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "warehouse_product_locations_select_permission" on public.warehouse_product_locations
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "warehouse_inventory_balances_select_permission" on public.warehouse_inventory_balances
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );

create policy "warehouse_stock_movements_select_permission" on public.warehouse_stock_movements
  for select to authenticated
  using (
    (select private.has_permission((select auth.uid()), 'warehouse.read')) or
    (select private.has_permission((select auth.uid()), 'purchasing.read')) or
    (select private.has_permission((select auth.uid()), 'receiving.read')) or
    (select private.has_permission((select auth.uid()), 'returns.read')) or
    (select private.has_permission((select auth.uid()), 'picking.read'))
  );
