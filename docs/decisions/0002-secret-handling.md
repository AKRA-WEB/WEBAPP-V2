# ADR 0002: Secret Handling For Supabase And Vercel

Date: 2026-06-18

## Status

Accepted

## Context

V2 needs Supabase and Vercel configuration. The user provided Supabase project
details and a service role key in chat so the app can be prepared for staging.
The repository is public or shareable enough that committing real keys would
create unacceptable risk.

## Decision

Do not commit real Supabase keys, service role keys, Vercel project metadata, or
production secrets.

Only commit `.env.example` with placeholders. Real values must live in:

- ignored local `.env.local`
- Vercel environment variables
- Supabase dashboard or other secure secret managers

The service role key must never be exposed through `NEXT_PUBLIC_` variables or
browser code.

## Consequences

- The app shell can build without real Supabase env values.
- Login will require local or Vercel env configuration before real auth testing.
- Any future server-side privileged action must read from server-only env vars.
- If the shared service role key may have been exposed beyond trusted agents,
  rotate it before production use.
