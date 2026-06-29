# Plan V2-0048: FigJam App Workflow Board

Status: Complete - executed 2026-06-25; flowchart revision 2026-06-26

Execution command:

```text
Go: ทำ workflow board ของทุก app ลง Figma/FigJam จาก docs/architecture/app-flow-diagrams.md
```

## 1. Goal

- Primary objective: produce an import-ready Figma/FigJam workflow board for
  all AKRA WEBAPP V2 apps using `docs/architecture/app-flow-diagrams.md` as
  the flow source and the latest plan board as the status source.
- Success definition: a single SVG board exists under `docs/figma/`, can be
  dragged into FigJam/Figma, ungrouped for editing, and clearly distinguishes
  implemented, read-only, planned, placeholder, and cutover-gated workflows.
- User/business reason: provide a visual workflow board that can be reviewed
  with stakeholders without depending on chat history or Mermaid tooling.

## 2. Scope

In scope:

- Main/Auth, Picking, Purchasing PR, Purchasing PO, Receiving GR, Warehouse,
  Returns, and KPI workflow sections.
- A top-level system entry flow and status legend.
- A note that PO/GR read-only UI is now implemented (`V2-0047`), even though
  the original Mermaid source predates that status.
- A reproducible generator script for the SVG artifact.
- Visible step IDs for review, such as `P9`, `PO12A`, and `GR14B`, so
  stakeholders can name exact workflow steps that need to change.
- Proper flowchart nodes and edges: diamond decision nodes, branch labels
  (`Approve`, `Reject`, `Yes`, `No`), and explicit red reject/blocked outcomes
  such as `Status: rejected / closed` and `No PO is created`.

Out of scope:

- Direct remote FigJam editing. This session has no exposed Figma/FigJam write
  tool, and the supplied `figma.com/board/new...` link is not an exact editable
  node link.
- Runtime app code, schema, migration, staging data, V1 production apps, GAS,
  Sheets, live URLs, or LINE tokens.
- Changing `docs/architecture/app-flow-diagrams.md` itself.

## 3. Files Changed

- `scripts/generate-figjam-workflow-board.mjs`
- `docs/figma/README.md`
- `docs/figma/akra-v2-app-workflow-board.svg`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 4. Verification

- Run `node scripts/generate-figjam-workflow-board.mjs`.
- Confirm `docs/figma/akra-v2-app-workflow-board.svg` is generated.
- Confirm the generated SVG contains all 8 module labels, 87 module workflow
  steps, and the 6-step system entry pattern.
- Confirm the current flowchart SVG contains decision diamonds, labeled edges,
  and explicit reject destinations for PR, PO, and Returns.
- Run `git diff --check`.

## 5. Rollback / No-Production-Impact Note

Rollback is to delete the generated SVG, its README entry, the generator
script, and this plan/handoff update. This is a documentation/design artifact
only. It does not touch runtime code, database schema, staging data, deployment
settings, V1 production files, GAS deployments, Sheets, live URLs, LINE tokens,
or secrets.

## 6. Handoff Notes

- Executed 2026-06-25.
- Direct FigJam write was not possible from the available tools; delivered an
  import-ready SVG board instead.
- Revised 2026-06-26 after user feedback that the first artifact was not clear:
  the generator now emits a larger detailed workflow diagram (`3600 x 11479`)
  with one module per section, larger text, visible step IDs, and 87 module
  workflow steps.
- Revised again 2026-06-26 after user feedback that the detailed step list was
  still not readable as a workflow: the generator now emits a proper flowchart
  SVG (`3600 x 8058`) with 101 flowchart nodes, 101 labeled edges, decision
  diamonds, and explicit reject destinations.
- Next action: open the FigJam board and drag in
  `docs/figma/akra-v2-app-workflow-board.svg`.
