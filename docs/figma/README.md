# Figma / FigJam Artifacts

This folder holds import-ready design artifacts for Figma or FigJam. These
files are derived from repo documentation and are safe to share as planning
material.

## AKRA V2 Detailed Workflow Diagram

File:

- `docs/figma/akra-v2-app-workflow-board.svg`

Source:

- `docs/architecture/app-flow-diagrams.md`
- latest status from `docs/plans/index.md` and
  `docs/handoff/current-state.md`

Import steps:

1. Open the FigJam board.
2. Drag `akra-v2-app-workflow-board.svg` onto the canvas.
3. Resize as needed.
4. Ungroup the SVG in Figma/FigJam to edit text, boxes, arrows, or module
   sections.
5. Use visible step IDs such as `P9`, `PO12A`, or `GR14B` when asking for
   workflow changes.

How to read the chart:

- Diamond nodes are decisions.
- Arrow labels such as `Approve`, `Reject`, `Yes`, and `No` show the branch.
- Red nodes are rejected, blocked, or returned-for-change outcomes.
- Green rounded nodes are successful end states.

Revision note:

- The first 2026-06-26 revision replaced the compact overview board with a
  larger detailed step diagram. The second 2026-06-26 revision replaced that
  step-list diagram with a proper flow chart (`3600 x 8058`) containing 101
  flowchart nodes and 101 labeled edges. Reject paths now terminate visibly,
  for example `Supervisor review -> Reject -> Status: rejected / closed -> No
  PO is created`.

Current limitation: this Codex session has no exposed Figma/FigJam write tool,
and the provided `figma.com/board/new...` URL is a new-board URL rather than an
editable node link. The artifact is therefore import-ready instead of being
written directly into the remote board.
