# Plan V2-0032: Frontend UI/UX Module Roadmap

Status: Draft

Architect command:
```text
Frontend Architect: Gemini วางแผน Frontend/UI/UX ทุกโมดูลตาม V2-0022
  แยกเป็นลำดับ PO,PRR,GR,KPI,AKRA,TRDAKRA,Picking module-by-module ระบุหน้าที่ต้องทำ, UX ที่ต้องคงจาก V1, UI ที่ควรปรับ,
  responsive requirement, และ dependency ก่อน implement ห้ามแก้ runtime code
```

## 1. Goal

Define a comprehensive, module-by-module Frontend/UI/UX architecture plan for all remaining AKRA WEBAPP V2 modules. This guarantees that as developers begin building the user interface for each module, they preserve critical V1 operational workflows (UX Parity) while delivering a modernized, highly responsive, and secure V2 system.

- **Primary objective**: Document the exact pages/routes to implement, V1 user experience logic to retain, UI/styling improvements, mobile responsive boundaries, and database/permission dependencies before any frontend implementation begins.
- **Success definition**: A fully detailed roadmap covering all 7 modules (PO, PR, GR, KPI, AKRA, TRDAKRA, Picking) in the exact requested order, serving as the design and execution authority for future frontend tasks.
- **User/business reason**: Avoid visual fragmentation, minimize operational friction for warehouse operators who know the V1 layout, and establish a clear sequence of UI/UX checkpoints.

---

## 2. Module-by-Module Plan

---

### Phase 2.1: PO (Purchasing Orders)
*V1 App Reference: `C:\dev\WEBAPP\PO`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/purchasing/po`**: Dashboard of active POs, pending matches, and historical PO lists with search/filter capabilities.
- **`/purchasing/po/[id]`**: Detail view of a PO showing header metadata, item grid, expected delivery dates, and matching status with PRs.
- **`/purchasing/po/new`**: Create PO form (supporting both PR-referenced and Direct PO creation).
- **`/purchasing/po/[id]/edit`**: Edit form for unapproved or draft POs.
- **`/purchasing/po/insights`**: Vendor delivery insights page displaying average, median, and P75 lead times per vendor.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Direct PO Isolation**: Multiple same-day Direct POs for the same vendor and warehouse must remain separate bills. V2 uses the `DIRECT-<uuid>` or stable `refPrUid` grouping pattern to prevent accidental merges (V1 Conductor `20260617-002` parity).
- **Lead Time Tracking**: Utilize `Expected_Date` as the vendor's confirmed delivery date and leverage it for incoming order calculation.
- **Closing/APV Approval Gates**: Keep separate approval permissions for closing POs and marking them as APV (Accounts Payable Voucher).

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Sleek Matching Dashboard**: Visually group pending matching bills side-by-side with PR references using clear status cards instead of dense text tables.
- **Leadtime Insight Visualizations**: Render simple visual indicators (e.g., colored dots or compact bar ranges) for vendor reliability: Avg/P75 lead times, marking "low data" or "high variance" vendor trends clearly.
- **Dense Item Editing**: Implement a clean table layout using CSS Grid that keeps item names, ordered quantities, prices, and units aligned, avoiding standard browser default borders.

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Multi-column list with interactive sorting and PO-to-PR preview drawers.
- **Mobile (390px)**: PO items collapse into vertical stack cards. Scrollable matching tables must have a minimum width or wrap cell content using `word-break: break-word`. Action buttons (Approve, Close, Edit) should float or stick to the screen bottom for thumb accessibility.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration creating `public.purchasing_pos` and `public.purchasing_po_lines` tables with `ref_pr_uid` and `expected_date`.
- **Permissions**: `purchasing.read`, `purchasing.write`, `purchasing.approve`, `purchasing.close` assigned to correct roles.
- **API Actions**: Server actions for `createPO`, `updatePO`, `approvePO`, `closePO`.

---

### Phase 2.2: PR (Purchase Requisitions)
*V1 App Reference: `C:\dev\WEBAPP\PR`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/purchasing/pr`**: Request log and request status list (Pending, Approved, Rejected).
- **`/purchasing/pr/[id]`**: Read-only details of a PR, showing supervisor actions and status tags.
- **`/purchasing/pr/new`**: Multi-line item entry screen to submit new purchase requests.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Requisition workflow**: Requesters enter raw requirements (items, quantities, preferred vendors), and supervisors approve or reject them, writing comments on rejection.
- **Catalog Autocomplete**: Autocomplete suggestions must match the shared product catalog codes and units accurately.

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Dynamic Multi-row Requisition Grid**: A clean, editable line-item grid where operators can add, delete, and duplicate rows using keybindings (`ArrowDown`, `Enter`).
- **Product Autocomplete Badge**: Auto-complete drop-down should highlight whether an item code matches an active catalog product (`matched_code` alias) or is a free-text input (highlighting review risks).
- **Clear Status Timeline**: Replace static text state markers with a vertical tracking indicator (`Created -> Under Review -> Approved/Rejected -> Ordered`).

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Compact side-by-side view (product selection panel on the left, current request lines on the right).
- **Mobile (390px)**: Convert the item table to a list of stacked inputs. Every input must have a touch target of at least 44px. Add a sticky "Add Row" button at the bottom right.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration creating `public.purchasing_prs` and `public.purchasing_pr_lines`.
- **Shared Catalog**: Bridge functions to query active product aliases.
- **Permissions**: `purchasing.read` and `purchasing.write` assigned to users.

