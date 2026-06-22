# AKRA WEBAPP V2 Frontend Conductor

This is the frontend coordination layer for AKRA WEBAPP V2. It keeps UI/UX
work moving with module migration, without creating a second source of truth
separate from the main project conductor.

## Purpose

- Keep UI/UX planning tied to each module migration slice.
- Preserve V1 workflow familiarity while allowing a better V2 interface.
- Make frontend shortcuts explicit so agents can resume, plan, mock up,
  implement, and review UI work consistently.
- Keep responsive behavior and role-based states visible before cutover.

## Source Of Truth

- `CONDUCTOR.md`, `docs/plans/index.md`, and
  `docs/handoff/current-state.md` remain the canonical project source of truth.
- This file is a frontend lens over the same plans, not an independent backlog.
- Frontend work should normally reference the same plan ID as the module work.
  Create a frontend-specific plan only when the UI/UX scope is large enough to
  review independently.

## Read Order For Frontend Work

For any message using a frontend shortcut, read:

1. `AGENTS.md`
2. `README.md`
3. `CONDUCTOR.md`
4. `FRONTEND_CONDUCTOR.md`
5. `Gemini.md` when Gemini is used for frontend, UI, UX, design exploration,
   or mock-up work
6. `docs/plans/index.md`
7. `docs/handoff/current-state.md`
8. `docs/project-management/decision-board.md`
9. The relevant module plan and migration docs
10. `C:\dev\WEBAPP\development_context.md` and the relevant V1 module files
   when V1 behavior or UX parity is involved
11. Existing mock-ups or frontend notes such as
    `docs/mockups/v2-ui-ux-mockup.html`

Open archive logs only when a current plan, ADR, bug, verification question, or
handoff note points there.

## UX Contract

- UX baseline: users should be able to complete the same operational flow they
  know from V1 unless a plan or ADR records an approved improvement.
- UI direction: V2 may improve layout, hierarchy, status visibility,
  accessibility, mobile behavior, and role-aware actions when those changes do
  not make the workflow harder to recognize.
- If a screen diverges from V1 behavior, record why in the relevant plan or ADR.
- Do not change V1 production files, GAS deployments, Sheets, URLs, LINE
  tokens, or production data from this V2 workspace.

## Frontend Commands

### `Frontend:` or `FE:`

Context-saving frontend resume. Read the frontend compact set, check
`git status --short`, then summarize:

- current UI/UX status;
- relevant V1 behavior baseline;
- recommended next frontend action;
- decisions needed before implementation.

This command does not authorize runtime code changes by itself.

### `Frontend Architect:`

Plan a frontend/UI slice only. Create or update a plan, mock-up note, or design
decision. Do not change runtime app code unless the same request also includes
`Go:`.

### `Frontend Mockup:`

Create or update a static mock-up under `docs/mockups/` before implementation.
The mock-up should show desktop and mobile intent, important states, role-aware
actions, and any proposed UI improvement over V1.

### `Frontend Go:`

Implement an approved frontend slice. Before editing, read the relevant plan,
V1 reference when applicable, and current route/component code. Keep the slice
small, then run the relevant checks.

### `Frontend Review:`

Review UI/UX, accessibility, responsiveness, and role-state behavior. Lead with
findings and file/line references where possible.

### `Responsive Check:`

Audit responsive behavior for the selected screen or module. If paired with
`Go:`, fix the smallest safe responsive issue; otherwise report findings and a
recommended plan.

### `Design System:`

Create or update reusable UI standards, tokens, component guidance, or design
rules. Do not implement module runtime behavior unless paired with `Go:`.

## Frontend Definition Of Done

For runtime UI changes:

- V1 workflow reference was checked when replacing or matching a V1 screen.
- Signed-out, denied, reader, writer, and admin states are considered when the
  route uses permissions.
- Mobile layout is checked at 390px or another documented narrow viewport.
- There is no horizontal overflow in normal mobile use.
- Interactive controls have visible labels or accessible names, clear focus
  states, and touch targets suitable for operational use.
- Relevant checks pass (`lint`, `typecheck`, `build`, tests, or a documented
  narrower check when appropriate).
- Browser verification is run for UI changes when feasible.
- Handoff docs are updated before final response.
