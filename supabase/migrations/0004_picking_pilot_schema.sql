-- Phase 3: Picking pilot schema.
--
-- DRAFT migration. The Supabase CLI is not available in this workspace, so this
-- file uses an ordered 000N_ prefix instead of a CLI timestamp (see
-- supabase/migrations/README.md). Register via `supabase migration new` when
-- the CLI / local stack exists.
--
-- Mapping reference: docs/migration/picking-v1-mapping.md.
-- Schema-boundary decision:
-- docs/decisions/0004-picking-public-prefixed-tables-and-secret-split.md.

create table public.picking_products (
  id                uuid primary key default gen_random_uuid(),
  legacy_product_id text,
  name              text not null,
  default_unit      text not null default 'ลัง',
  is_active         boolean not null default true,
  legacy_source     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint picking_products_name_not_blank check (length(btrim(name)) > 0)
);
create index picking_products_active_name_idx
  on public.picking_products (is_active, name);

create trigger picking_products_set_updated_at
  before update on public.picking_products
  for each row execute function public.set_updated_at();

create table public.picking_staff (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles (id) on delete set null,
  display_name  text not null,
  is_active     boolean not null default true,
  legacy_source text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint picking_staff_display_name_not_blank
    check (length(btrim(display_name)) > 0)
);
create index picking_staff_active_name_idx
  on public.picking_staff (is_active, display_name);

create trigger picking_staff_set_updated_at
  before update on public.picking_staff
  for each row execute function public.set_updated_at();

-- Server-only LINE contact metadata. Do not grant authenticated reads.
create table public.picking_staff_line_accounts (
  staff_id     uuid primary key references public.picking_staff (id) on delete cascade,
  line_user_id text not null,
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now(),
  constraint picking_staff_line_user_id_not_blank
    check (length(btrim(line_user_id)) > 0)
);

create trigger picking_staff_line_accounts_set_updated_at
  before update on public.picking_staff_line_accounts
  for each row execute function public.set_updated_at();

create table public.picking_requisitions (
  id                   uuid primary key default gen_random_uuid(),
  legacy_uid           text unique,
  requested_at         timestamptz not null default now(),
  bill_date            date not null default ((now() at time zone 'Asia/Bangkok')::date),
  bill_no              integer,
  bill_type            text not null,
  status               text not null default 'pending',
  requester_profile_id uuid references public.profiles (id) on delete set null,
  requester_name       text not null,
  assignee_staff_id    uuid references public.picking_staff (id) on delete set null,
  assignee_name        text not null,
  picked_by_name       text,
  picked_at            timestamptz,
  sent_by_name         text,
  sent_at              timestamptz,
  problem_by_name      text,
  problem_at           timestamptz,
  legacy_source        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint picking_requisitions_bill_type_check check (
    bill_type in ('บิลจัด', 'บิลด่วน', 'บิลสินค้าเรียงหน้าร้าน', 'จัดเตรียมไว้ก่อน')
  ),
  constraint picking_requisitions_status_check check (
    status in ('pending', 'picked', 'sent', 'cancelled', 'line_push_failed')
  ),
  constraint picking_requisitions_bill_no_positive check (bill_no is null or bill_no > 0),
  constraint picking_requisitions_requester_not_blank
    check (length(btrim(requester_name)) > 0),
  constraint picking_requisitions_assignee_not_blank
    check (length(btrim(assignee_name)) > 0),
  constraint picking_requisitions_bill_no_unique unique (bill_date, bill_no)
);
create index picking_requisitions_requested_at_idx
  on public.picking_requisitions (requested_at desc);
create index picking_requisitions_status_idx
  on public.picking_requisitions (status);
create index picking_requisitions_assignee_idx
  on public.picking_requisitions (assignee_staff_id);

create trigger picking_requisitions_set_updated_at
  before update on public.picking_requisitions
  for each row execute function public.set_updated_at();

