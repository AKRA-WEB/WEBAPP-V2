# `src/modules/warehouse`

Warehouse domain module for TRDAKRA, W1/W2/W5, stock, dispatch, and survey
workflows.

Current status:

- Shared catalog/warehouse baseline tables and staging data exist from
  migration `0008`.
- No warehouse runtime workflow has been implemented yet.
- `/warehouse` currently renders the guarded shared placeholder landing page.

Expected future shape:

- Read models for product/location/balance/movement views.
- Server actions for stock movement workflows only after a dedicated plan.
- Clear ownership for any cross-module writes from Receiving into warehouse
  movements.

Rules:

- Use `warehouse_*` tables from the shared baseline.
- Keep W1/TRD and W2-W5/C1/C2/AKRA business-unit assumptions aligned with
  `docs/migration/product-catalog-v1-mapping.md`.
- Route files under `src/app/warehouse/**` should remain thin.

