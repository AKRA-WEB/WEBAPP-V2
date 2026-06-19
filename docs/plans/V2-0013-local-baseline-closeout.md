# Plan V2-0013: Local Baseline Closeout

Status: Complete

Architect command:

```text
Architect: plan the safe closeout for current local V2 work before continuing.
```

## 1. Goal

- Primary objective: turn the current verified local V2 navigation/conductor
  work into a clean, reviewable commit and push.
- Success definition: all intended V2-only changes are verified, staged,
  committed, pushed to `origin/main`, and Vercel redeploy behavior is checked
  without committing local screenshots, secrets, or unrelated files.
- User/business reason: make repo history match the handoff docs so future
  agents and Vercel builds use the same source of truth.

## 2. Requirement And Scope Definition

### Problem

- The handoff docs describe navigation shell and conductor planning work as
  complete, but the current workspace still has uncommitted changes.
- Vercel deploys from GitHub, so unpushed work is invisible to deployments.
- Another agent could misread the docs as remote state if the local baseline is
  not closed out.

### Users

- Primary users: developer/agent continuing V2 work.
- Secondary users: internal testers opening V2 routes.
- Admin/support users: project owner verifying Vercel deployment status.

### MVP Features

- Review the working tree and classify intended V2 changes versus local-only
  artifacts.
- Run relevant checks for the current mix of docs and app shell changes.
- Stage only intended V2 repo files.
- Commit with a message that reflects navigation/conductor closeout.
- Push to `origin/main` only after user execution approval.
- Verify Vercel redeploy or document why it cannot be verified.

### Nice-To-Have Features

- Add a short release note-style summary for the pushed changes.
- Re-run live browser checks after Vercel finishes deploying.
- Remove or ignore local screenshots/artifacts if the user confirms they are
  disposable.

### Out Of Scope

- Runtime feature work beyond the already-present local changes.
- V1 app, GAS, Sheet, URL, GitHub Pages, or LINE changes.
- Secret or environment variable changes.
- Force-pushing, rebasing, or rewriting history.

## 3. System Architecture And Data Design

### Technical Stack

- Frontend: existing Next.js app shell.
- Backend/server boundary: unchanged.
- Database: unchanged.
- Auth/permissions: unchanged.
- Deployment: GitHub push triggers Vercel redeploy.

### Data Model / Schema

- Tables or entities involved: none.
- Important fields: none.
- Relationships: none.
- Constraints: no schema changes.
- RLS/security notes: no Supabase policy or grant changes.

### Integration Points

- V1 references: none beyond safety boundary.
- Supabase: no new data or env changes.
- Vercel: deployment status check after push if accessible.
- LINE/GAS/Sheets/API: none.
- Secrets/env vars: do not stage `.env.local` or any secret-bearing file.

## 4. UI/UX And User Flow

### User Flow

1. Developer reviews `git status --short`.
2. Developer inspects changed runtime and doc files.
3. Developer runs verification.
4. Developer stages intended changes.
5. Developer commits and pushes after approval.
6. Developer checks Vercel deployment or asks the user to verify if CLI access
   remains unavailable.

### Screens / States

- Screen: dashboard, sidebar, placeholder module routes.
- Empty state: unchanged module placeholders.
- Loading state: unchanged.
- Error state: document any failed build or deployment.
- Permission-denied state: unchanged.
- Mobile behavior: smoke check sidebar/dashboard/module route if feasible.

### System Logic / Pseudocode

```text
read working tree
classify files
run lint/typecheck/build/diff-check
if checks pass:
  stage intended V2 files
  commit
  push
  verify deployment
else:
  document failure and do not push
```

## 5. Task Breakdown

1. Read `git status --short` and `git diff --stat`.
2. Inspect runtime diffs for `src/app`, `src/components`, and `src/modules`.
3. Inspect docs diffs for conductor/plans/handoff consistency.
4. Run `npm run lint`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Run `git diff --check`.
8. Stage intended files, excluding `screenshot/` unless explicitly requested.
9. Commit the closeout.
10. Push to `origin/main`.
11. Verify Vercel deployment status or record the access limitation.

## 6. Files Expected To Change

- No new runtime edits are required by this plan.
- Git metadata will change through commit history only after execution.
- Handoff docs may receive a closeout entry during execution.

## 7. Verification Steps

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `git status --short` after commit/push
- Vercel deployment check when access is available

## 8. Rollback / No-Production-Impact Note

This plan only closes out V2 repo work. V1 production systems remain untouched.
If a commit is wrong and already pushed, prefer a forward fix or revert commit;
do not use destructive history operations unless the user explicitly approves.

## 9. Open Questions

- Should `screenshot/` be deleted locally, added to `.gitignore`, or left
  untracked?
- Should this closeout push directly to `main` again, matching the solo-dev
  workflow, or should future work switch to PRs?

## 10. Handoff Notes

- Next action: run this closeout before starting new implementation.
- Blockers: user approval is required before pushing if the user wants a PR
  workflow instead.
- Related plans: `V2-0009`, `V2-0011`, `V2-0012`.
- Related ADRs: `0006`, `0007`.
