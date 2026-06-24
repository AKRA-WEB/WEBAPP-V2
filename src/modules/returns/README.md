# `src/modules/returns`

Returns domain module for Returnitem and claim/damaged-goods workflows.

Current status:

- Returnitem product aliases are represented in the shared catalog baseline.
- No returns-specific runtime schema or route logic has been implemented yet.
- `/returns` currently renders the guarded shared placeholder landing page.

Expected future shape:

- Dedicated V1 mapping and schema plan before runtime implementation.
- Read models and actions only after the Returnitem workflow boundary is
  profiled against V1.

Rules:

- Use shared catalog aliases for Returnitem product names.
- Do not infer returns workflow schema from warehouse or receiving tables
  without a dedicated plan.
- Route files under `src/app/returns/**` should remain thin.

