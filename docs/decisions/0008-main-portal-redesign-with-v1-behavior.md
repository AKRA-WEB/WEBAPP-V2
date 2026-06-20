# ADR 0008: Main Portal Redesign With V1 Behavior

Date: 2026-06-19

## Status

Accepted (confirmed by user 2026-06-20 via `Go:`)

## Context

V1 Main is the live Portal + SSO entry point. It provides login, allowed-app
launching, current user context, and admin tools for users, app visibility,
roles, and fine-grained permissions.

V2 currently has a dashboard route that is useful for migration status, but it
is not yet the operator-facing Main portal. The user asked whether V2 Main
should be designed new or reuse the old Main.

## Decision

V2 Main should be redesigned as a new operational portal while preserving V1's
behavioral model and familiar module concepts.

Preserve from V1:

- sign in once;
- show allowed modules based on permissions;
- keep user and role context visible;
- give admins clear access to permission/user management;
- keep recognizable module names and operational language.

Do not copy from V1:

- single-file HTML/Tailwind CDN implementation;
- standalone full-screen launcher structure;
- direct visual clone of the blue/orange gradient card shell;
- client-side app-launch token pattern unless a future identity-bridge decision
  explicitly requires it.

Confirmed implementation specifics (2026-06-20):

- Module/UI labels are Thai-first, preserving V1 wording, to minimize operator
  retraining.
- `/` shows a signed-out Main portal state with a Sign In CTA rather than
  redirecting to `/login`.

## Consequences

- Operators get a familiar workflow without carrying forward V1 implementation
  constraints.
- V2 can keep a persistent app shell, server-side permission checks, and module
  routes that match the target architecture.
- Migration/status information remains available, but it should not dominate
  the first screen for normal operators.
- A future implementation must still verify permission allow/deny behavior for
  admin, Picking writer, Picking reader, and guest users.

## Related

- Plan: `docs/plans/V2-0017-main-portal-design-direction.md`
- Architecture: `docs/architecture/target-architecture.md`
- V1 reference: `C:\dev\WEBAPP\Main\index.html`
