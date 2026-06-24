# V2 App Flow Diagrams (Mermaid)

Plan: `V2-0042`. Basic per-app flow diagrams for all 8 V2 modules, written for
pasting into [Mermaid Live](https://mermaid.live) (paste one code block at a
time into the Code panel there).

Each section states implementation status as of 2026-06-23 so the diagram
isn't mistaken for proven behavior where it is actually planned/mockup-only.

## 1. Overview - Main Portal / Module Registry

Status: Implemented and verified against staging (`V2-0017`).

```mermaid
flowchart TD
    Start(["User opens V2"]) --> AuthCheck{"Signed in?"}
    AuthCheck -- No --> SignIn["/login - Supabase Auth"]
    SignIn --> AuthCheck
    AuthCheck -- Yes --> Main["/ - Main portal, permission-filtered module registry"]
    Main --> Picking["Picking"]
    Main --> Purchasing["Purchasing: PR + PO"]
    Main --> Receiving["Receiving: GR"]
    Main --> Warehouse["Warehouse: TRDAKRA + W5"]
    Main --> Returns["Returns: Returnitem"]
    Main --> KPI["KPI Tracker"]
    Main --> Admin["/admin/permissions - admin only"]
```

## 2. Picking

Status: Implemented and verified against staging (`V2-0019`, `0020`, `0023`,
`0025`, `0027`). Cutover to production not yet approved (`V2-0034`).

```mermaid
flowchart TD
    A(["Start"]) --> B["/picking/new - create requisition"]
    B --> C["create_picking_requisition() RPC"]
    C --> D["Status: pending"]
    D --> E{"LINE push attempt"}
    E -->|"sent / skipped"| D
    E -->|"failed"| F["Retry LINE notification (picking.write)"]
    F --> E
    D -->|"Mark picked (picking.write)"| G["Status: picked"]
    G -->|"Mark sent (picking.write)"| H["Status: sent"]
    D -->|"Report problem"| I["report_picking_problem() RPC"]
    G -->|"Report problem"| I
    I -->|"status unchanged"| D
    I -->|"status unchanged"| G
    H -->|"Report problem blocked"| J["Rejected: already sent"]
```

## 3. Purchasing - PR (Purchase Requisition)

Status: Schema/RLS foundation only (`V2-0036`, migration `0013`). No data
import, RPC, or UI yet. Flow below reflects the planned spec
(`V2-0032`, `V2-0037` mockup).

```mermaid
flowchart TD
    NewPR["/purchasing/pr/new - submit requisition"] --> PRPending["Status: Pending"]
    PRPending --> Supervisor{"Supervisor review"}
    Supervisor -->|"Approve"| PRApproved["Status: Approved"]
    Supervisor -->|"Reject + comment"| PRRejected["Status: Rejected"]
    PRApproved --> PRToPO["Input to PO creation (ref_pr_uid)"]
    PRRejected --> End1(["End"])
```

## 4. Purchasing - PO (Purchase Order)

Status: Schema/RLS foundation only (`V2-0036`, migration `0013`). No data
import, RPC, or UI yet. Flow below reflects the planned spec
(`V2-0032`, `V2-0033` mockup).

```mermaid
flowchart TD
    Origin{"PO origin"}
    Origin -->|"PR-referenced"| FromPR["Create PO from approved PR"]
    Origin -->|"Direct PO"| DirectPO["Create Direct PO (DIRECT-uuid grouping)"]
    FromPR --> Draft["Status: Draft"]
    DirectPO --> Draft
    Draft --> Edit["/purchasing/po/[id]/edit"]
    Edit --> Approve{"purchasing.approve"}
    Approve -->|"Approved"| OpenPO["Status: Open - awaiting GR"]
    OpenPO --> Matching["Matched against GR receipts"]
    Matching --> Close{"All lines received?"}
    Close -->|"Yes"| Closed["Status: Closed + APV"]
    Close -->|"No"| OpenPO
```

## 5. Receiving - GR (Goods Receipt)

