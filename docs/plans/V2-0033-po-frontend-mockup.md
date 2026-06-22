# Plan V2-0033: PO Frontend UI/UX Mock-up

Status: In progress

Architect command:
```text
ออกแบบและทำเป็น Html ออกมาให้ดูก่อนทุกโมดูลเลย อยากเห็นของทุกแอพ ทำทีละแอพ
```

## 1. Goal

- Create an interactive, highly aesthetic static HTML mock-up for the **Purchasing Orders (PO)** module under `docs/mockups/po-ui-ux-mockup.html`.
- Demonstrate the V2 visual direction, layout grids, responsiveness (desktop vs. 390px mobile layout), and role-based permissions (ADMIN, SUPERVISOR, PURCHASING_OFFICER, GUEST) using live JavaScript toggles.
- Collect visual feedback from the user before writing Next.js App Router runtime code.

## 2. Requirement And Scope Definition

### Problem
- The PO module is currently built in V1 with custom CSS styles that are not optimized for modern screens.
- Operators need to visualize how V2 PO lists, detail screens, creation forms, and vendor insights look and scale before backend database bindings are written.

### Users
- **Purchasing Officers**: Create POs, edit line items, manage vendors.
- **Supervisors / Admins**: Approve POs, close POs, mark APV status, and monitor vendor performance insights.
- **Guest / Read-only**: View PO details and history without mutation privileges.

### MVP Features (Mocked in HTML)
- **Active PO List**: Shows statuses (Draft, Pending Approval, Approved, Closed, APV) with clean status badges and date filters.
- **PO Detail Screen**: Shows PO metadata, matching PR identifiers, item table, and audit trail timeline.
- **Create PO Form**: Dynamic line-item addition with unit pricing, quantity, and warehouse selections.
- **Vendor Insights Dashboard**: Visual average, median, and P75 lead time trends.
- **Interactive Role Switcher**: A floating panel that changes button states and elements dynamically to showcase role-aware access controls.
- **Interactive Device View Toggle**: Sidebar button to simulate a 390px mobile layout frame within the desktop preview.

## 3. Technical Stack (Mockup-only)
- Single-file HTML5 with semantic structures.
- Modern CSS (Flexbox, Grid, CSS custom properties, HSL color definitions, transition effects).
- Noto Sans Thai and Inter typography.
- SVG embedded icons (no external resource dependencies).
- Pure client-side JavaScript for view transitions and role/device toggling.

## 4. Verification Steps
- Open `docs/mockups/po-ui-ux-mockup.html` in browser.
- Verify role toggle actions (Admin has full access, Guest has buttons hidden).
- Verify page views (Dashboard, Details, Create Form, Insights tabs).
- Run `git diff --check`.
- Confirm zero impact on Next.js runtime code.

## 5. Handoff Notes
- Static prototype only. No Supabase or LINE network requests.
- Next step: Collect feedback on the PO mockup, then proceed to the next module in the sequence (PR).
