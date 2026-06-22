# Gemini Frontend / UI / UX Instructions

This file is the Gemini-specific companion for AKRA WEBAPP V2 frontend,
interface design, and UX work. It does not replace `AGENTS.md`,
`CONDUCTOR.md`, or `FRONTEND_CONDUCTOR.md`.

## Role

Use Gemini for design exploration, UI/UX critique, visual direction, responsive
review, mock-up support, and frontend implementation advice. Gemini output is a
proposal or review input until the project plan is updated and the user gives
an execution command.

## Required Reading

For Gemini-assisted frontend work, read in this order:

1. `AGENTS.md`
2. `README.md`
3. `CONDUCTOR.md`
4. `FRONTEND_CONDUCTOR.md`
5. `Gemini.md`
6. `docs/frontend/ui-ux-operating-model.md`
7. `docs/plans/index.md`
8. `docs/handoff/current-state.md`
9. The relevant module plan
10. `C:\dev\WEBAPP\development_context.md` and relevant V1 module files when
    V1 behavior or UX parity is involved
11. Existing mock-ups such as `docs/mockups/v2-ui-ux-mockup.html`

Do not use chat history as the source of truth.

## Non-Negotiable Rules

- V1 production systems are read-only references unless the user explicitly
  approves a production V1 task.
- UX should feel familiar to V1 users unless a plan or ADR approves a change.
- UI may improve visual hierarchy, responsiveness, accessibility, density,
  status visibility, and role-aware actions.
- Frontend work must stay tied to the migration plan board and module order.
- Do not introduce secrets, service-role keys, LINE tokens, live GAS URLs, or
  production credentials into any design artifact or code.
- Do not treat visual design as separate from data readiness, permissions,
  server actions, notification behavior, or cutover risk.

## Expected Gemini Output

When Gemini is used for UI/UX, its output should include:

- V1 workflow baseline: what users do today and which labels/actions matter.
- Proposed V2 UI direction: what changes visually and why it helps.
- UX parity notes: what stays the same so users do not need to relearn the task.
- Responsive notes: desktop and 390px mobile behavior, including overflow risk.
- Role/state matrix: signed-out, denied, reader, writer, admin, loading, empty,
  error, and retry states when relevant.
- Data and permission dependencies: fields, RPC/server actions, route guards,
  and notification side effects needed before the UI can be real.
- Risks and open decisions: especially anything requiring user approval,
  cutover approval, credentials, or V1 behavior confirmation.
- Recommended next action: plan, mock-up, implementation slice, or review.

## Design Direction

- Operational screens should be dense, clear, and scannable.
- Use V1 task order and terminology as the first UX baseline.
- Improve repeated V1 pain points with better grouping, clearer status labels,
  safer confirmations, better mobile wrapping, and visible retry/error states.
- Prefer real controls over explanatory text: buttons for commands, inputs for
  values, tabs/filters for views, badges for status, and tables/lists only when
  they remain usable on mobile.
- Avoid decorative-heavy layouts that hide the work. The first viewport should
  show the actual module, task, or record state.

## Mock-up Guidance

For `Frontend Mockup:` work:

- Store static mock-ups under `docs/mockups/`.
- Show at least one desktop and one mobile/narrow layout concept.
- Include important role-aware actions and denied/empty/error states when they
  affect the workflow.
- Mark proposed improvements over V1 explicitly, but do not change workflow
  behavior without recording the decision in a plan or ADR.
- Keep mock-ups independent from Supabase, LINE, V1 GAS, and production data.

## Review Guidance

For `Frontend Review:` or `Responsive Check:` work:

- Lead with findings, ordered by severity.
- Reference concrete files, routes, or mock-up sections.
- Check 390px mobile behavior and long unbroken operational strings such as
  emails, product names, bill numbers, and status labels.
- Check permissions in both navigation and route-level behavior.
- Identify whether the issue is a UX parity problem, UI clarity issue,
  responsive defect, accessibility gap, data dependency, or cutover risk.

## Handoff

Any non-trivial Gemini-assisted frontend work must be recorded in the normal
handoff path:

- Update the relevant plan or create a new one.
- Update `docs/plans/index.md`.
- Update `docs/handoff/current-state.md`.
- Append a concise English entry to `docs/handoff/work-log.md`.
- Add or update an ADR if the work changes future behavior or process.
