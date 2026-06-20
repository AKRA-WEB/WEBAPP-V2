# Plan V2-0017: Main Portal Design Direction

Status: Complete (2026-06-20)

Direction confirmed by user on 2026-06-20 (`Go:`, no plan ID — see
`docs/handoff/work-log.md`):

- Track: build this plan now (not the next Picking slice).
- Module labels: Thai-first, preserve V1 label wording (matches MVP rationale
  above).
- Signed-out `/`: show a signed-out Main portal state with a Sign In CTA, not
  a redirect to `/login`.

Outcome: implemented as the smallest UI-only slice on top of the existing
`V2-0016` guard/`app-registry`. `src/app/page.tsx` now branches on
not-configured / signed-out / signed-in, filters the app registry into
allowed-vs-queued by permission (fixing a pre-existing gap where Main showed
every module as a clickable link regardless of permission), shows Thai
one-line descriptions per module (V1 proper-noun names kept as-is), surfaces
the signed-in user's display name/roles and an admin shortcut to
`/admin/permissions`, renders the spec'd empty state when a signed-in user has
no allowed modules, and demotes the former "Migration Control" stats into a
quieter `secondary-panel` below the modules. Verified against staging as
signed-out, `GUEST` (empty state), `PICKING_READER` (1 allowed + 6 denied),
and `ADMIN` (all 7 allowed + admin shortcut). See the 2026-06-20 work-log
entry for verification detail.

Architect command:

```text
Architect: หน้า Main เป็นยังไง ออกแบบหรือจำนำแบบเก่ามา
```

## 1. Goal

- Primary objective: decide the V2 Main page direction before polishing or
  rebuilding the dashboard route.
- Success definition: future agents know whether to copy the V1 Main UI, build
  a new V2 portal, or preserve only selected V1 behavior.
- User/business reason: Main is the first screen users will judge; it must feel
  familiar enough for operators while fitting the new unified V2 architecture.

## 2. Requirement And Scope Definition

### Problem

- V1 Main is a live Portal + SSO launcher with admin controls for users, app
  visibility, roles, and permissions.
- Current V2 `/` is still an engineering-oriented "Migration Control" page.
- V2 needs a real operator-facing Main page, but copying the V1 visual design
  directly would preserve legacy constraints instead of using the unified V2
  app shell.

### Users

- Primary users: AKRA staff opening modules they are allowed to use.
- Secondary users: supervisors checking pilot/module readiness.
- Admin/support users: admins managing permissions and reviewing migration
  state during staging.

### MVP Features

- Keep the V1 mental model:
  - sign in once;
  - show only allowed modules;
  - make current user and role context visible;
  - provide admin access only for admin users;
  - preserve a fast route to password/session/account actions when available.
- Redesign the visual UI for V2:
  - quiet operational dashboard, not a marketing page;
  - stable sidebar/app shell;
  - dense but readable module launcher;
  - clear statuses for Pilot, Queued, Planning, and unavailable modules;
  - mobile-first layout for staff on phones.
- Keep migration/status panels available, but demote them from the primary
  operator workflow.
- Use V2 app registry and permission model as the source of truth once guards
  are ready.

### Nice-To-Have Features

- "Recently used" or "Pinned modules" after real usage data exists.
- Per-role quick actions such as "New Picking requisition" once modules are
  implemented.
- Admin summary panel with user count, roles, and pending permission tasks.
- Search/filter for modules if the launcher grows beyond one screen.
- Lightweight announcement/maintenance banner for staging or cutover notices.

### Out Of Scope

- Copying V1 Main HTML/CSS/JS directly.
- Recreating V1 GAS SSO inside V2 before the identity bridge decision.
- Implementing admin user CRUD in this design plan.
- Changing V1 Main, GAS, Google Sheets, GitHub Pages URLs, or LINE tokens.
- Connecting V2 Production to live users before a cutover decision.
- Adding a broad design system beyond the existing V2 shell and tokens.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: Next.js App Router, TypeScript, existing `AppShell`, CSS tokens,
  and Lucide icons.
- Backend/server boundary: server components and server-only permission helpers.
- Database: `public.apps`, roles, permissions, and future audit/usage data in
  Supabase.
- Auth/permissions: Supabase Auth and server-side permission guard from
  `V2-0016`; optional V1 Main SSO bridge remains an open migration decision.
- Deployment: Vercel Preview/Development until cutover; Production stays
  disconnected from staging per `V2-0014`.

### Data Model / Schema

- Tables or entities involved: `apps`, `profiles`, `roles`, `permissions`,
  `role_permissions`, `user_roles`; future `audit_logs` or usage events.
- Important fields: app key, name, route, icon, status, required permission,
  current user role/permission snapshot.
- Relationships: Main reads app registry and filters/annotates modules by
  server-side permission result.
- Constraints: no authorization based on browser-editable state; no service
  role key in client code.
- RLS/security notes: Main can show fallback public/staging status, but
  permission-specific app visibility should come from server-side session and
  guard checks.

### Integration Points

- V1 references:
  - Preserve behavior: app launcher, allowed-app filtering, admin access,
    user identity display, role/permission mental model.
  - Do not preserve literally: single-file Tailwind CDN structure, full-screen
    blue/orange gradient login/dashboard, direct `?sso=TOKEN` launcher pattern
    unless identity bridge is explicitly chosen later.
- Supabase: read authenticated app registry and permission snapshot.
- Vercel: Preview/Development testing only for staging data.
- LINE/GAS/Sheets/API: no direct Main V2 dependency in MVP.
- Secrets/env vars: no new secrets; never expose `SUPABASE_SECRET_KEY`.

