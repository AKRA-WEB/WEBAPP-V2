# AKRA WEBAPP V2

Unified rewrite workspace for the AKRA WEBAPP ecosystem.

This repository is intentionally separate from the production V1 apps in
`C:\dev\WEBAPP`. V1 remains the live system while V2 is designed, built, and
validated module by module.

## Current Status

- Status: Phase 3 Picking pilot schema applied and verified in staging
- Production impact: None
- Target stack: Next.js on Vercel, Supabase/Postgres, TypeScript
- Migration style: Incremental module migration, no big-bang cutover
- Current database baseline: Supabase draft migrations `0001`-`0006` applied to
  staging; no V1 data imported yet

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
