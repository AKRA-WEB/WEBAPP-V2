# Current State

Last updated: 2026-06-18

## Project

- Repository: `https://github.com/AKRA-WEB/WEBAPP-V2`
- Local path: `C:\dev\AKRA-WEBAPP-V2`
- Status: Phase 1 app shell scaffolded
- Production impact: None
- V1 reference path: `C:\dev\WEBAPP`

## Objective

Create a new unified AKRA WEBAPP V2 that combines the current separate HTML,
Google Apps Script, Google Sheets, and GitHub Pages apps into one modular web
application.

Target stack:

- Next.js + TypeScript
- Vercel deployment
- Supabase Auth and Postgres
- Incremental module migration from V1

## Current Baseline

This repository was cloned as an empty GitHub repo and initialized with planning
and handoff documents. A minimal Next.js app shell has now been scaffolded.

## Active Plan

Plan ID: `V2-0002`

Goal: Establish the V2 app shell with Supabase-ready environment boundaries
before any production migration begins.

Status:

- Repo cloned locally.
- Planning/handoff docs created.
- Next.js 16 app shell added.
- Supabase SSR/browser/proxy helpers added.
- Login shell added using Supabase Auth client-side sign-in.
- Permission helper stub added.
- `.env.example` added with placeholders only.
- Real Supabase keys and Vercel project details were not committed.
- No V1 production files changed.

## Next Actions

1. Add real environment variables locally and in Vercel project settings.
2. Decide whether Supabase Auth will replace Main SSO immediately or bridge it
   temporarily during migration.
3. Build Phase 2 core schema for profiles, roles, permissions, app registry,
   and audit logs.
4. Start detailed V1 sheet-to-table mapping before any production data import.
5. Pick the first pilot module. Recommended: `Picking`.

## Open Questions

- Should V2 use Supabase Auth from day one, or temporarily bridge existing Main
  SSO during migration?
- Should Vercel production be private/protected until first cutover?
- Which module should be the pilot if the user prefers something other than
  `Picking`?
- Will V1 Sheets remain read-only archives after each module cutover, or should
  there be a temporary sync window?
- Should the user rotate the service role key shared in chat before production
  use? Recommended if this conversation may be exposed beyond trusted agents.

## Safety Notes

Do not modify V1 repos, GAS deployments, production Sheets, or production URLs
while working in V2 unless the user explicitly approves a cutover task.

Do not commit real Supabase keys. The service role key must only be stored in
local ignored env files, Vercel environment variables, or a secure secret
manager.
