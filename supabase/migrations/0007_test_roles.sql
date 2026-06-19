-- Phase 3: Seed test roles and permission mapping for staging validation.
--
-- Adds:
--   1. PICKING_WRITER: gets picking.read and picking.write
--   2. PICKING_READER: gets picking.read
--   3. GUEST: gets no permissions
--
-- Re-runnable via ON CONFLICT do nothing.

insert into public.roles (key, name, description, is_system) values
  ('PICKING_WRITER', 'Picking Writer', 'Test role with read and write access to Picking.', false),
  ('PICKING_READER', 'Picking Reader', 'Test role with read-only access to Picking.', false),
  ('GUEST', 'Guest User', 'Test role with no permissions assigned.', false)
on conflict (key) do nothing;

-- Map permissions to roles
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'PICKING_WRITER' and p.key in ('picking.read', 'picking.write')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.key = 'PICKING_READER' and p.key in ('picking.read')
on conflict (role_id, permission_id) do nothing;
