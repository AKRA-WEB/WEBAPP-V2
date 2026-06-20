# Plan V2-0016: Server Permission Guard Pattern

Status: Complete after 2026-06-20 correction

Correction note:

- The original guard returned `allowed` for authenticated non-admin users when a
  caller passed no `permission`, `anyOf`, or `allOf` requirement.
- The corrected guard requires an explicit non-empty permission requirement and
  fails closed for empty guard calls, while preserving the intended `ADMIN`
  bypass for valid requirements.

Architect command:

```text
Architect: plan a reusable server-side permission guard before Picking writes.
```

## 1. Goal

- Primary objective: define and implement a reusable server-side guard pattern
  around `getPermissionSnapshot()` and `can()` before adding operational module
  routes or write actions.
- Success definition: protected server routes/actions can require permissions
  consistently, fail closed for missing env/session/role, and are verified with
  admin, allowed non-admin, and denied accounts.
- User/business reason: prevent each module from inventing its own auth checks
  and reduce risk before Picking create/status workflows.

## 2. Requirement And Scope Definition

### Problem

- `/admin/permissions` currently performs a route-specific permission check.
- Upcoming Picking list/detail/create work needs the same fail-closed behavior.
- Copying permission code across routes will make future module security hard
  to audit.

### Users

- Primary users: developers adding V2 routes/actions.
- Secondary users: internal testers validating access behavior.
- Admin/support users: operators relying on correct permission gates.

### MVP Features

- Add a server-only guard helper that loads the permission snapshot and checks
  one or more permissions.
- Return a typed success/denied/not-configured result rather than throwing
  ambiguous errors everywhere.
- Support "any of these permissions" checks for read paths such as
  `picking.read` or `picking.write`.
- Support strict single-permission checks for admin and write actions.
- Refactor `/admin/permissions` to use the guard.
- Add guard usage notes for future Picking routes/actions.
- Verify admin allowed and non-admin denied behavior.

### Nice-To-Have Features

- Add reusable denied-state UI copy/component.
- Add audit logging for denied privileged write attempts.
- Add automated tests around guard states if a test runner is introduced.
- Add route metadata for module required permissions.

### Out Of Scope

- Changing Supabase schema, RLS policies, or grants.
- Creating new roles/users; use `V2-0014` for account setup.
- Implementing Picking list/detail/create screens.
- Client-side authorization as a security boundary.
- V1 auth/SSO changes.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router pages and future server actions.
- Backend/server boundary: server-only guard helper in `src/modules/auth`.
- Database: reads current Supabase-backed permission snapshot.
- Auth/permissions: Supabase SSR server client and existing `can()` helper.
- Deployment: normal Next.js build/deploy.

### Data Model / Schema

- Tables or entities involved: existing `profiles`, `roles`, `permissions`,
  `role_permissions`, `user_roles`, `apps`.
- Important fields: role key, permission key, active session user id.
- Relationships: unchanged.
- Constraints: do not authorize from user-editable metadata.
- RLS/security notes: guard complements RLS; it does not replace RLS on exposed
  tables. Privileged writes should remain server-side.

### Integration Points

- V1 references: none.
- Supabase: server-side Auth validation and permission table reads.
- Vercel: server runtime must have required Supabase env vars.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: server-only secrets remain outside browser code; public URL
  and publishable key are the only client-safe values.

## 4. UI/UX And User Flow

### User Flow

1. User signs in.
2. User opens a protected route.
3. Route calls the server guard.
4. Guard loads the snapshot and evaluates required permissions.
5. If allowed, route renders data.
6. If denied, route renders a clear access-denied state.
7. If env/session is missing, route fails closed with a non-destructive state.

### Screens / States

- Screen: `/admin/permissions` first; future `/picking` routes later.
- Empty state: unchanged.
- Loading state: server-rendered pages should avoid client-only auth flicker.
- Error state: distinguish configuration/session failure from permission denial
  in logs/handoff, not necessarily in user-facing copy.
- Permission-denied state: non-admin users must not see admin data.
- Mobile behavior: no special layout changes required for the guard.

### System Logic / Pseudocode

```text
result = await requirePermission({
  anyOf: ["picking.read", "picking.write"]
})

if result.status !== "allowed":
  render denied state

use result.snapshot for route data decisions
```

## 5. Task Breakdown

1. Inspect current `getPermissionSnapshot()` return behavior for missing env,
   missing session, and permissionless users.
2. Design a typed guard result shape.
3. Implement `requirePermission()` or equivalent server-only helper.
4. Refactor `/admin/permissions` to use the helper.
5. Add minimal docs/comments only where needed.
6. Verify admin allowed.
7. Verify non-admin denied after `V2-0014` accounts exist.
8. Run lint/typecheck/build.
9. Update handoff docs with the guard pattern and remaining gaps.

## 6. Files Expected To Change

- `src/modules/auth/*`
- `src/app/admin/permissions/page.tsx`
- Future implementation docs or handoff files
- Optional shared denied UI component if needed

## 7. Verification Steps

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Admin account can open `/admin/permissions`.
- Non-admin account is denied from `/admin/permissions`.
- Missing Supabase env or missing session fails closed.
- No `SUPABASE_SECRET_KEY` or database URL appears in browser-visible code.

## 8. Rollback / No-Production-Impact Note

The guard refactor is confined to V2 source. If it breaks admin access, revert
the guard helper/refactor commit or forward-fix the route-specific usage. V1
production systems remain untouched.

## 9. Open Questions

- Should denied pages redirect to `/login` when no session exists, or show an
  inline denied/not-signed-in state?
- Should guard results expose detailed denial reasons to UI or only to server
  logs?
- Should module read guards allow either `*.read` or `*.write` by convention?

## 10. Handoff Notes

- Next action: execute after `V2-0014` creates non-admin test accounts.
- Blockers: non-admin verification needs staging users.
- Related plans: `V2-0009`, `V2-0010`, `V2-0014`.
- Related ADRs: none yet; add one if the guard establishes a project-wide auth
  convention beyond this implementation.
