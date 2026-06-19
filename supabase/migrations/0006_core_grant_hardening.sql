-- Phase 2 correction: normalize core table grants after initial staging apply.
-- DRAFT migration (see supabase/migrations/README.md).
--
-- This is intentionally repeatable with the grant normalization now also
-- present in 0002_core_rls_policies.sql. It closes broad Supabase default or
-- legacy grants on core tables before re-granting only the intended access.

revoke all on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  from public, anon, authenticated;

grant select on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  to authenticated;

grant update (display_name) on public.profiles to authenticated;

grant select, insert, update, delete on
  public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.apps, public.audit_logs
  to service_role;
