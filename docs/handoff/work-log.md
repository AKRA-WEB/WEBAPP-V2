# Work Log

## 2026-06-18 - V2 Planning Baseline

- Cloned `https://github.com/AKRA-WEB/WEBAPP-V2` into
  `C:\dev\AKRA-WEBAPP-V2`.
- Repository was empty at clone time.
- Added baseline documentation and handoff structure.
- Added placeholder source folders for the future Next.js/Supabase app.
- No production V1 apps, GAS deployments, or Sheets were changed.

Verification:

- `git diff --cached --check` passed.
- Baseline committed and pushed as `388f697`.
- Working tree was clean after push.

## 2026-06-18 - Phase 1 App Shell Scaffold

- Added a minimal Next.js 16 / React 19 / TypeScript app shell.
- Added dashboard route `/` with migration/module status panels.
- Added `/login` route with a Supabase Auth sign-in form.
- Added Supabase SSR helpers:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/proxy.ts`
  - `proxy.ts`
- Added public Supabase env guard so the app shell can boot without `.env.local`.
- Added permission helper stub in `src/modules/auth/permissions.ts`.
- Added `.env.example` with placeholders only.
- Did not commit real Supabase keys, service role key, Vercel project metadata,
  or any V1 production details.
- Adjusted ESLint to major 9 because ESLint 10 was incompatible with the
  installed `eslint-config-next` package.

Verification:

- `npm audit --audit-level=moderate` passed with 0 vulnerabilities.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- No V1 production apps, GAS deployments, or Sheets were changed.
