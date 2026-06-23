# ADR 0020: PR/PO/GR Foundation Schema And RLS Lock

Date: 2026-06-22

## Status

Accepted for migration draft `0013`

## Context

`V2-0036` completed the first PR/PO/GR foundation slice: source profiling and a
repeatable dry-run report. The report found 0 blockers and 7 warnings:

- no PR CSV export exists yet, although a live V1 `PR` sheet exists;
- exported `PO.csv` has no `Expected_Date` column even though V1 code documents
  one;
- 233 legacy bare-`DIRECT` bill groups rely on V1's ambiguous fallback key;
- 10 GR rows reference `Ref_PO_UID` values absent from `PO.csv`;
- date anomalies and manual-review product matches need to be preserved rather
  than normalized away.

Supabase docs/changelog were rechecked on 2026-06-22 before locking this plan.
The relevant current guidance is unchanged for this work: Data API access is
controlled by explicit grants plus RLS, new public tables created in SQL must
enable RLS and grant only intended roles, and database functions should use
`SECURITY INVOKER` by default with narrow `EXECUTE` grants.

## Decision

Migration `0013` will be a schema/RLS foundation only. It will create tables,
indexes, constraints, RLS, grants, and select policies. It will not import
PR/PO/GR rows, implement runtime UI, send notifications, or add transaction
RPCs unless verification proves a minimal helper is required.

The locked table family is:

- `public.purchasing_purchase_requests`
- `public.purchasing_purchase_request_lines`
- `public.purchasing_purchase_orders`
- `public.purchasing_purchase_order_lines`
- `public.purchasing_events`
- `public.receiving_goods_receipts`
- `public.receiving_goods_receipt_lines`
- `public.receiving_line_splits`
- `public.receiving_events`

Legacy handling is locked as follows:

- missing PR CSV does not block schema creation; PR import waits for a fresh
  export;
- `Expected_Date` is nullable and paired with `raw_expected_date` plus
  `expected_date_source`;
- bare `Ref_PR_UID = "DIRECT"` is legacy-only, marked ambiguous, and never
  reused for new V2 writes;
- `DIRECT-<uuid>` and future V2 direct POs use stable identities;
- orphan GR `Ref_PO_UID` rows remain importable with nullable PO-line FK and
  raw match status;
- raw status, raw dates, raw names, and raw locations stay auditable.

RLS/grants are locked as follows:

- every new `public.*` table enables RLS;
- revoke all from `public`, `anon`, and `authenticated` before explicit grants;
- grant `select` to `authenticated` only where browser reads are intended;
- grant full table privileges to `service_role` for server-side import/actions;
- no `anon` grants or policies;
- no authenticated insert/update/delete policies in `0013`;
- PR tables use `purchasing.read OR purchasing.write`;
- PO tables use `purchasing.read/write OR receiving.read/write`;
- receiving tables use `receiving.read/write OR purchasing.read/write`;
- keep the existing `purchasing.read/write` and `receiving.read/write`
  permissions. Do not add granular approve/close permissions until a UI/action
  slice proves the split is needed.

## Consequences

- The next `Go:` can draft migration `0013` without waiting for PR CSV export,
  expected-date freshness, or cutover release-shape decisions.
- Import tooling must preserve unresolved relationships instead of fabricating
  products, vendors, warehouses, PR links, or PO-line links.
- Future write functions still follow ADR `0015`: `public`, default
  `SECURITY INVOKER`, `EXECUTE` revoked from `public`/`anon`/`authenticated`,
  granted only to `service_role`, and called only after server-side permission
  checks.
- PR/PO/GR cutover remains a separate decision after data import, UI workflow,
  human UAT, and rollback evidence.

## Related

- Plan: `docs/plans/V2-0036-pr-po-gr-foundation.md`
- Mapping: `docs/migration/pr-po-gr-v1-mapping.md`
- Dry-run report: `import-reports/pr-po-gr-dry-run-report.md`
- ADR: `docs/decisions/0015-public-schema-service-role-rpc-for-atomic-writes.md`
- ADR: `docs/decisions/0016-module-by-module-v1-parity-sequence.md`
