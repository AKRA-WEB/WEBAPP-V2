# Product Catalog and Warehouse V1-to-V2 Mapping

This document defines how legacy data snapshot CSV files under `import-data/` map to the V2 database tables defined in migration `0008_shared_catalog_schema.sql`.

## 1. Source Files & Data Quality Notes

From the dry-run profiling completed on 2026-06-19:
- **`po-pr-gr/Trackingpo - webapp - ProductName.csv`** is the master coded list (4,793 rows, 4,793 codes, 4,793 names). Every code is unique.
- **`returnitem/Returned item - ProductName.csv`** has 5,265 rows but contains 531 blank rows and 5,263 rows with `#REF!` values in vendor columns. All valid codes exist in PO/GR.
- **`akra-trd/เบิกย้าย Request - Product.csv`** has 1,791 rows. All codes exist in PO/GR. Contains floor/location par config.
- **`akra-w5/ประวัติคลังสินค้า W5 - W5.csv`** contains 116 current stock items. It is name-only. 95 match PO/GR names, 21 are unmatched.
- **`akra-w5/ประวัติคลังสินค้า W5 - History.csv`** contains 816 transactions. 9 product names are unmatched and often contain `[ยกเลิก]` or status suffixes.
- **`akra-trd/เบิกย้าย Request - เบิกย้ายW1.csv`** contains 844 transactions. 36 product names are unmatched with the master.

---

## 2. Table-by-Table Mapping Rules

### A. `catalog_products` (Canonical Product Master)
Every product code from `po-pr-gr/ProductName.csv` maps to a canonical product.
*Note: Do not create duplicate products from returnitem or trd lists when the product code matches an existing PO/GR row.*

| V2 Field | Source Field (PO/GR ProductName) | Mapping Logic / Default Value |
| --- | --- | --- |
| `id` | - | `gen_random_uuid()` |
| `canonical_code` | `Product code` | Cleaned text string |
| `canonical_name` | `Product name` | Cleaned text string (must not be blank) |
| `name_key` | `Product name` | Lowercase trimmed key, e.g. `btrim(lower(name))` |
| `default_unit` | `Unit` | e.g. `ลัง`, `แพ็ค`, `ชิ้น` |
| `category` | `Category` | Trimmed category string |
| `is_active` | - | `true` |

---

### B. `catalog_product_aliases` (Product App/File Aliases)
Every row from PO/GR, Returnitem, TRDAKRA Product, and W5 Current Stock represents a source alias. This allows different names, categories, and units to coexist.

| V2 Field | Source | Value / Mapping Logic |
| --- | --- | --- |
| `product_id` | Match | Resolved `catalog_products.id` via product code or manual approval |
| `source_app` | String | `po-pr-gr`, `returnitem`, `akra-trd`, or `akra-w5` |
| `source_file` | String | Filename of the source snapshot |
| `legacy_code` | `Product code` | Source-specific code (can be empty, e.g. W5) |
| `source_name` | `Product name` / `ชื่อสินค้า` | Exact string from the file |
| `source_name_key` | `Product name` / `ชื่อสินค้า` | Lowercase trimmed key |
| `source_unit` | `Unit` / `หน่วย` | Source unit string |
| `source_category` | `Category` | Source category string |
| `source_vendor_code` | `Vendor Code` | Source vendor code (ignore `#REF!`) |
| `source_vendor_name` | `Vendor Name` | Source vendor name (ignore `#REF!`) |
| `match_status` | Status | `matched_code` (if code matched PO/GR), `matched_exact_name` (if name matched PO/GR), `manual_review` (for the 21 W5 unmatched rows) |
| `match_confidence` | Numeric | `100.00` for exact matches; less for fuzzy matches |

---

### C. `catalog_product_scopes` (Product Branch & Module Scope)
Scopes are created based on where a product appears, showing business unit and module visibility.

| Scope Type | Scope Key | Source App | Evidence / Classification Rule |
| --- | --- | --- | --- |
| `business_unit` | `trd` | `akra-trd` | Presence in TRDAKRA Product config or W1 transactions |
| `business_unit` | `akra` | `akra-trd` / `po-pr-gr` | TRDAKRA Product config defaults to `akra_trd`; PO warehouse evidence also adds AKRA for W2, W3, W4, W5, C1, and C2 |
| `warehouse` | `w1` | `akra-trd` | Presence in W1 transactions |
| `warehouse` | `w2` | `po-pr-gr` | GR Loc_IN contains `W2` or PO Warehouse is `W2` |
| `warehouse` | `w5` | `akra-w5` | Presence in W5 Current Stock |
| `module` | `purchasing` | `po-pr-gr` | PO record exists |
| `module` | `receiving` | `po-pr-gr` | GR record exists |
| `module` | `returns` | `returnitem` | Return record exists |
| `module` | `warehouse` | `akra-trd` | TRDAKRA Product config exists |

---

### D. `catalog_vendors` and `catalog_product_vendors`
Vendors are seeded from `po-pr-gr/Trackingpo - webapp - Vendor.csv`. Product-vendor relationships are populated from PO/GR ProductName file rows.

#### `catalog_vendors`
| V2 Field | Source Field (`Vendor.csv`) | Mapping Logic / Default Value |
| --- | --- | --- |
| `id` | - | `gen_random_uuid()` |
| `vendor_key` | `Code` | Trimmed lowercase key |
| `display_name` | `Vendor Name` | Vendor display name |
| `phone` | `Phone Number` | Phone contact |
| `email` | `Email` | Email contact |
| `address` | `Address` | Full text address |
| `tax_id` | `Tax ID` | Tax registration number |

