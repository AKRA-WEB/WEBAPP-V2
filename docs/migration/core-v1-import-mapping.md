# Core V1 Import Mapping

This document maps the V1 core permission sheets into the V2 Supabase core
schema. It is a planning artifact only; no production Sheets are exported or
modified by this plan.

## Source Sheets

Source behavior is documented in `C:\dev\WEBAPP\development_context.md`.

| V1 Sheet | Known Columns / Shape | Purpose |
| --- | --- | --- |
| `User` | `id`, `name`, `roles`, `Password` | Login identity and assigned roles |
| `RoleConfig` | role list | Role catalog |
| `PermConfig` | `AppID`, `PermKey`, role columns such as `ADMIN`, `SUPERVISOR`, `AKRA`, `TRD`, `WAREHOUSE`, `Cashier` | Permission matrix |
| `AppConfig` | app access by role | App registry / access matrix |

## Target Tables

| V2 Table | Import Rule |
| --- | --- |
| `public.profiles` | Bind to Supabase Auth users. Store V1 `User.id` in `legacy_uid`, `User.name` in `display_name`, and `v1.User` in `legacy_source`. Do not import `Password`. |
| `public.roles` | Seed from `RoleConfig` and role tokens found in `User.roles` / `PermConfig` columns. Normalize by trimming whitespace; preserve canonical uppercase keys except existing mixed-case legacy names that must be explicitly approved. |
| `public.user_roles` | Split `User.roles` on commas, trim each token, match to `roles.key`, and insert one row per user-role pair. |
| `public.permissions` | Keep the structural V2 permission catalog from migration `0003`. Map V1 `AppID + PermKey` to one approved V2 permission key; do not auto-create permissions from unknown sheet values. |
| `public.role_permissions` | For each truthy role cell in `PermConfig`, grant the mapped V2 permission to that role. `ADMIN` remains a short-circuit role even without explicit grants. |
| `public.apps` | Use `AppConfig` to validate seeded app rows and initial read access assumptions. Route/status values remain owned by V2. |
| `public.audit_logs` | Do not import historical sheet edits in Phase 2. Start writing new V2 privileged changes after admin tools exist. |

## Permission Mapping Rules

- V1 module app IDs must map to the V2 app keys in `public.apps`.
- V1 granular permission keys should map to the nearest V2 permission:
  `*.read`, `*.write`, or `core.admin`.
- Any V1 permission that controls a sensitive admin action must not be collapsed
  into `*.write` without an explicit decision record.
- Unknown `AppID`, unknown `PermKey`, or unknown role columns are import
  blockers, not warnings.

## Validation Before Import

- Every V1 user has a non-empty legacy `id` and `name`.
- Every role token used by a user exists in `roles`.
- Every `PermConfig` role column maps to exactly one V2 role.
- Every `AppID + PermKey` row maps to exactly one V2 permission or is explicitly
  marked out of scope.
- The import produces deterministic row counts for `profiles`, `roles`,
  `user_roles`, and `role_permissions`.
- No V1 password hashes, plaintext passwords, GAS URLs, LINE tokens, or
  Supabase service keys are written to repo files.

## Open Decisions

- Decide how V1 users without email addresses will be represented in Supabase
  Auth before profiles can be linked.
- Decide whether V1 role key casing is normalized globally or preserved for
  display only.
- Decide whether `AppConfig` should generate initial `*.read` grants or only
  validate grants derived from `PermConfig`.
