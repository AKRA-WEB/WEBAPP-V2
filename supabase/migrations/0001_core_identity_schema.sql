-- Phase 2: Core identity & permissions schema.
--
-- DRAFT migration. The Supabase CLI is not available in this workspace, so this
-- file uses an ordered 000N_ prefix instead of a CLI timestamp (see
-- supabase/migrations/README.md). Register via `supabase migration new` when the
-- CLI / local stack exists. Schema-location rationale:
-- docs/decisions/0003-core-tables-in-public-schema.md.

-- Privileged helpers and trigger functions live outside exposed schemas.
create schema if not exists private;
revoke all on schema private from public;

-- updated_at maintenance helper (not security-sensitive).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;

-- profiles: application user, 1:1 with auth.users.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  is_active     boolean not null default true,
  legacy_uid    text,
  legacy_source text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.profiles is 'Application user profile, 1:1 with auth.users.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- roles: stable role keys. roles.key maps to PermissionSnapshot.roles.
create table public.roles (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  name          text not null,
  description   text,
  is_system     boolean not null default false,
  legacy_source text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on column public.roles.key is 'Stable role key, e.g. ADMIN. Matches PermissionSnapshot.roles.';

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- permissions: keys mirror the AppPermission union in
-- src/modules/auth/permissions.ts. Drift here makes server checks silently fail.
create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  description text,
  created_at  timestamptz not null default now()
);
comment on column public.permissions.key is 'Matches AppPermission union in src/modules/auth/permissions.ts.';

-- role -> permission grants.
create table public.role_permissions (
  role_id       uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (role_id, permission_id)
);
create index role_permissions_permission_id_idx on public.role_permissions (permission_id);

-- user -> role assignments.
create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role_id    uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index user_roles_role_id_idx on public.user_roles (role_id);

-- app registry: drives the module dashboard and links each app to a permission.
create table public.apps (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique,
  name                text not null,
  description         text,
  route               text,
  icon                text,
  status              text not null default 'Queued',
  required_permission text references public.permissions (key),
  sort_order          integer not null default 0,
  is_active           boolean not null default true,
  legacy_source       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint apps_status_check
    check (status in ('Planning', 'Pilot', 'Queued', 'Live', 'Retired'))
);

create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function public.set_updated_at();

-- audit_logs: sensitive state changes. Written server-side (service role).
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);

-- Auto-provision a profile row when an auth user is created.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
