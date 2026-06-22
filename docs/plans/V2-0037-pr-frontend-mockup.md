# Plan V2-0037: PR Frontend UI/UX Mock-up

Status: Complete on 2026-06-22

Architect command:
```text
ok PR next
```

## 1. Goal

- Create an interactive HTML mockup for the **Purchase Requisitions (PR)** module under `docs/mockups/pr-ui-ux-mockup.html`.
- Focus on mobile responsiveness (390px viewport width) and desktop layouts, ensuring strict UX parity with V1 PR features.
- Model role-based user flows (Requester, Supervisor, Purchasing Officer, Admin) to preview create, approval, and matching states.

## 2. Requirement And Scope Definition

### Problem
- V1 PR lets users submit multi-line item requests. However, managing autocomplete, removing items on mobile, and tracking supervisor approvals/rejections with comments lacks visual clarity in V1.
- In V2, we need a unified responsive design that retains the familiarity of the V1 layout (Requester input, Warehouse selector, dynamically added items, and bottom collapsible History container) while offering glove-friendly actions, code-matched badges, and clear timeline tracking.

### Users
- **Requester (พนักงานขอซื้อ)**: Creates PR requests, selects a target warehouse (W1-W5, C1, C2), searches and selects products from the autocomplete list, and views their submission history.
- **Supervisor (ผู้จัดการ/ผู้อนุมัติ)**: Reviews pending requests, approves/rejects items, and provides comments upon rejection.
- **Purchasing Officer / Admin (เจ้าหน้าที่จัดซื้อ / แอดมิน)**: Views approved PRs, marks them as ordered ("ซื้อให้แล้ว"), and manages system states.

### V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Form Layout**: Requester name auto-completed (read-only); target warehouse dropdown with choices W1-W5, C1, C2.
- **Add Item Row**: Multi-line item entry using a "+ เพิ่มสินค้าอีก 1 รายการ" button.
- **Collapsible History**: Historical list of PRs grouped by PR number with collapsible items showing per-line statuses:
  - Pending (รอพิจารณา)
  - Approved (อนุมัติแล้ว)
  - Rejected (ไม่อนุมัติ)
  - Ordered (ซื้อให้แล้ว)
- **Rejection Comments**: Rejection details must show up on rejected items.

### V2 UI Improvements (UI ที่ควรปรับ)
- **Role Switcher Matrix**: Toggle between REQUESTER, SUPERVISOR, PURCHASING OFFICER, and ADMIN to preview access controls.
- **Layout Simulator**: Toggle between Desktop and Mobile (390px frame) views.
- **Catalog Autocomplete Indicators**: Inline indicator badge for each item input:
  - `Matched` (มีรหัสสินค้า): Gray/Green badge for items matching catalog product code/unit.
  - `Free-Text` (ป้อนเอง): Amber badge warning that the item is a custom free-text input needing review.
- **Interactive Multi-row Grid**: Dynamic Javascript handlers to add, remove, and update quantities/units.
- **Interactive Approvals**: Gated buttons for Supervisors to approve/reject individual items and enter rejection comments.
- **Timeline Progress Bar**: Visual tracker (`Created -> Under Review -> Approved/Rejected -> Ordered`).

## 3. Technical Stack (Mockup-only)
- Single-file HTML5/CSS3.
- Typography: Inter + Noto Sans Thai / Prompt.
- Embedded CSS (Glassmorphism layout, status-colored pills, mobile device simulation).
- Embedded JS logic (role state switches, dynamic array-driven rendering, input locking, inline item adding/removal).

## 4. Verification Steps
- Open `docs/mockups/pr-ui-ux-mockup.html` in browser.
- Switch simulated device view to **Mobile (390px)** and check viewport boundaries.
- Test adding new item rows, choosing products (which auto-completes unit and marks as `Matched`), and entering quantities.
- Try entering a non-catalog custom name to verify it triggers the `Free-Text` warning badge.
- Switch roles to **Supervisor** and click "ปฏิเสธ" (Reject) on a pending item to see the rejection modal and verify comment submission.
- Verify status changes in the mock history list on role toggle.
- Verify zero Next.js runtime code changes.

## 5. Handoff Notes
- Static HTML demonstration. No backend writes to staging or production.
- Next module in sequence: KPI (KPITracker).
