# `src/modules/receiving`

Receiving domain module for GR workflows.

Current status:

- Database foundation exists in `supabase/migrations/0013_pr_po_gr_foundation.sql`.
- `read-model.ts`/`format.ts` implement a permission-gated read-only GR
  list (`/receiving`) and detail (`/receiving/[id]`, including
  `receiving_line_splits`) over the `V2-0044` staging import (`V2-0047`).
- No write actions/RPC wrapper exist yet; blocked by `V2-0046`/ADR `0025`
  until the operational-readiness package is approved.

Expected future shape:

- `reference-data.ts` for receiver, warehouse, and location options.
- Server actions for review/confirm/recall/reset workflows only after
  `V2-0046` is approved and grouped PR/PO/GR UAT design is proven.

Rules:

- Preserve raw `Loc_IN`, ATA, Exp_Date, lift-fee, and extra-item evidence.
- Do not fabricate PO-line links for orphan `Ref_PO_UID` rows.
- Route files under `src/app/receiving/**` should remain thin.