create table public.picking_requisition_lines (
  id             uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.picking_requisitions (id) on delete cascade,
  line_no        integer not null,
  product_id     uuid references public.picking_products (id) on delete set null,
  product_name   text not null,
  requested_qty  numeric(12, 3) not null,
  unit           text not null,
  is_free_text   boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint picking_requisition_lines_line_no_positive check (line_no > 0),
  constraint picking_requisition_lines_qty_positive check (requested_qty > 0),
  constraint picking_requisition_lines_product_name_not_blank
    check (length(btrim(product_name)) > 0),
  constraint picking_requisition_lines_unit_not_blank
    check (length(btrim(unit)) > 0),
  constraint picking_requisition_lines_unique_line unique (requisition_id, line_no)
);
create index picking_requisition_lines_requisition_idx
  on public.picking_requisition_lines (requisition_id);
create index picking_requisition_lines_product_idx
  on public.picking_requisition_lines (product_id);

-- Server-only capability and LINE metadata. Store capability token hashes,
-- never plaintext capability tokens, in committed migrations/import files.
create table public.picking_requisition_secrets (
  requisition_id          uuid primary key references public.picking_requisitions (id) on delete cascade,
  problem_token_hash      text,
  line_action_token_hash  text,
  line_card_quote_token   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger picking_requisition_secrets_set_updated_at
  before update on public.picking_requisition_secrets
  for each row execute function public.set_updated_at();

create table public.picking_problem_reports (
  id              uuid primary key default gen_random_uuid(),
  requisition_id  uuid not null references public.picking_requisitions (id) on delete cascade,
  reported_by_id  uuid references public.picking_staff (id) on delete set null,
  reported_by_name text not null,
  reported_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint picking_problem_reports_reported_by_not_blank
    check (length(btrim(reported_by_name)) > 0)
);
create index picking_problem_reports_requisition_idx
  on public.picking_problem_reports (requisition_id);
create index picking_problem_reports_reported_at_idx
  on public.picking_problem_reports (reported_at desc);

create table public.picking_problem_report_lines (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.picking_problem_reports (id) on delete cascade,
  line_id         uuid references public.picking_requisition_lines (id) on delete set null,
  product_name    text not null,
  requested_qty   numeric(12, 3) not null,
  actual_qty      numeric(12, 3) not null,
  unit            text not null,
  note            text,
  created_at      timestamptz not null default now(),
  constraint picking_problem_report_lines_requested_nonnegative check (requested_qty >= 0),
  constraint picking_problem_report_lines_actual_nonnegative check (actual_qty >= 0),
  constraint picking_problem_report_lines_product_name_not_blank
    check (length(btrim(product_name)) > 0),
  constraint picking_problem_report_lines_unit_not_blank
    check (length(btrim(unit)) > 0)
);
create index picking_problem_report_lines_report_idx
  on public.picking_problem_report_lines (report_id);
create index picking_problem_report_lines_line_idx
  on public.picking_problem_report_lines (line_id);

create table public.picking_requisition_events (
  id              uuid primary key default gen_random_uuid(),
  requisition_id  uuid not null references public.picking_requisitions (id) on delete cascade,
  event_type      text not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_name      text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint picking_requisition_events_type_check check (
    event_type in (
      'created', 'line_push_failed', 'picked', 'problem_reported',
      'sent', 'cancelled'
    )
  )
);
create index picking_requisition_events_requisition_idx
  on public.picking_requisition_events (requisition_id, created_at);
create index picking_requisition_events_type_idx
  on public.picking_requisition_events (event_type);

-- Server-side daily counter for future V2 bill numbers.
create table public.picking_daily_sequences (
  bill_date    date primary key,
  last_bill_no integer not null default 0,
  updated_at   timestamptz not null default now(),
  constraint picking_daily_sequences_last_bill_no_nonnegative check (last_bill_no >= 0)
);

create trigger picking_daily_sequences_set_updated_at
  before update on public.picking_daily_sequences
  for each row execute function public.set_updated_at();

create or replace function private.next_picking_bill_no(p_bill_date date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_no integer;
begin
  insert into public.picking_daily_sequences (bill_date, last_bill_no)
  values (p_bill_date, 1)
  on conflict (bill_date)
  do update set last_bill_no = public.picking_daily_sequences.last_bill_no + 1
  returning last_bill_no into next_no;

  return next_no;
end;
$$;
revoke all on function private.next_picking_bill_no(date) from public;
revoke all on function private.next_picking_bill_no(date) from anon;
revoke all on function private.next_picking_bill_no(date) from authenticated;
grant usage on schema private to service_role;
grant execute on function private.next_picking_bill_no(date) to service_role;
