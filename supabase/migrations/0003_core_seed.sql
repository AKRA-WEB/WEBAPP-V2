-- Phase 2: structural seed only.
-- DRAFT migration (see 0001 header and supabase/migrations/README.md).
--
-- This seeds the fixed permission catalog, the ADMIN role, and the app registry.
-- It is NOT the V1 data import (User / AppConfig / RoleConfig / PermConfig) -
-- that requires the sheet -> table mapping tracked in
-- docs/migration/module-inventory.md. Re-runnable via ON CONFLICT guards.

-- Permission catalog. Keys MUST match the AppPermission union in
-- src/modules/auth/permissions.ts exactly.
insert into public.permissions (key, description) values
  ('core.admin',       'Core administration: users, roles, permissions, audit'),
  ('picking.read',     'View picking'),
  ('picking.write',    'Edit picking'),
  ('purchasing.read',  'View purchasing'),
  ('purchasing.write', 'Edit purchasing'),
  ('receiving.read',   'View receiving'),
  ('receiving.write',  'Edit receiving'),
  ('warehouse.read',   'View warehouse'),
  ('warehouse.write',  'Edit warehouse'),
  ('returns.read',     'View returns'),
  ('returns.write',    'Edit returns'),
  ('kpi.read',         'View KPI'),
  ('kpi.write',        'Edit KPI')
on conflict (key) do nothing;

-- ADMIN role. Note: the ADMIN *role* short-circuits can()/is_admin() and is
-- distinct from the core.admin *permission*. ADMIN needs no role_permissions
-- rows because the helpers grant it everything.
insert into public.roles (key, name, description, is_system) values
  ('ADMIN', 'Administrator',
   'Full access. Short-circuits all permission checks (see can() / private.is_admin).',
   true)
on conflict (key) do nothing;

-- App registry mirroring the dashboard in src/app/page.tsx.
insert into public.apps
  (key, name, description, route, icon, status, required_permission, sort_order) values
  ('core',          'Core',          'Users, roles, permissions, audit',         '/admin/permissions', 'ShieldCheck',   'Planning', 'core.admin',      10),
  ('picking',       'Picking',       'Requisition, bill numbers, issue flow',    '/picking',           'ClipboardList', 'Pilot',    'picking.read',    20),
  ('purchasing',    'Purchasing',    'PR, PO, vendor lead time',                 '/purchasing',        'ReceiptText',   'Queued',   'purchasing.read', 30),
  ('receiving',     'Receiving',     'GR, warehouse locations, reset/recall',    '/receiving',         'PackageCheck',  'Queued',   'receiving.read',  40),
  ('warehouse',     'Warehouse',     'TRDAKRA, dispatch, survey, stock',         '/warehouse',         'Boxes',         'Queued',   'warehouse.read',  50),
  ('returns',       'Returns',       'Return intake, claims, damaged goods',     '/returns',           'RefreshCcw',    'Queued',   'returns.read',    60),
  ('kpi',           'KPI',           'Daily records and dashboards',             '/kpi',               'BarChart3',     'Queued',   'kpi.read',        70),
  ('notifications', 'Notifications', 'LINE jobs and delivery hooks',             null,                 'Truck',         'Queued',   null,              80)
on conflict (key) do nothing;
