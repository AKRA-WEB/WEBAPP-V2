# Plan V2-0029: UI/UX Mock-up

Status: Complete on 2026-06-22

User request:

```text
ทำ Mock-up มาให้ดูก่อนได้ไหม
UX อยากให้ใช้ได้เหมือน V1 แต่ UI ถ้าพัฒนาได้ดีกว่าก็เสนอมา
```

## 1. Goal

- Create a static mock-up that shows the proposed V2 UI direction before
  changing runtime app code.
- Preserve the V1 user workflow as the UX baseline while proposing UI
  improvements for responsiveness, clarity, status visibility, and role-aware
  actions.

## 2. Scope

- Add a standalone HTML mock-up under `docs/mockups/`.
- Cover Main portal, Picking board, create requisition, detail/problem flow,
  mobile preview, and UX notes.
- Use V1 as read-only behavioral reference: Main portal/SSO launcher and
  Picking bill type, multi-row entry, LINE preview, history, problem report,
  and `#NNN` bill-number patterns.
- Use current V2 direction from `V2-0017`, `V2-0022`, and recent Picking plans.

## 3. Out Of Scope

- Runtime Next.js implementation.
- Supabase schema changes or staging database writes.
- V1 production files, GAS deployments, Sheets, URLs, LINE tokens, or secrets.
- Completing or changing the LINE notification code slice.

## 4. Files Changed

- `docs/mockups/v2-ui-ux-mockup.html`
- `docs/plans/V2-0029-ui-ux-mockup.md`
- `docs/plans/index.md`
- `docs/handoff/current-state.md`
- `docs/handoff/work-log.md`

## 5. Verification

- Documentation/static HTML only.
- Run `git diff --check`.

## 6. Handoff Notes

- The mock-up is intentionally static and does not call Supabase or LINE.
- UX baseline: keep V1 workflows familiar.
- UI proposal: improve visual hierarchy, status summary, role-aware actions,
  mobile sticky actions, accessible labels, and no-horizontal-overflow layout.
