# `src/modules/kpi`

KPI and analytics domain module.

Current status:

- KPI frontend mock-up exists under `docs/mockups/kpi-ui-ux-mockup.html`.
- No KPI runtime schema, read model, or analytics views have been implemented
  yet.
- `/kpi` currently renders the guarded shared placeholder landing page.

Expected future shape:

- Analytics/read models after operational module data stabilizes.
- RLS-aware or unexposed reporting views if database views are introduced.

Rules:

- Do not expose raw reporting views in `public` without RLS/security-invoker
  review.
- Keep KPI read models separate from operational write paths.
- Route files under `src/app/kpi/**` should remain thin.

