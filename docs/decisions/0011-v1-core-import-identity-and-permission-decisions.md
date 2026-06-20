# ADR 0011: V1 Core Import Identity And Permission Decisions

Date: 2026-06-20

## Status

Accepted

## Context

`V2-0009`/`V2-0015` required the actual V1 `User`/`RoleConfig`/`PermConfig` import to
staging, gated on user approval and on real V1 export data being available. Real
exports were found locally under `import-data/main/` (gitignored), in a different
shape than the synthetic fixtures `scripts/core-import-dry-run.mjs` was built
against: `User.csv` uses `ID,Name,Roles,Password` (capitalized), `RoleConfig.csv`
keys roles by `val` instead of `role`, and `PermConfig.csv` has more granular
`app-ret.*` keys than the original V1-to-V2 permission map covered.

Running the dry run against the real data surfaced three decisions before any
write could happen.

## Decisions

1. **Synthetic email keyed on V1 ID, not just display name.** The original
   scheme (`safeName@akra-v2.test`) collided for two V1 users sharing a display
   name (caught by the synthetic fixture's `DuplicateName` case) — colliding
   emails would merge two distinct V1 identities into one Supabase Auth user.
   Changed to `${safeName}.${safeId}@akra-v2.test`, keyed on the V1 row's
   unique `ID`, which cannot collide.
2. **`app-akra.manageProducts` is intentionally unmapped and dropped from this
   import.** It doesn't fit any existing coarse V2 permission
   (`warehouse.write` is a stretch — it's catalog/product management, which is
   `V2-0018`'s emerging domain, not warehouse operations). User confirmed:
   leave it unmapped now; revisit when a real catalog-permission key exists.
   The remaining six previously-unmapped `app-ret.*` keys (`ADD_CLM`,
   `WH_CLM`, `AUDIT_CREATE`, `AUDIT_REVIEW`, `BATCH_RET`, `TRACK_CUST`) were
   added to the map as `returns.write`, consistent with the four `app-ret.*`
   keys already mapped that way.
3. **All 15 V1 user rows were imported as-is**, including four with
   non-numeric IDs (`hhsawyer`/Herehorr, `Stamp1112`/STAMP, `TEST172980`/
   CHENCHEN, `AKRA12123`/TRAINEE (S)) that looked like they could be
   QA/test artifacts in the V1 sheet itself. User confirmed they are real V1
   accounts to bring over; none were excluded.

## Consequences

- `scripts/core-import-dry-run.mjs` now reads `import-data/main/` when present
  (falling back to the synthetic `import-snapshots/` fixtures otherwise),
  using case-insensitive/alias header lookups so real V1 header naming
  (`ID`/`Name`/`Roles`, `val` for role key) doesn't block validation.
- `scripts/core-import-apply.mjs` is the new idempotent write script: it
  requires `--confirm-core-import`, refuses to run unless
  `NEXT_PUBLIC_SUPABASE_URL` targets the known staging project ref, creates
  the five missing V2 roles (`SUPERVISOR`, `AKRA`, `TRD`, `WAREHOUSE`,
  `CASHIER`) from `RoleConfig.csv`'s label/desc, upserts `role_permissions`,
  and creates/links `auth.users` + `profiles` + `user_roles` per V1 user. It
  never reads or stores the V1 `Password` column.
- Staging now has 15 real V1-identity users (synthetic `@akra-v2.test`
  emails, no password set — sign-in requires a separate magic-link/reset
  flow, not yet built), 5 new roles, and 18 new `role_permissions` grants.
- `app-akra.manageProducts` has no V2 permission yet; no V1 user currently
  has elevated catalog-management access in V2 as a result. Revisit when
  `V2-0018` catalog work defines a permission for it.
