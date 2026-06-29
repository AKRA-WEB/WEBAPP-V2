# `src/modules/purchasing`

Purchasing domain module for PR and PO workflows.

Current status:

- Database foundation exists in `supabase/migrations/0013_pr_po_gr_foundation.sql`.
- `read-model.ts`/`format.ts` implement a permission-gated read-only PO
  list (`/purchasing`) and detail (`/purchasing/[id]`) over the `V2-0044`
  staging import (`V2-0047`).
- PR read helpers, detail UI, reference-data loading, and V2-native PR create
  form/action are implemented in `V2-0049`: `/purchasing/pr/new` creates a
  pending PR through service-role-only `public.create_purchase_requisition(...)`,
  then redirects to `/purchasing/pr/[id]`.
- Signed-in browser UAT for the PR create form is still pending before any
  production cutover.

Expected future shape:

- Supervisor approve/reject actions.
- PO-from-approved-PR workflow.
- Direct PO mutation and GR receive/reset/confirm workflows, after grouped
  PR/PO/GR staging UAT planning.

Rules:

- Do not create a separate product or vendor master here; use shared catalog
  tables.
- Keep PR/PO bill identity rules aligned with
  `docs/migration/master-data-vocabulary.md` and ADR `0020`/`0022`.
- Route files under `src/app/purchasing/**` should remain thin.