## 4. UI/UX And User Flow

### Recommended Direction

Use a hybrid approach:

```text
Keep V1 workflow and labels where they reduce retraining.
Redesign V2 layout and visual system for a unified operational web app.
Do not clone V1 Main's visual shell.
```

Rationale:

- V1 Main's core value is the access model, not the exact visual treatment.
- V2 must host modules in one app, so a persistent app shell is more suitable
  than a standalone launcher page.
- Operators should recognize module names and permission behavior immediately.
- Admins should still have a clear route into permission management.

### User Flow

1. User opens `/`.
2. If not signed in, show a signed-out Main state with a clear Sign In action
   and a short staging/non-production status note.
3. If signed in, server loads user profile, roles, permissions, and app
   registry.
4. Main shows allowed/available modules first.
5. Queued or unavailable modules remain visible only when useful for migration
   context, with disabled states that do not look clickable.
6. Admin users see a compact admin area linking to permissions and future user
   management.
7. User opens a module route from the launcher.

### Screens / States

- Screen: `/` Main portal.
- Empty state: no modules available for this user; show "no assigned modules"
  and admin/contact guidance.
- Loading state: server-rendered content should avoid client auth flicker.
- Error state: app registry load failure uses static fallback and records the
  source as fallback in UI or diagnostics.
- Permission-denied state: hidden or disabled module access must not be the
  only guard; module routes still require server guard.
- Mobile behavior: horizontal sidebar is acceptable short-term, but Main module
  cards should stack cleanly with 44px+ touch targets and no horizontal content
  overflow.

### Main Page Layout Proposal

- Top header:
  - product name: `AKRA WEBAPP`;
  - environment/status pill: `Staging`, `Pilot`, or `Preview`;
  - signed-in user and role summary.
- Primary module area:
  - allowed modules first;
  - each module shows icon, Thai/English label if useful, one-line purpose,
    status, and primary route.
- Quick action strip:
  - initially Sign In, Permissions for admin, Picking pilot entry for allowed
    users;
  - later module-specific actions.
- Migration/status area:
  - compact internal panel for Phase/Pilot/Production impact;
  - not the dominant first-viewport experience for operators.
- Admin area:
  - visible only to admins;
  - links to `/admin/permissions` now and future user/app/role management later.

### System Logic / Pseudocode

```text
registry = await getAppRegistry()
authState = await getOptionalPermissionSnapshot()

if no session:
  render signed-out portal state with public/fallback registry and sign-in CTA
else:
  allowed = registry.filter(app => can(snapshot, app.requiredPermission))
  queued = registry.filter(app => !app.route || !can(snapshot, app.requiredPermission))
  render allowed modules first
  if can(snapshot, "core.admin"):
    render admin shortcuts
```

## 5. Task Breakdown

1. Finish `V2-0016` server guard so Main can rely on a consistent permission
   snapshot.
2. Decide signed-out behavior: redirect to `/login` or show a signed-out Main
   portal state.
3. Define Main page information hierarchy and copy in Thai/English.
4. Update `/` to become operator-facing Main portal instead of migration-first
   dashboard.
5. Keep migration status as a compact secondary panel.
6. Filter or annotate modules by permissions without relying on client-side
   checks as the security boundary.
7. Verify with `ADMIN`, Picking writer, Picking reader, and guest test users.
8. Browser-check desktop and small mobile widths.

## 6. Files Expected To Change

- `src/app/page.tsx`
- `src/components/app-shell.tsx`
- `src/app/globals.css`
- `src/modules/core/app-registry.ts`
- `src/modules/auth/*` after `V2-0016`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`
- Optional ADR: `docs/decisions/0008-main-portal-redesign-with-v1-behavior.md`

## 7. Verification Steps

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Browser check `/` signed out.
- Browser check `/` signed in as admin.
- Browser check `/` signed in as Picking writer, Picking reader, and guest.
- Mobile viewport check around 375px and 390px.
- Confirm Main does not expose admin-only data to denied users.
- Confirm no V1 files, GAS deployments, Sheets, URLs, LINE tokens, or secrets
  changed.

## 8. Rollback / No-Production-Impact Note

This plan only governs V2 Main design. Implementation remains in the V2 repo
and Vercel staging/preview path. V1 Main remains the live Portal/SSO until an
explicit cutover is approved. A bad V2 Main UI change can be reverted or
forward-fixed without affecting V1.

## 9. Open Questions

- ~~Should `/` require sign-in immediately, or show a signed-out portal with a
  Sign In action?~~ Resolved 2026-06-20: signed-out portal with Sign In CTA.
- ~~Should Main module labels stay Thai-first like V1 or use English module names
  with Thai descriptions?~~ Resolved 2026-06-20: Thai-first, V1 wording.
- Should queued modules be visible to ordinary users, or only to admins during
  migration? (Plan default stands: visible to all with a disabled state.)
- Should password change/account actions be part of V2 Main MVP, or wait until
  the auth migration path is clearer?
- Should V2 Main later bridge to V1 app URLs during migration, or only route to
  V2 modules as they become available?

## 10. Handoff Notes

- Recommendation: use V1 as behavioral reference, not as visual source code.
- Next action: confirm this direction, then execute only after `V2-0016` or as
  a small UI-only slice that does not weaken route guards.
- Blockers: identity bridge and signed-out behavior decisions.
- Related plans: `V2-0009`, `V2-0015`, `V2-0016`, `V2-0010`.
- Related ADRs: `0006`, `0007`, and proposed `0008`.
