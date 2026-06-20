# Plan V2-0026: Database Structure Data-Flow HTML

Status: Complete on 2026-06-20

User request:

```text
ขอดู Database Stucture แบบ Data flow ของแต่ละแอพหน่อย ทำออกมาเป็น html เพื่อให้ดูง่าย
```

## 1. Goal

- Create an easy-to-read HTML document showing the current V2 database
  structure and data flow by app/module.
- Clearly distinguish implemented/staging database objects from planned module
  schemas and local in-progress problem-reporting work.

## 2. Scope

- Use local repo sources only: migrations, migration docs, plan index,
  current-state handoff, module inventory, and active local workspace files.
- Cover Main/Core, shared catalog/warehouse, Picking, PR/PO, GR,
  TRDAKRA/W5, Returnitem, KPI, and Notifications.
- Produce a static HTML file that can be opened directly.

## 3. Out Of Scope

- Runtime app changes.
- Supabase schema changes or staging database writes.
- V1 production apps, GAS deployments, Sheets, URLs, LINE tokens, or secrets.

## 4. Files Changed

- `docs/database/data-flow.html`
- `docs/plans/V2-0026-database-data-flow-html.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 5. Verification

- Documentation-only change.
- Run `git diff --check`.

## 6. Handoff Notes

- The HTML intentionally marks Picking problem reporting as local
  in-progress/uncommitted because `0011_picking_problem_reports.sql` and related
  route/action/form files exist in the workspace but the compact handoff docs
  still name problem reporting as the next slice.
- Next implementation action remains to settle/verify the problem-reporting
  slice or continue to LINE notification/failure recovery after it is closed.
