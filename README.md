# AKRA WEBAPP V2

Unified rewrite workspace for the AKRA WEBAPP ecosystem.

This repository is intentionally separate from the production V1 apps in
`C:\dev\WEBAPP`. V1 remains the live system while V2 is designed, built, and
validated module by module.

## Current Status

- Status: Planning baseline
- Production impact: None
- Target stack: Next.js on Vercel, Supabase/Postgres, TypeScript
- Migration style: Incremental module migration, no big-bang cutover

## Read First

Every agent or developer must read these files before changing anything:

1. `AGENTS.md`
2. `docs/handoff/current-state.md`
3. `docs/architecture/target-architecture.md`
4. `docs/migration/migration-plan.md`

For context about the existing production apps, read:

- `C:\dev\WEBAPP\development_context.md`

## Safety Rule

Do not change V1 production repos, Google Apps Script deployments, Google
Sheets schemas, GitHub Pages deployments, or live GAS URLs from this V2 repo.
V2 work must stay isolated until a specific module cutover is approved.
