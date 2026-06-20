# AGENTS.md

Operating rules for AI agents and developers working in AKRA WEBAPP V2.

## 1. Isolation From V1

V2 is a separate rewrite workspace. Do not modify production V1 apps from this
repository.

Do not change:

- `C:\dev\WEBAPP` application repos
- Google Apps Script deployments
- Google Sheets production schemas
- GitHub Pages deployments for V1
- Live GAS URLs or LINE tokens

Use V1 only as reference unless the user explicitly asks for a production V1
change.

## 2. Required Reading Order

Before planning or editing, read:

1. `AGENTS.md`
2. `README.md`
3. `CONDUCTOR.md`
4. `docs/plans/index.md`
5. `docs/handoff/current-state.md`
6. `docs/handoff/work-log.md` active recent entries only
7. Active plan files listed in `docs/plans/index.md`
8. `docs/architecture/target-architecture.md`
9. `docs/migration/migration-plan.md`
10. `docs/migration/module-inventory.md`
11. `C:\dev\WEBAPP\development_context.md` when V1 behavior is relevant

Open `docs/handoff/archive/*` only when a current plan, ADR, bug investigation,
or verification question requires older historical detail.

Context budget rule: use `docs/plans/index.md` and
`docs/handoff/current-state.md` as compact summaries. Do not read archive logs
or paste long command output into handoff docs during normal resume. Keep the
active work log to the latest 3-5 entries or roughly 400 lines, and archive
older entries with dated pointers.

If the task involves Supabase, also verify current Supabase docs/changelog
before implementing schema, auth, RLS, or migration changes.

## 2.1 Session Shortcut

When the user says `Let's work`, treat it as a context-saving resume shortcut:

- Read only the compact resume set first: `AGENTS.md`, `README.md`,
  `CONDUCTOR.md`, `docs/plans/index.md`,
  `docs/handoff/current-state.md`,
  `docs/project-management/decision-board.md`, and active recent
  `docs/handoff/work-log.md`.
- Do not read archive logs unless a current plan, ADR, bug, or verification
  question requires older detail.
- Check `git status --short`.
- Summarize current status, recommended next action, and decisions needed.
- Do not edit runtime code from `Let's work` alone. If the message also
  includes `Architect:`, `Go:`, or `Review:`, handle that command after the
  resume step.

## 3. Handoff Discipline

Every non-trivial change must update handoff files before final response:

- Update `docs/handoff/current-state.md` with current status and next action.
- Append a dated entry to the active `docs/handoff/work-log.md`.
- When `docs/handoff/work-log.md` grows long, move older entries to
  `docs/handoff/archive/` and leave archive pointers in the active log.
- If a decision was made, add or update a file under `docs/decisions/`.
- If a module moved phase, update `docs/migration/module-inventory.md`.

Write handoff records in English so any future agent can continue after chat
context is cleared. User-facing summaries may be Thai.

## 4. Planning Standard

If the user message starts with `Architect:`, draft or update a detailed plan
only. Do not implement runtime code until the user sends an execution command
such as `Go:`. Use `docs/plans/templates/architect-plan-template.md` as the
default structure and update `docs/plans/index.md` plus handoff docs.

For multi-step work, write or update a small plan with:

- Goal
- Scope
- Out of scope
- Files expected to change
- Verification steps
- Rollback or no-production-impact note

Do not rely only on chat messages. Persist the plan in repo docs.

## 5. Implementation Boundaries

- Prefer small, reviewable changes.
- Do not scaffold large frameworks unless the user asked for implementation.
- Do not introduce secrets into files.
- Do not expose Supabase `service_role` keys or secret keys to the browser.
- Use TypeScript for app code once implementation starts.
- Keep module boundaries clear; shared behavior belongs in `src/modules` or
  `src/lib`, not copied between pages.

## 6. Supabase Rules

When creating or changing database schema:

- Use migrations under `supabase/migrations`.
- Enable RLS on exposed tables.
- Write policies that match the actual permission model.
- Do not authorize from user-editable metadata.
- Use server-side code for privileged actions.
- Keep database functions with elevated privileges out of exposed schemas.
- Record schema assumptions in `docs/migration/database-strategy.md`.

## 7. Verification

Before marking work done, run the most relevant available checks. At minimum:

- Documentation-only change: inspect `git diff --check`.
- App code change: run lint/typecheck/tests when available.
- Supabase schema change: run local migration/advisor checks when available.
- UI change: verify responsive behavior in a browser when feasible.

If a check cannot be run, state it in the handoff and final response.