---

### Phase 2.3: GR (Goods Receiving)
*V1 App Reference: `C:\dev\WEBAPP\GR`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/receiving`**: Receiving dashboard displaying a 14-day receiving calendar, warehouse count tabs (W1-W5, C1, C2), and active receiving logs.
- **`/receiving/[id]`**: Goods verification detail screen. Allows checking PO quantities, inputting actual quantities, exp dates, and receiving storage locations.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Split Receiving Storage**: Support the critical `toggleItemSplit` feature: receiving an item across multiple warehouses/locations in a single transaction (collating total actual qty and writing breakdown tags to remarks).
- **Lift Fee and Remarks**: Preserve custom lift fee fields (pay method, number of rounds) and append them as canonical metadata tags.
- **Reset/Recall GR**: Allow admins/supervisors to recall/reset GR records, returning PO line items to a pending receiving state.

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Structured Location Dropdowns**: Replace V1's open text boxes with a structured dropdown grid: คลัง (Warehouse selection) + ชั้น (Floors: `1F` through `5F`) + โซน (custom Zone input). This enforces normalized location keys like `W2-2F-2-1`.
- **Interactive Delivery Calendar**: A responsive calendar widget on the dashboard that filters pending bills by delivery date. Confirmations show as Red, and estimated histories show as Blue (matching V1 Conductor calendar logic).
- **Partial Receiving Indicators**: Add color-coded status badges for partial receiving progress (e.g., "Confirmed 3/5 items" in Orange).

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Wide grid view showing expected PO items side-by-side with input elements.
- **Mobile (390px)**: Warehouse operators must be able to tap/focus fields easily. Numeric keypads should load automatically (`inputmode="decimal"`). The split-location modal must fit the screen with a scrollable item list.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration for `public.receiving_grs`, `public.receiving_gr_lines`, and `public.receiving_events`.
- **Warehouse Masters**: Access to the warehouse location configurations.
- **Permissions**: `receiving.read`, `receiving.write`, `receiving.approve`, and admin recall bypass rules.

---

### Phase 2.4: KPI (KPITracker / Analytics)
*V1 App Reference: `C:\dev\WEBAPP\KPITracker`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/kpi`**: Dashboard displaying operational analytics, trend charts, and summary metric cards.
- **`/kpi/admin`**: Gated entry screen for supervisors to input daily records and modify targets.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Metric Definitions**: Maintain tracking categories (picking speed, error rates, PO turnaround times).
- **Access Restrictions**: Lock dashboard settings and write permissions behind `adminDashboard` (V1 role-equivalent) permissions.

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Sleek Data Visualizations**: Use dynamic charts (responsive SVG graphs) to display metric performance instead of basic spreadsheet links.
- **KPI Target Highlights**: Color metric cards green/red depending on whether they meet or miss target parameters.
- **Sticky Actions**: Form fields in `/kpi/admin` must utilize a sticky save bar so operators don't have to scroll to the bottom of the page to save.

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Multi-column dashboard grid with chart components.
- **Mobile (390px)**: Linearize charts to stack vertically. Card containers wrap metric numbers properly, ensuring text labels do not overflow.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration for `public.kpi_records` and `public.kpi_configs`.
- **Permissions**: `kpi.read` and `kpi.admin` permissions.

---

