# Plan V2-0031: Gemini Frontend Instructions

Status: Complete on 2026-06-22

User request:

```text
สร้างตัว Gemini.md ไว้ให้ด้วย จะใช้สำหรับการออกแบบและทำงานหน้า Frontend / UI / UX
```

## 1. Goal

- Add a Gemini-specific instruction file for frontend design, UI/UX critique,
  mock-up support, responsive review, and implementation advice.
- Make Gemini follow the same frontend sub-conductor and migration plan board
  rules as other agents.

## 2. Scope

- Add `Gemini.md`.
- Link `Gemini.md` from `AGENTS.md`, `CONDUCTOR.md`, `README.md`, and
  `FRONTEND_CONDUCTOR.md`.
- Update plan and handoff docs so future agents know the file exists.

## 3. Out Of Scope

- Runtime frontend implementation.
- Gemini API integration or tool/plugin setup.
- Design-system code changes.
- Supabase schema, staging data, V1 production changes, secrets, or LINE
  credentials.

## 4. Files Changed

- `Gemini.md`
- `AGENTS.md`
- `CONDUCTOR.md`
- `README.md`
- `FRONTEND_CONDUCTOR.md`
- `docs/plans/V2-0031-gemini-frontend-instructions.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 5. Verification

- Documentation-only change.
- `git diff --check` passed on 2026-06-22; Git printed CRLF normalization
  warnings for existing text files but no whitespace errors.

## 6. Handoff Notes

- `Gemini.md` is subordinate to `AGENTS.md`, `CONDUCTOR.md`, and
  `FRONTEND_CONDUCTOR.md`.
- Gemini output is treated as design/review input until a plan is updated and
  the user gives an execution command.
