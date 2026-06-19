# Plan V2-0014: Deployment Boundary And Staging Access

Status: Draft

Architect command:

```text
Architect: plan the deployment boundary decision and staging test user matrix.
```

## 1. Goal

- Primary objective: define how V2 deployment environments and staging test
  accounts should be configured before import or Picking workflows continue.
- Success definition: environment scope is recorded, test roles are created or
  linked in staging, and permission allow/deny behavior is verified without
  changing V1 production systems.
- User/business reason: avoid confusing V2 staging validation with a production
  cutover, while proving non-admin access paths.

## 2. Requirement And Scope Definition

### Problem

- The V2 app has verified admin sign-in, but only one `ADMIN` staging account
  exists.
- Production Vercel boundary remains an explicit decision.
- Future Picking and import work needs non-admin roles to test fail-closed
  behavior and role-specific access.

### Users

- Primary users: internal staging testers.
- Secondary users: developer/agent validating permissions.
- Admin/support users: project owner managing Vercel and Supabase settings.

### MVP Features

- Confirm whether Vercel Production stays disconnected from staging Supabase
  env vars or is explicitly connected as a protected non-cutover environment.
- Record the chosen boundary in handoff docs and an ADR only if it changes the
  existing safe default.
- Define a minimum staging user matrix:
  - `ADMIN` existing admin test user.
  - Picking writer with `picking.write`.
  - Picking reader with `picking.read`.
  - Denied user with no Picking/admin permissions.
- Create or link synthetic staging Supabase Auth users without importing V1
  production users yet.
- Verify `/admin/permissions` denies non-admin users.
- Verify dashboard/app-registry behavior for all test accounts.

### Nice-To-Have Features

- Add a small runbook for creating/removing staging accounts.
- Add a deterministic seed script for test-only roles if current structural
  roles are insufficient.
- Verify Preview deployment with Vercel Authentication enabled.

### Out Of Scope

- Importing real V1 users.
- Enabling V2 as a live production entry point.
- Changing V1 Main SSO, AppConfig, RoleConfig, PermConfig, GAS, Sheets, URLs, or
  LINE tokens.
- Adding service keys to client-visible variables.
- Building Picking UI.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js routes already deployed through Vercel.
- Backend/server boundary: Supabase Admin API only from trusted local/server
  context for test account setup.
- Database: staging Supabase Postgres.
- Auth/permissions: Supabase Auth users mapped to `public.profiles` and
  `public.user_roles`.
- Deployment: Vercel Production/Preview/Development environment scopes.

### Data Model / Schema

- Tables or entities involved: `auth.users`, `public.profiles`,
  `public.roles`, `public.permissions`, `public.role_permissions`,
  `public.user_roles`, `public.apps`.
- Important fields: user email, role key, permission keys.
- Relationships: `profiles.id` follows `auth.users.id`; `user_roles` links
  profile to role.
- Constraints: synthetic staging users must be clearly non-production imports.
- RLS/security notes: exposed tables must keep RLS enabled; role grants must be
  explicit and verified.

### Integration Points

- V1 references: V1 role names only as reference for later import mapping.
- Supabase: use server-side secret/admin credentials only outside browser code.
- Vercel: env vars can target Production, Preview, and Development separately;
  Production should remain a deliberate decision.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: never commit `SUPABASE_SECRET_KEY`, database URL, passwords,
  or generated credentials.

## 4. UI/UX And User Flow

### User Flow

1. Owner confirms deployment boundary.
2. Developer creates staging test roles/users.
3. Tester signs in as each account.
4. Admin account sees `/admin/permissions`.
5. Non-admin accounts are denied from admin routes.
6. Dashboard remains usable for signed-in allowed users.
7. Handoff records exact accounts and roles, excluding passwords.

### Screens / States

- Screen: `/login`, `/`, `/admin/permissions`.
- Empty state: no additional module data required.
- Loading state: default route behavior.
- Error state: failed sign-in or missing role assignment should be documented.
- Permission-denied state: required for non-admin admin route check.
- Mobile behavior: not required beyond route usability.

### System Logic / Pseudocode

```text
for each planned staging account:
  create or locate auth user
  confirm email for staging-only account
  assign role key

for each account:
  sign in
  check dashboard
  check admin route expected allow/deny
  record result
```

## 5. Task Breakdown

1. Confirm current Vercel env scopes from dashboard or CLI if available.
2. Decide whether Production stays without staging Supabase env vars.
3. If boundary changes, add an ADR.
4. Review existing role/permission seed and decide the minimum role rows.
5. Create non-admin staging test accounts using
   `scripts/create-test-account.mjs`.
6. Verify admin and non-admin route behavior.
7. Update handoff docs with account emails, role keys, and verification results
   but no passwords or secrets.

## 6. Files Expected To Change

- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- `docs/decisions/*` only if the deployment boundary changes
- Optional runbook under `docs/runbooks/`
- Optional small script fix under `scripts/` if account creation needs it

## 7. Verification Steps

- Confirm Vercel env scopes in dashboard or via CLI when accessible.
- Sign in as `ADMIN`, Picking writer, Picking reader, and denied user.
- Verify `/admin/permissions` allows admin and denies non-admin users.
- Verify no secret values appear in `git diff`.
- Run `git diff --check` for documentation-only changes; run app checks if a
  script or runtime file changes.

## 8. Rollback / No-Production-Impact Note

Synthetic staging users can be removed from Supabase Auth and `user_roles`.
Environment-scope changes can be reverted in Vercel settings. No V1 production
system should be changed.

## 9. Open Questions

- Should Production remain without staging Supabase env vars until module
  cutover?
- What exact role keys should represent Picking writer and reader in staging?
- Should denied users still be able to see the dashboard shell but no modules?
- Should synthetic emails follow `@akra-v2.test` for all test users?

## 10. Handoff Notes

- Next action: execute after `V2-0013` closeout.
- Blockers: user must confirm the deployment boundary if it changes from the
  safe default.
- Related plans: `V2-0009`, `V2-0010`, `V2-0016`.
- Related ADRs: add one only if the deployment boundary changes.
