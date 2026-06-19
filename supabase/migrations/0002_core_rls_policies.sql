-- Phase 2: helper functions (private schema) + RLS + grants.
-- DRAFT migration (see 0001 header and supabase/migrations/README.md).
--
-- No authenticated WRITE policies are defined on any table. Privileged mutations
-- (role/permission/app management, audit writes) run server-side with the
-- service role, which bypasses RLS. This matches the server-boundary rules in
-- docs/architecture/target-architecture.md.

-- Security-definer helpers live in a non-exposed schema.
create schema if not exists private;

-- Reproduces can() in src/modules/auth/permissions.ts:
-- the ADMIN role short-circuits to true; otherwise explicit membership.
create or replace function private.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = uid and r.key = 'ADMIN'
  );
$$;

create or replace function private.has_permission(uid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin(uid)
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = uid and p.key = perm
    );
$$;

-- Helpers are invoked from RLS policies by the authenticated role, so it needs
-- USAGE on the schema and EXECUTE on these functions (and nothing else here).
revoke all on function private.is_admin(uuid) from public;
revoke all on function private.has_permission(uuid, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;

-- Enable RLS on every table.
alter table public.profiles         enable row level security;
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;
alter table public.apps             enable row level security;
alter table public.audit_logs       enable row level security;

-- Normalize grants first so Supabase project defaults or legacy broad grants do
-- not keep broader Data API access than this migration intends.
revoke all on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  from public, anon, authenticated;

-- Base table privileges. RLS still filters rows; only authenticated, not anon.
grant select on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Server-side privileged workflows use the service role. It bypasses RLS, but
-- still needs explicit table privileges when automatic exposure grants are
-- disabled on newer Supabase projects.
grant select, insert, update, delete on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  to service_role;

-- profiles: a user sees/updates their own row; admins read all.
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin((select auth.uid()))));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- roles / permissions / role_permissions: readable config; needed to compute
-- permission snapshots. No write policies (server/service-role only).
create policy "roles_select_all_auth" on public.roles
  for select to authenticated using (true);

create policy "permissions_select_all_auth" on public.permissions
  for select to authenticated using (true);

create policy "role_permissions_select_all_auth" on public.role_permissions
  for select to authenticated using (true);

-- user_roles: a user sees their own assignments; admins see all.
create policy "user_roles_select_self_or_admin" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin((select auth.uid()))));

-- apps: active registry visible to all authenticated; admins see inactive too.
create policy "apps_select_active_or_admin" on public.apps
  for select to authenticated
  using (is_active or (select private.is_admin((select auth.uid()))));

-- audit_logs: admin read only. No write policy (server/service-role only).
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using ((select private.is_admin((select auth.uid()))));