### Phase 2.5: AKRA (AKRA W5 / Inventory Management)
*V1 App Reference: `C:\dev\WEBAPP\AKRA`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/warehouse/w5`**: Stock level dashboard showing inventory counts, critical low-stock alerts, and pending pick-lists.
- **`/warehouse/w5/adjust`**: Stock adjustment form for manual stock overrides.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Low Stock Notification**: Display warning badges for items falling below 20 units (V1 threshold).
- **Audit Logging**: Write adjustment reasons and previous/new stock values to the database history.

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Dedicated Adjust Screen**: Instead of inline spreadsheet updates, use a guarded form with `+/-` controls and an inline dropdown of predefined adjustment reasons (e.g., damaged stock, count mismatch).
- **Product Autocomplete Search**: An autocomplete text search that looks up items from both direct catalog indexes and alias mappings.

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Table list layout with pagination and quick search bar.
- **Mobile (390px)**: Bottom-sheet drawers that open when tapping a stock row, displaying quick metadata (location, par levels) and action items.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration linking `public.warehouse_stocks` to W5 location codes.
- **Permissions**: `warehouse.read` and `warehouse.write`.

---

### Phase 2.6: TRDAKRA (TRD/AKRA Warehouse Operations)
*V1 App Reference: `C:\dev\WEBAPP\TRDAKRA`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ)
- **`/warehouse/trd-akra`**: Central hub splitting warehouse actions for TRD (W1) and AKRA (W2-W5, C1-C2).
- **`/warehouse/trd-akra/survey`**: Stock survey/audit page.
- **`/warehouse/trd-akra/dispatch`**: Batch dispatch page for recording outgoing order outcomes (จัดส่งแล้ว, จัดส่งไม่ครบ, สินค้าหมด).
- **`/warehouse/trd-akra/history`**: Searchable request and dispatch history page.
- **`/warehouse/trd-akra/locations`**: Warehouse location manager tool.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Apostrophe/Slash Autocomplete**: Product pickers must correctly parse product names containing quotes or slashes (e.g. `Y/สับปะรดกวน 'ฉลุย'`).
- **Duplicate Request Blocking**: Block requests for items that currently have active orders in the pipeline (status "สั่งเบิก" or "กำลังจัดสินค้า").
- **Batch Dispatch Behaviors**: Outgoing items marked as "สินค้าหมด" must stay visible in the list rather than immediately disappearing (V1 non-terminal status logic).

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Product Deep-Dive Tab**: A lazy-loaded, responsive analytics tab showing request/dispatch timelines, 3/7-day velocity metrics, and par metadata.
- **Visual Location Manager**: A map-like layout or structured cards mapping Floor, Location, and Par Level visually. Supports product-first drawers and bulk location assignments.
- **Unified History Filters**: Combine W1 and W2 history tabs into a single responsive screen with robust search filters (by Name or SKU ID) and quick sorting (Date Requested, Date Dispatched, newest/oldest first).

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Grid layouts with sticky filter panels, side-drawer item detail summaries, and wide tables.
- **Mobile (390px)**: Optimizations for quick survey tapping. Replaces checkboxes with large button buttons. The location manager drawer should slide from the bottom, filling the viewport.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Database**: Migration for `public.warehouse_stocks`, `public.warehouse_movements`, `public.warehouse_surveys`, and `public.warehouse_dispatches`.
- **Permissions**: `warehouse.read`, `warehouse.write`, `warehouse.manage_locations`.

---

### Phase 2.7: Picking (Picking Module)
*V2 Implemented Routes: `/picking`, `/picking/[id]`, `/picking/new`, `/picking/[id]/problem`*

#### 1. Pages and Views to Build (หน้าที่ต้องทำ - UI Polish & Cutover)
- **`/picking`**: List of active and completed picking bills with search, status filters (Pending, Picked, Sent), and new requisition links.
- **`/picking/[id]`**: Detail view showing order metadata, line items, problem status indicators, and transaction timeline.
- **`/picking/new`**: Create requisition page with multi-line product alias search.
- **`/picking/[id]/problem`**: Gated form to report shortage details (actual vs expected) per line.

#### 2. V1 UX Parity to Preserve (UX ที่ต้องคงจาก V1)
- **Problem Reporting**: Reporting a problem on a pending requisition does not auto-advance the status to "Picked" (enforce ADR `0018` rules).
- **LINE Notification Retries**: Keep the LINE notification outcome as an event log rather than changing requisition status (LINE failure is non-blocking).

#### 3. V2 UI Improvements (UI ที่ควรปรับ)
- **Detailed Lifecycle Timeline**: Use a modern list component showing date/time, actor profiles, and actions (`Created -> LINE Notification -> Status Transition -> Problem Reported`).
- **Shortage Indicators**: Display explicit status tags ("ขาดแคลน N ชิ้น") next to items that have reported problems.
- **LINE Notification Banner**: Highlight LINE push failures with an orange warning alert and a visible "Retry LINE notification" button (for writers/admins only).

#### 4. Responsive Requirements (Mobile 390px & Desktop)
- **Desktop**: Wide tables with detail widgets.
- **Mobile (390px)**: Prevent horizontal layout breaks by wrapping emails and product names using `overflow-wrap: anywhere` (V1 Conductor overflow parity fix). Use inline action buttons.

#### 5. Dependencies Before Implementation (Dependencies ก่อน implement)
- **Staging Schema**: Already baseline complete (`0004`, `0005`, `0009`, `0010`, `0011`, `0012`).
- **Dependencies**: The only remaining frontend tasks are final UAT tests and the cutover package release.

---

## 3. Global Responsive & Design Guidelines

To guarantee all V2 screens meet the **Premium Web Application** standards:

- **CSS Tokens & Theme**: Maintain consistent HSL values for status pills (Green for success/complete, Orange for pending/warning, Red for critical/alert).
- **Viewport Safety**: Every module must enforce zero horizontal scrolling at a 390px viewport width.
- **Interaction Targets**: All touch components (buttons, links, form selectors) must have minimum dimensions of `44px x 44px` on mobile layouts.
- **Typography & Wrap**: Product strings, names, email IDs, and serial numbers must wrap or scale using CSS properties:
  ```css
  overflow-wrap: anywhere;
  word-break: break-word;
  ```

---

## 4. Verification Steps (Non-Production Impact)

This is a **planning/architecture** document. It has no impact on runtime systems:
1. Verify that all V1 files in `C:\dev\WEBAPP` remain unmodified.
2. Run `git diff --check` to verify layout consistency.
3. Confirm that no production credentials or LINE channel secrets have been introduced.
