# ADR 0010: Reusable Server Permission Guard Pattern

Date: 2026-06-19

## Status

Accepted

## Context

To secure Next.js server-rendered pages and future server actions in V2, we need a consistent way to enforce role-based access control and permissions. Copying permission checks (`getPermissionSnapshot()` and `can()`) into every page or action leads to code duplication, high audit overhead, and inconsistent "fail-closed" behavior.

We need a centralized, server-side helper that can evaluate permissions (including single permission, list-based "any of", or "all of" checks), support admin role bypass, and handle system configuration/authentication errors gracefully.

## Decision

Implement `requirePermission()` as a reusable, server-only utility located in [guard.ts](file:///C:/dev/AKRA-WEBAPP-V2/src/modules/auth/guard.ts).

Key features:
- **Fail-Closed by Default**: If the Supabase environment is missing, or if the user is unauthenticated, it denies access immediately.
- **Explicit Requirement Required**: Callers must provide a non-empty
  `permission`, `anyOf`, or `allOf` requirement. Empty guard calls fail closed
  even for signed-in users.
- **Support for Multi-Permission Gates**:
  - `permission`: Strict single permission check.
  - `anyOf`: Accepts an array of permissions and permits access if the user matches *any* of them (common for read paths like `picking.read` or `picking.write`).
  - `allOf`: Requires the user to have *all* listed permissions.
- **Admin Role Bypass**: Users with the `ADMIN` role are automatically allowed to bypass checks.
- **Typed Result Shape**: Instead of throwing ambiguous errors, it returns a typed `GuardResult` containing `{ status: "allowed" | "denied", reason?, snapshot? }` so caller routes can decide how to render the denied UI or redirect the user.
- **Unified Denied UI**: Use the reusable [AccessDenied](file:///C:/dev/AKRA-WEBAPP-V2/src/components/access-denied.tsx) component to render clean, context-appropriate errors (unauthenticated with sign-in buttons, forbidden, or system not configured) within the standard layout.

## Consequences

- Prevents boilerplate code duplication across Next.js dynamic pages and future server actions.
- Facilitates security audits by centralizing access control checks.
- Simplifies upcoming Pilot Picking and other module route integrations.
- Caller components and routes must be marked with `export const dynamic = "force-dynamic"` to ensure checks run dynamically per-request.
