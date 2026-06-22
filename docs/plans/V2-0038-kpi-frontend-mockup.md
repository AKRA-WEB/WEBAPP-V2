# Plan V2-0038: KPI Frontend UI/UX Mock-up

Status: Complete on 2026-06-22

Architect command:
```text
KPI ต่อ
```

## 1. Goal

- Create an interactive HTML mockup for the **KPI (KPITracker / Analytics)** module under `docs/mockups/kpi-ui-ux-mockup.html`.
- Focus on mobile responsiveness (390px viewport width) and desktop layouts, ensuring strict UX parity with V1 KPI features.
- Model role-based views (Staff, Supervisor, Executive/Admin) and branch-specific layouts (AKRA vs TRD) to verify record submissions, dashboard analytics, and configuration.

## 2. Requirement And Scope Definition

### Problem
- V1 KPITracker is a large single-file application containing nested views, tabs, and complicated logic for branch select gates. In V2, we need a refined, scannable layout that simplifies these flows while retaining V1 operational paradigms:
  - Daily date logs, record forms (errors and work volumes), weekly tasks.
  - Multi-tab navigation (Record, Dashboard, Executive Summary/Admin Dash, Admin Settings).
  - HP-based gamification leaderboard (starting at 100 HP, decrementing based on errors).

### Users
- **Staff (พนักงาน)**: Records daily work numbers and logs errors, views the HP leaderboard and weekly tasks.
- **Supervisor (หัวหน้างาน)**: Reviews weekly tasks, enters team error reports, and manages employee rosters.
- **Executive / Admin (ผู้บริหาร / แอดมิน)**: Analyzes branch-specific monthly error trends, exports CSV logs, and updates configurations.

### V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Branch selection gate**: Selection of AKRA (Warehouse) vs TRD (Storefront) branch at login or switch.
- **Record Form**:
  - Input date.
  - Error logs containing: Employee Name, Error Type, Severity (Low, Medium, High), and Description/Remarks.
  - Daily Work Volume (only for AKRA): บิลย้ายคลัง, ลูกค้ามารับที่ร้าน, ส่งต่างจังหวัด, ส่งในตลาด, ส่งนอกตลาด with +/- controllers.
  - Weekly Tasks (แผนงานสัปดาห์นี้): Add tasks, assign employee in charge, and update statuses (Not started, In progress, Completed).
- **Sticky Save Button**: Persistent save bar at the bottom for record submission.
- **Dashboard Views**:
  - Week-by-week navigation controls.
  - Total Errors and Total Volume indicators.
  - Gamification HP leaderboard starting at 100 HP.
  - Error notes details log and customer delivery notes.
  - Executive Monthly Admin dashboard filterable by Branch (ALL/AKRA/TRD), Month, and Employee, including a Top 5 error list.
- **Admin Panel**: Manage employee profiles (UID, Name, Branch access (AKRA/TRD), and TRD department (หน้าร้าน, แคชเชียร์, คลัง)).

### V2 UI Improvements (UI ที่ควรปรับ)
- **Role and Branch Switcher Matrix**: Floating control panel to switch simulated roles (STAFF vs SUPERVISOR vs ADMIN) and active branches (AKRA vs TRD) in real time.
- **Responsive Layout Simulator**: Toggle between Desktop and Mobile (390px frame) views.
- **Interactive SVG Charts**: Replace static tables on the dashboard with rich SVG trend line charts (showing daily errors) and bar graphs (showing work volumes).
- **Gamification HP Rings**: Replace plain text ranks with visual ring meters showing employee HP levels (Green >= 90 HP, Orange 70-80 HP, Red < 70 HP).
- **AI-Powered Smart Summary**: A sleek alert box rendering dynamic, automated recommendations based on active data trends.
- **Interactive Forms and Live Database**: Real Javascript engine updating state in `localStorage`, letting users log errors, change statuses, manage employees, and export CSV data dynamically.

## 3. Technical Stack (Mockup-only)
- Single-file HTML5/CSS3.
- Typography: Inter + Noto Sans Thai / Prompt.
- Embedded CSS (Glassmorphism layout, visual graphs, status-colored pills, mobile device simulation).
- Embedded JS logic (role/branch toggles, dynamic chart drawing, local storage CRUD, CSV downloader).

## 4. Verification Steps
- Open `docs/mockups/kpi-ui-ux-mockup.html` in browser.
- Switch simulated device view to **Mobile (390px)**.
- Choose **TRD branch** and verify that "ข้อมูลงานประจำวัน" (Daily work volumes) is hidden, matching V1.
- Choose **AKRA branch** and verify work volumes inputs are visible.
- Add an error entry row, choose a worker, and enter details. Save the record and verify it reflects immediately in the Dashboard tab.
- Navigate to **แดชบอร์ด (Dashboard)** and verify the dynamic SVG trend line chart and gamification HP rings render correctly.
- Switch to **ภาพรวม (Admin Dash)** and test the Month and Branch filters.
- Switch to **ตั้งค่า (Admin Settings)**, add a new employee profile, and verify they show up in the autocomplete dropdowns.
- Verify zero Next.js runtime code changes.

## 5. Handoff Notes
- Static HTML representation. No actual network writes.
- Next module in sequence: AKRA (AKRA W5 / Inventory Management).
