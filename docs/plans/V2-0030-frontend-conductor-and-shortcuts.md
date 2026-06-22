# Plan V2-0030: Frontend Conductor And Shortcuts

Status: Complete on 2026-06-22

User request:

```text
สร้าง Conductor แยกสำหรับการทำหน้า Frontend ด้วย เป้าหมายถึงคือทำ UI/UX
ไปพร้อมกับการย้ายระบบ สร้างคำสั่ง Shortcut สำหรับงานหน้า Frontend ให้ด้วย
สามารถทำได้ไหม แล้วคิดว่าแบบนี้โอเคไหม หรือไม่ควรทำแยกกัน
```

## 1. Goal

- Add a frontend coordination layer so UI/UX work can move alongside module
  migration.
- Define frontend shortcuts that are safe, easy to resume, and consistent with
  the main V2 conductor.
- Record the decision that this should be a sub-conductor, not a separate
  project source of truth.

## 2. Scope

- Add `FRONTEND_CONDUCTOR.md`.
- Add a supporting UI/UX operating model under `docs/frontend/`.
- Add an ADR for the frontend sub-conductor decision.
- Update the main conductor, README, agent instructions, operating model, plan
  index, and handoff docs so the new frontend workflow is discoverable.

## 3. Out Of Scope

- Runtime frontend implementation.
- New design system code or token changes.
- Supabase schema, staging data, LINE notification behavior, deployment, or
  V1 production changes.

## 4. Files Changed

- `FRONTEND_CONDUCTOR.md`
- `AGENTS.md`
- `CONDUCTOR.md`
- `README.md`
- `docs/frontend/ui-ux-operating-model.md`
- `docs/decisions/0019-frontend-sub-conductor.md`
- `docs/project-management/operating-model.md`
- `docs/plans/V2-0030-frontend-conductor-and-shortcuts.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 5. Verification

- Documentation-only change.
- `git diff --check` passed on 2026-06-22; Git printed CRLF normalization
  warnings for existing text files but no whitespace errors.

## 6. Rollback / No Production Impact

- No runtime code, database schema, staging data, V1 production files, GAS
  deployments, Sheets, URLs, LINE tokens, or secrets changed.
- Rollback is removing the new docs and references if the team chooses to fold
  frontend commands back into `CONDUCTOR.md` only.

## 7. Handoff Notes

- Recommended operating model: keep frontend work as a parallel lane inside the
  same migration board.
- Do not maintain a separate frontend backlog that conflicts with module
  migration order.
- Use `Frontend Mockup:` before runtime implementation for business-critical
  or user-facing screens where V1 behavior needs confirmation.
