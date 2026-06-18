# Current State

Last updated: 2026-06-18

## Project

- Repository: `https://github.com/AKRA-WEB/WEBAPP-V2`
- Local path: `C:\dev\AKRA-WEBAPP-V2`
- Status: Planning baseline
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
and handoff documents only. No application runtime has been scaffolded yet.

## Active Plan

Plan ID: `V2-0001`

Goal: Establish a safe planning and handoff structure for the V2 rewrite before
any framework scaffold or production migration begins.

Status:

- Repo cloned locally.
- Planning/handoff docs created.
- Source placeholder folders created.
- No V1 production files changed.

## Next Actions

1. Confirm whether the first implementation step should be framework scaffold
   or deeper data-model inventory.
2. If scaffolding is approved, create a Next.js TypeScript app in this repo.
3. Create Supabase staging project manually or through approved tooling.
4. Start detailed sheet-to-table mapping before any production data import.
5. Pick the first pilot module. Recommended: `Picking`.

## Open Questions

- Should V2 use Supabase Auth from day one, or temporarily bridge existing Main
  SSO during migration?
- Should Vercel production be private/protected until first cutover?
- Which module should be the pilot if the user prefers something other than
  `Picking`?
- Will V1 Sheets remain read-only archives after each module cutover, or should
  there be a temporary sync window?

## Safety Notes

Do not modify V1 repos, GAS deployments, production Sheets, or production URLs
while working in V2 unless the user explicitly approves a cutover task.
