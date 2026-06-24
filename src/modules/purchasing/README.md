# `src/modules/purchasing`

Purchasing domain module for PR and PO workflows.

Current status:

- Database foundation exists in `supabase/migrations/0013_pr_po_gr_foundation.sql`.
- `read-model.ts`/`format.ts` implement a permission-gated read-only PO
  list (`/purchasing`) and detail (`/purchasing/[id]`) over the `V2-0044`
  staging import (`V2-0047`).
- PR read model/UI is not implemented yet — the current PR source has 0
  imported rows, so there is no real data to display.
- No write actions/RPC wrapper exist yet; blocked by `V2-0046`/ADR `0025`
  until the operational-readiness package is approved.

Expected future shape:

- `reference-data.ts` for vendors, products, warehouses, and status options.
- PR read model/UI once a non-empty PR export is imported and proven.
- Server actions for approved write workflows only after `V2-0046` is
  approved.

Rules:

- Do not create a separate product or vendor master here; use shared catalog
  tables.
- Keep PR/PO bill identity rules aligned with
  `docs/migration/master-data-vocabulary.md` and ADR `0020`/`0022`.
- Route files under `src/app/purchasing/**` should remain thin.

