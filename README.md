# AKRA WEBAPP V2

Unified rewrite workspace for the AKRA WEBAPP ecosystem.

This repository is intentionally separate from the production V1 apps in
`C:\dev\WEBAPP`. V1 remains the live system while V2 is designed, built, and
validated module by module.

## Current Status

- Status: Phase 3 Picking pilot in staging; Main portal redesign, Picking
  read-only list/detail, create requisition, and status transitions are
  implemented and verified
- Production impact: None
- Target stack: Next.js on Vercel, Supabase/Postgres, TypeScript
- Migration style: Incremental module migration, no big-bang cutover
- Current database baseline: Supabase draft migrations `0001`-`0010` applied to
  staging; shared catalog/warehouse snapshot data and Picking reference data
  imported to staging only
- Next action: Picking problem reporting, then LINE notification/failure
  recovery, then Picking cutover package

## Read First

Every agent or developer must read these files before changing anything:

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

Older work-log entries live under `docs/handoff/archive/`. Open them only when
you need historical verification detail for a specific plan, ADR, bug, or
handoff question.

Context budget rule:

- Treat `docs/plans/index.md` and `docs/handoff/current-state.md` as compact
  source-of-truth summaries.
- Keep `docs/handoff/work-log.md` to recent entries only. Archive older details
  under `docs/handoff/archive/` instead of forcing every agent to reread them.

## Planning Commands

Use `Let's work` to resume with the compact context set before choosing work:

```text
Let's work
```

The agent should read the compact source-of-truth docs, skip archives unless
needed, check `git status --short`, then summarize the current state and
recommended next action. `Let's work` does not by itself authorize runtime code
changes.

Use `Architect:` to request a detailed plan before implementation. The agent
must draft or update a plan file, update `docs/plans/index.md`, and wait for an
execution command such as `Go:` before changing runtime code.

For UI/UX work, use `FRONTEND_CONDUCTOR.md` and shortcuts such as
`Frontend:`, `Frontend Architect:`, `Frontend Mockup:`, `Frontend Go:`,
`Frontend Review:`, `Responsive Check:`, and `Design System:`. Frontend work is
a lane inside the same migration plan board, not a separate backlog.

When Gemini is used for frontend design, UI/UX critique, or mock-up support,
use `Gemini.md` as the Gemini-specific companion to `FRONTEND_CONDUCTOR.md`.

The default plan format lives at
`docs/plans/templates/architect-plan-template.md`.

## Safety Rule

Do not change V1 production repos, Google Apps Script deployments, Google
Sheets schemas, GitHub Pages deployments, or live GAS URLs from this V2 repo.
V2 work must stay isolated until a specific module cutover is approved.

## Local Setup

Create `.env.local` from `.env.example` for local development. Keep real keys
out of git.

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SECRET_KEY=server-only-secret-key
DATABASE_URL=postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres
```

Run:

```sh
npm install
npm run dev
```