#### `catalog_product_vendors`
| V2 Field | Value / Mapping Logic |
| --- | --- |
| `product_id` | Resolved `catalog_products.id` via Product code |
| `vendor_id` | Resolved `catalog_vendors.id` via Vendor Code |
| `vendor_product_code`| Source `Product code` (if vendor-specific code is not defined) |
| `vendor_product_name`| Source `Product name` |
| `is_primary` | `true` (since this is the master relationship listed on the product row) |
| `lead_time_days` | Cleaned integer from `Lead Time` |

---

### E. `warehouse_warehouses` (Warehouse Master)
Seed static warehouses in V2 based on legacy codes:

| ID (Static/UUID) | `warehouse_key` | `display_name` | `business_unit` (Assumed) |
| --- | --- | --- | --- |
| `gen_random_uuid()` | `w1` | คลัง W1 | trd |
| `gen_random_uuid()` | `w2` | คลัง W2 | akra |
| `gen_random_uuid()` | `w3` | คลัง W3 | akra |
| `gen_random_uuid()` | `w4` | คลัง W4 | akra |
| `gen_random_uuid()` | `w5` | คลัง W5 (คลังวัตถุดิบแป้ง) | akra |
| `gen_random_uuid()` | `c1` | คลัง C1 (ห้องเย็น W4) | akra |
| `gen_random_uuid()` | `c2` | คลัง C2 | akra |

---

### F. `warehouse_locations` (Location Normalization)
Unique location names from GR (`Loc_IN`), PO (`Warehouse`), and TRDAKRA (`Floor`/`Location`) are saved to preserve the raw strings.
*Example: `w1/3f` or `ชั้น4` is normalized to warehouse `w1`, floor `3` or `4`.*

| V2 Field | Source Field | Mapping Logic |
| --- | --- | --- |
| `warehouse_id` | `Warehouse` / Prefix | Resolved `warehouse_warehouses.id` (e.g. W1 -> `w1`) |
| `location_code`| Derived | Normalized code (e.g. `w1-3f`) |
| `floor` | Derived / `Floor` | Parsed floor (e.g. `3F` -> `3`, `ชั้น4` -> `4`) |
| `zone` | Derived / `Location` | Parsed aisle/shelf/zone |
| `raw_location` | Raw cell string | Full raw text (e.g. `w1/3f`, `ชั้น4`, `W2-2F`) |
| `source_app` | String | App file providing this location |

---

### G. `warehouse_product_locations` (Placement Rules)
Placement and par level rules per product location.

| V2 Field | Source Field | Mapping Logic |
| --- | --- | --- |
| `product_id` | `Product code` | Resolved `catalog_products.id` |
| `warehouse_id` | Prefix/Default | Resolved `warehouse_warehouses.id` (e.g. `w1` for TRDAKRA) |
| `location_id` | Derived | Resolved `warehouse_locations.id` |
| `location_role`| - | `'picking'` (for TRDAKRA Product location configs) |
| `par_level` | `Par Level` | Numeric level (ignore if 0 or empty) |
| `source_app` | - | `'akra-trd'` |

---

### H. `warehouse_inventory_balances` (W5 Stock Snapshot)
Stock balances imported from `akra-w5/ประวัติคลังสินค้า W5 - W5.csv`.

| V2 Field | Source Field (`W5.csv`) | Mapping Logic |
| --- | --- | --- |
| `product_id` | `ชื่อสินค้า` | Resolved `catalog_products.id` via exact name match. Left `NULL` for the 21 unmatched names. |
| `warehouse_id` | - | Resolved `warehouse_warehouses.id` for key `'w5'` |
| `qty_on_hand` | `จำนวน` | Cleaned numeric quantity |
| `unit` | `หน่วย` | Source unit, e.g. `'กระสอบ'`, `'ลัง'` |
| `source_name` | `ชื่อสินค้า` | Exact string from the file |
| `source_app` | - | `'akra-w5'` |
| `as_of` | - | Snapshot date: `2026-06-19T00:00:00+07:00` |

---

### I. `warehouse_stock_movements` (Transaction Event Ledger)
W1 requests and W5 history files are loaded as historical movements.
*Note: The W5 History dates must be parsed as Bangkok-local time (UTC+7).*

| V2 Field | Source Field (W5 History) | Source Field (W1 Request) | Mapping Logic |
| --- | --- | --- | --- |
| `product_id` | `ProductName` | `ชื่อสินค้า` | Resolved `catalog_products.id` (or NULL if unmatched) |
| `warehouse_id` | - | - | Resolved `'w5'` for W5 history; `'w1'` for W1 requests |
| `movement_type`| `Type` | `'request'` / `'issue'` | Normalized type (e.g. `'in'`, `'out'`, `'adjust'`) |
| `qty` | `Qty` | `จำนวนที่ได้รับจริง` | Numeric quantity |
| `unit` | Derived / W5 Stock unit | `จำนวนเบิก` suffix/unit | Unit string |
| `occurred_at` | `Date` + `Time` | `เวลา` | Timestamptz (parse `DD/MM/YYYY` in Bangkok zone) |
| `actor_name` | `User` | - | Operator name |
| `source_app` | `'akra-w5'` | `'akra-trd'` | Source identifier |
| `legacy_id` | - | `ID` | Legacy request ID |
| `source_name` | `ProductName` | `ชื่อสินค้า` | Raw name string |
| `metadata` | - | `สถานะ`, `หมายเหตุ` | Audit JSON details |
