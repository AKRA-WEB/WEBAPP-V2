# Plan V2-0035: GR Frontend UI/UX Mock-up (Mobile-Focused)

Status: Complete on 2026-06-22 (Updated on 2026-06-22 with V1 parity feedback)

Architect command:
```text
โอเค ตอนนี้ไปเอา GR ก่อน แต่ GR เน้นในโหมดของ Moblie ให้ใช้งานได้ง่ายและใช้งานได้จริงด้วย เพราะพนักงานส่วนจะใหญ่จะใช้บนโทรศัพท์ในแอพนี้
```

Feedback command:
```text
ใน Mock up ที่ทำมาให้ดูต่างจาก V1 เยอะอยู่นะ อยากได้้ UX เหมือนกัน V1 ปรับปรุงดูอีกที  ทั้งในเรื่องของ Calender ดู Vendor
```

## 1. Goal

- Create a mobile-first interactive HTML mockup for the **Goods Receiving (GR)** module under `docs/mockups/gr-ui-ux-mockup.html`.
- Focus heavily on ease of use, speed, and ergonomics for mobile devices (390px viewport width) since warehouse operators primarily use their smartphones for checking off stock.
- Improve mockup to ensure 100% UX parity with V1:
  - Dynamic 14-day calendar grid with day badges and vendor pills.
  - Warehouse quick-filter chips with counts.
  - V1-faithful status-colored card layouts and borders.
  - Gated action buttons (Draft, Review, Confirm, Recall, Reset) that adapt to PO status and user role.
  - Automated field disabling on Completed and Review-pending bills.

## 2. Requirement And Scope Definition

### Problem
- V1 GR was designed as a desktop-first table that was squished into mobile viewports, making it hard for warehouse operators to select locations, key in quantities, or split stock with gloves.
- The interface needs to feel like a native mobile app (large touch targets, bottom drawers, and sticky action headers) while preserving the exact layout of the 14-day calendar, vendor pills, and role-based action flows.

### Users
- **Receiving Staff / Warehouse Operators**: Use mobile phones to inspect PO items, count received quantities, split items into storage bins, and save GR reports.
- **Warehouse Supervisor / Admin**: Recall or reset GR records on mobile when a count correction is needed.

### MVP Features (Mocked in Mobile HTML)
- **Dynamic 14-day calendar grid**: Horizontal scrolling date bar (desktop/tablet uses 7 columns per row) showing weekdays, dates, day badges, and individual vendor pills matching the confirmed (red) / estimated (blue) styles. Tapping filters the PO cards dynamically.
- **Dynamic Warehouse Filter Chips**: Count chips (All, W1, W2, W3, W4, W5, C1, C2) showing pending PO count per warehouse, supporting tap-filtering.
- **Dynamic PO List Cards**: Grouped by status (Pending GR, Draft GR, Pending Review, GR Completed) with status-colored card borders and item details.
- **Dynamic Action Buttons**:
  - **Draft GR (พักบิล)**: Saves bill as draft.
  - **Pending Review (รับสินค้าเสร็จแล้ว)**: Marks bill as review-pending.
  - **GR Completed (ยืนยันรับสินค้า)**: Confirms receipt (Admin-only).
  - **Recall GR (ดึงบิลกลับมาแก้ไข)**: Restores completed/review bills to draft (Admin-only).
  - **Reset GR (รีเซ็ตเป็นรอสินค้าเข้า)**: Clears received quantity/locations (Admin-only).
- **Interactive Check-off Interface**:
  - Large Qty Input with +/- step buttons (touch target >= 48px).
  - Exp Date picker.
  - **Structured Location Bottom Sheet**: Drawer sliding from the bottom of the viewport to select Warehouse + Floor + custom Zone.
  - **Split Storage Drawer (`toggleItemSplit`)**: Interactive location distribution screen (distributing total actual qty among N locations).
  - **Lift Fee Input Panel**: Simple mobile modal for lift fee payment types and round counts.
- **LINE Flex Message Previewer**: High-fidelity recreation of the LINE notification layout.
- **Role Gating & View Gating**: Gating inputs and action buttons dynamically based on ADMIN vs OPERATOR role switcher.

## 3. Technical Stack (Mockup-only)
- Single-file responsive HTML5.
- Embedded CSS (Mobile-first layout, CSS variables, flex layout, bottom sheet drawer animations, glassmorphism overlays).
- Embedded SVG icons.
- Vanilla JavaScript to handle view switching, +/- adjustments, bottom sheet slide-ins, dynamic rendering, and data state retention.

## 4. Verification Steps
- Open `docs/mockups/gr-ui-ux-mockup.html` in browser.
- Switch simulated device view to **Mobile (390px)**.
- Test calendar day buttons to filter by date and observe vendor pills.
- Test warehouse chips to filter by warehouse count.
- Test role switcher (ADMIN vs OPERATOR) to verify action button gating and field lockouts on different PO statuses (Completed / Review).
- Verify clicking "ระบุตำแหน่ง" or "แยกคลัง" slides up the bottom sheet.
- Verify zero Next.js runtime code changes.

## 5. Handoff Notes
- Static HTML representation. No actual network writes.
- Next module in sequence: KPI (KPITracker).