Status: Schema/RLS foundation only (`V2-0036`, migration `0013`). No data
import, RPC, or UI yet. Flow below reflects the planned spec
(`V2-0032`, `V2-0035` mockup).

```mermaid
flowchart TD
    Calendar["/receiving - 14-day calendar, warehouse tabs"] --> Detail["/receiving/[id] - verify PO items"]
    Detail --> Input["Input actual qty, exp date, location"]
    Input --> Split{"Split across locations?"}
    Split -->|"Yes"| SplitModal["Split modal - multi-location breakdown"]
    Split -->|"No"| SingleLoc["Single location entry"]
    SplitModal --> Confirm["Confirm receiving"]
    SingleLoc --> Confirm
    Confirm --> POMatch["Update matched PO line qty"]
    Confirm --> Recall{"Admin recall/reset?"}
    Recall -->|"Yes"| ResetPending["PO line returns to pending receiving"]
    Recall -->|"No"| Done(["GR complete"])
```

## 6. Warehouse - TRDAKRA + W5

Status: Placeholder route only (permission-guarded, `V2-0041`), no schema or
UI content yet. Flow below reflects the planned spec (`V2-0032`).

```mermaid
flowchart TD
    Hub["/warehouse/trd-akra - TRD(W1) / AKRA(W2-W5,C1-C2) hub"] --> Survey["/warehouse/trd-akra/survey - stock audit"]
    Hub --> Request["Staff request items"]
    Request --> DupCheck{"Active order already pipelined?"}
    DupCheck -->|"Yes"| BlockReq["Block duplicate request"]
    DupCheck -->|"No"| Dispatch["/warehouse/trd-akra/dispatch"]
    Dispatch --> Outcome{"Dispatch outcome"}
    Outcome -->|"Delivered"| Delivered["Delivered"]
    Outcome -->|"Partial"| Partial["Partial - stays visible in list"]
    Outcome -->|"Out of stock"| OutOfStock["Out of stock - stays visible in list"]
    Hub --> W5Stock["/warehouse/w5 - stock dashboard"]
    W5Stock --> LowStock{"Below 20 units?"}
    LowStock -->|"Yes"| Alert["Low-stock alert badge"]
    W5Stock --> Adjust["/warehouse/w5/adjust - manual override + audit log"]
```

## 7. Returns (Returnitem)

Status: Placeholder route only (permission-guarded, `V2-0041`), no schema, UI,
or mockup yet. Flow below is a generic placeholder based on
`docs/migration/module-inventory.md`'s description only - treat as
lowest-confidence diagram in this set, expect revision once a mockup/plan
exists.

```mermaid
flowchart TD
    NewReturn["Submit return / claim request"] --> ReturnPending["Status: Pending"]
    ReturnPending --> ReturnReview{"Supervisor review"}
    ReturnReview -->|"Approve"| ReturnApproved["Status: Approved"]
    ReturnReview -->|"Reject"| ReturnRejected["Status: Rejected"]
    ReturnApproved --> WarehouseProcess["Warehouse processes return"]
    WarehouseProcess --> ReturnClosed["Status: Closed"]
```

## 8. KPI Tracker

Status: Placeholder route only (permission-guarded, `V2-0041`), no schema yet.
Flow below reflects the planned spec (`V2-0032`, `V2-0038` mockup).

```mermaid
flowchart TD
    DailyInput["/kpi/admin - supervisor inputs daily records (kpi.admin)"] --> Store["kpi_records"]
    Store --> Dashboard["/kpi - dashboard, trend charts"]
    Dashboard --> Targets{"Meets target?"}
    Targets -->|"Yes"| Green["Green metric card"]
    Targets -->|"No"| Red["Red metric card"]
    Store --> Config["kpi_configs - target thresholds (kpi.admin only)"]
```

## Status Legend

| Module | Status |
| --- | --- |
| Main / Auth | Implemented, verified staging |
| Picking | Implemented, verified staging; cutover not approved |
| Purchasing PR/PO, Receiving GR | Schema/RLS only (`0013`); flow is planned spec, unproven |
| Warehouse, Returns, KPI | Placeholder route + permission guard only; flow is planned spec or generic |
