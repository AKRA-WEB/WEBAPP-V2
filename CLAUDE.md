# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read this first

`AGENTS.md` holds the binding operating rules for this repo; `CONDUCTOR.md` is the planning/command entry point. The points below are the ones easiest to violate:

- **V2 is an isolated rewrite.** Never modify V1 production from here: `C:\dev\WEBAPP` repos, Google Apps Script deployments, Google Sheets schemas, V1 GitHub Pages, live GAS URLs, or LINE tokens. V1 is reference only unless the user explicitly approves a cutover.
- **Handoff discipline is mandatory.** Every non-trivial change must, before the final response, update `docs/handoff/current-state.md`, append a dated entry to `docs/handoff/work-log.md`, add a `docs/decisions/` record if a decision was made, update `docs/migration/module-inventory.md` if a module changed phase, and update plan status in `docs/plans/index.md`. Handoff records are written in English so a future agent can resume after context is cleared; user-facing summaries may be Thai.
- **Required reading before planning/editing:** `README.md`, `CONDUCTOR.md`, `docs/plans/index.md`, `docs/handoff/current-state.md`, `docs/handoff/work-log.md` (active entries only — older entries are archived under `docs/handoff/archive/`), `docs/architecture/target-architecture.md`, `docs/migration/migration-plan.md`, `docs/migration/module-inventory.md`, and `C:\dev\WEBAPP\development_context.md` for V1 behavior.

## Command protocol

The user drives work with explicit prefixes (defined in `CONDUCTOR.md`); honor them rather than defaulting to "just implement it":

- **`Architect: ...`** — plan only. Create/update a plan file under `docs/plans/` (use `docs/plans/templates/architect-plan-template.md`), update `docs/plans/index.md` and the handoff docs. Do not touch runtime code, schema, migrations, deployment config, or secrets.
- **`Go: ...`** — execute an approved/selected plan: read the plan, check `git status`, implement the smallest safe slice, verify it.
- **`Review: ...`** — review code/docs/a plan; lead with findings, risks, and file/line references.

`docs/plans/index.md` is the source of truth for plan status, not chat history. Plan statuses: `Draft`, `In progress`, `Blocked`, `Review`, `Complete`, `Superseded`.

## Commands

```sh
npm run dev        # Next.js dev server (Turbopack)
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint (next/core-web-vitals + next/typescript)
npm run typecheck  # tsc --noEmit, full (non-incremental) typecheck
```

No test runner is configured yet. For app-code changes, run `lint` and `typecheck`; for docs-only changes, `git diff --check`. State in the handoff if a relevant check could not be run.

Local setup: copy `.env.example` to `.env.local` and fill real keys (never commit them).

**Database/import tooling** (`scripts/*.mjs`, run against the staging Supabase project via `DATABASE_URL`/Supabase HTTPS API): npm aliases include `check:migrations`, `db:apply-migrations`, `db:verify-staging-schema`, `db:verify-catalog-import`, `picking:seed-staging-fixtures`, `picking:reference-import-dry-run`, `picking:reference-import-apply`. Several other one-off scripts (`core-import-apply.mjs`, `product-catalog-import-apply.mjs`, `create-test-account.mjs`, `apply-test-roles.mjs`, `check-locks.mjs`) are run directly with `node` and aren't aliased. Any script that writes to the database is gated on an explicit `--confirm-*` flag plus a check that the target project ref matches staging — that's the guardrail against accidentally hitting production; preserve this pattern in new import/apply scripts.

## Architecture

Next.js 16 App Router + React 19 + TypeScript (strict), Supabase Postgres/Auth, deployed to Vercel. Path alias `@/*` → `src/*`. `typedRoutes` is on, so `Link href` values are type-checked against real routes.

**`proxy.ts` is Next.js 16's renamed middleware** (formerly `middleware.ts`). It runs `updateSession` on every matched request to refresh Supabase auth cookies. Don't rename it back to `middleware.ts`.

**Four Supabase clients in `src/lib/supabase/` — pick by execution context:**
- `client.ts` (`createBrowserClient`) — Client Components / browser.
- `server.ts` (`createServerClient` + `next/headers` cookies) — Server Components, Route Handlers, Server Actions. Cookie writes are swallowed in Server Components; the proxy refreshes them instead.
- `proxy.ts` (`updateSession`) — used only by the root `proxy.ts` middleware.
- `admin.ts` (`createAdminClient`) — service-role client, bypasses RLS entirely. `server-only` import makes an accidental client-bundle import a build error. Only call after an explicit `requirePermission()`/guard check; never reachable from `private` schema functions via the Data API (see below).
- `env.ts` is the single source for reading/validating public Supabase env vars; use its helpers, don't read `process.env` directly.

**Secret boundary:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may reach the browser. `SUPABASE_SECRET_KEY` (service role) is server-only — never expose it with `NEXT_PUBLIC_` or send it client-side. Privileged Supabase access, LINE notifications, imports/exports, and transactional/audited mutations all belong in server-side code.

**Module structure** (`src/modules/<name>/`): each module owns its workflows and screens. Shared entities (users, roles, products, vendors, warehouses, audit logs) live in `core`/shared modules, not copied between pages. Authorization goes through `src/modules/auth/permissions.ts`: typed `AppPermission` strings checked via `can(snapshot, permission)`, where `ADMIN` role is allowed everything; `src/modules/auth/guard.ts` (`requirePermission()`, supporting single/`anyOf`/`allOf`) is the server-side enforcement point and fails closed on an empty check. Cross-module writes should route through server-side services (atomic RPCs for multi-row writes, e.g. `public.create_picking_requisition`) to keep permissions, audit logs, and transactions consistent. Target modules: core, auth, picking, purchasing, receiving, warehouse, returns, kpi — see `docs/migration/module-inventory.md` for current per-module phase.

**Supabase schema changes:** use migrations under `supabase/migrations`, enable RLS on exposed tables, write policies matching the real permission model, never authorize from user-editable metadata, keep elevated-privilege functions in `public` as `SECURITY INVOKER` with `EXECUTE` revoked from `anon`/`authenticated` (functions in `private` are not reachable via the Supabase Data API at all — `PGRST106`), and record schema assumptions in `docs/migration/database-strategy.md`.
