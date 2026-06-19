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

1. `README.md`
2. `CONDUCTOR.md`
3. `docs/plans/index.md`
4. `docs/handoff/current-state.md`
5. `docs/handoff/work-log.md`
6. `docs/architecture/target-architecture.md`
7. `docs/migration/migration-plan.md`
8. `docs/migration/module-inventory.md`
9. `C:\dev\WEBAPP\development_context.md` for V1 behavior and module status

If the task involves Supabase, also verify current Supabase docs/changelog
before implementing schema, auth, RLS, or migration changes.

## 3. Handoff Discipline

Every non-trivial change must update handoff files before final response:

- Update `docs/handoff/current-state.md` with current status and next action.
- Append a dated entry to `docs/handoff/work-log.md`.
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
