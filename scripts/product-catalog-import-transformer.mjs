import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const importDataDir = join(root, "import-data");
const reportsDir = join(root, "import-reports");

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}

// File paths
const files = {
  poProduct: join(importDataDir, "po-pr-gr", "Trackingpo - webapp - ProductName.csv"),
  poPO: join(importDataDir, "po-pr-gr", "Trackingpo - webapp - PO.csv"),
  poGR: join(importDataDir, "po-pr-gr", "Trackingpo - webapp - GR.csv"),
  poVendor: join(importDataDir, "po-pr-gr", "Trackingpo - webapp - Vendor.csv"),
  retProduct: join(importDataDir, "returnitem", "Returned item - ProductName.csv"),
  trdProduct: join(importDataDir, "akra-trd", "เบิกย้าย Request - Product.csv"),
  trdW1: join(importDataDir, "akra-trd", "เบิกย้าย Request - เบิกย้ายW1.csv"),
  w5Product: join(importDataDir, "akra-w5", "ประวัติคลังสินค้า W5 - W5.csv"),
  w5History: join(importDataDir, "akra-w5", "ประวัติคลังสินค้า W5 - History.csv"),
};

const AKRA_WAREHOUSE_KEYS = new Set(["W2", "W3", "W4", "W5", "C1", "C2"]);
const TRD_WAREHOUSE_KEYS = new Set(["W1"]);

// CSV parser helper
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = [];
  const seenHeaders = {};

  for (const h of rawHeaders) {
    if (h === "") {
      headers.push("");
      continue;
    }
    if (seenHeaders[h] !== undefined) {
      seenHeaders[h]++;
      headers.push(`${h}_${seenHeaders[h]}`);
    } else {
      seenHeaders[h] = 0;
      headers.push(h);
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      if (h) {
        row[h] = values[j] !== undefined ? values[j] : "";
      }
    }
    rows.push(row);
  }
  return { headers, rows };
}

function toNameKey(name) {
  if (!name) return "";
  return name.trim().toLowerCase();
}

async function run() {
  console.log("=== AKRA V2 Shared Catalog & Warehouse Dry-Run Transformer ===");

  // Read files
  const data = {};
  for (const [name, path] of Object.entries(files)) {
    data[name] = parseCSV(readFileSync(path, "utf8"));
  }

  // 1. Build Vendors Master
  const vendors = [];
  const vendorMap = new Map(); // Code -> Vendor

  data.poVendor.rows.forEach((row) => {
    const code = row["Code"]?.trim();
    const name = row["Vendor Name"]?.trim();
    if (code && name) {
      const v = {
        vendor_key: code.toLowerCase(),
        display_name: name,
        phone: row["Phone Number"]?.trim() || null,
        email: row["Email"]?.trim() || null,
        address: row["Address"]?.trim() || null,
        tax_id: row["Tax ID"]?.trim() || null,
        is_active: true
      };
      vendors.push(v);
      vendorMap.set(code, v);
    }
  });

  // 2. Build Canonical Products from PO/GR ProductName file
  const products = [];
  const productCodeMap = new Map(); // Canonical Code -> Product
  const productNameMap = new Map(); // Name Key -> Product
  const productAliases = [];
  const productVendors = [];

  data.poProduct.rows.forEach((row) => {
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    if (!code || !name) return;

    const nameKey = toNameKey(name);
    const p = {
      canonical_code: code,
      canonical_name: name,
      name_key: nameKey,
      default_unit: row["Unit"]?.trim() || "ลัง",
      category: row["Category"]?.trim() || null,
      is_active: true
    };
    products.push(p);
    productCodeMap.set(code, p);
    productNameMap.set(nameKey, p);

    // Create primary product-vendor link if vendor code exists
    const vendorCode = row["Vendor Code"]?.trim();
    const vendorName = row["Vendor Name"]?.trim();
    if (vendorCode && vendorCode !== "#REF!") {
      productVendors.push({
        canonical_code: code,
        vendor_code: vendorCode,
        vendor_product_code: code,
        vendor_product_name: name,
        is_primary: true,
        lead_time_days: parseInt(row["Lead Time"]?.trim(), 10) || null
      });
    }

    // Add self alias
    productAliases.push({
      source_app: "po-pr-gr",
      source_file: "Trackingpo - webapp - ProductName.csv",
      legacy_code: code,
      source_name: name,
      source_name_key: nameKey,
      source_unit: p.default_unit,
      source_category: p.category,
      source_vendor_code: vendorCode || null,
      source_vendor_name: vendorName || null,
      match_status: "matched_code",
      match_confidence: 100.00
    });
  });

  // 3. Process Returnitem Aliases
  data.retProduct.rows.forEach((row) => {
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    if (!name) return;

    const nameKey = toNameKey(name);
    const canonicalProduct = code ? productCodeMap.get(code) : productNameMap.get(nameKey);

    productAliases.push({
      source_app: "returnitem",
      source_file: "Returned item - ProductName.csv",
      legacy_code: code || null,
      source_name: name,
      source_name_key: nameKey,
      source_unit: row["Unit"]?.trim() || null,
      source_category: row["Category"]?.trim() || null,
      source_vendor_code: row["Vendor Code"]?.trim() || null,
      source_vendor_name: row["Vendor Name"]?.trim() || null,
      match_status: canonicalProduct ? (code ? "matched_code" : "matched_exact_name") : "manual_review",
      match_confidence: canonicalProduct ? 100.00 : 0.00
    });
  });

  // 4. Process TRDAKRA Product Aliases
  data.trdProduct.rows.forEach((row) => {
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    if (!name) return;

    const nameKey = toNameKey(name);
    const canonicalProduct = code ? productCodeMap.get(code) : productNameMap.get(nameKey);

    productAliases.push({
      source_app: "akra-trd",
      source_file: "เบิกย้าย Request - Product.csv",
      legacy_code: code || null,
      source_name: name,
      source_name_key: nameKey,
      source_unit: row["Unit"]?.trim() || null,
      source_category: null,
      source_vendor_code: null,
      source_vendor_name: null,
      match_status: canonicalProduct ? (code ? "matched_code" : "matched_exact_name") : "manual_review",
      match_confidence: canonicalProduct ? 100.00 : 0.00
    });
  });

  // 5. Process W5 Current Stock & Aliases
  data.w5Product.rows.forEach((row) => {
    const name = row["ชื่อสินค้า"]?.trim();
    if (!name) return;

    const nameKey = toNameKey(name);
    const canonicalProduct = productNameMap.get(nameKey);

    productAliases.push({
      source_app: "akra-w5",
      source_file: "ประวัติคลังสินค้า W5 - W5.csv",
      legacy_code: null,
      source_name: name,
      source_name_key: nameKey,
      source_unit: row["หน่วย"]?.trim() || null,
      source_category: null,
      source_vendor_code: null,
      source_vendor_name: null,
      match_status: canonicalProduct ? "matched_exact_name" : "manual_review",
      match_confidence: canonicalProduct ? 100.00 : 0.00
    });
  });

  // 6. Gather Evidence for Scopes
  const trdReferencedProducts = new Set();
  const w5ReferencedProducts = new Set();
  const akraReferencedProducts = new Set(); // referenced in PO/GR with AKRA warehouses

  // TRDAKRA Product config is shared warehouse coverage. Per the V2-0018
  // decision gate, products listed there default to AKRA-TRD.
  data.trdProduct.rows.forEach((row) => {
    const code = row["Product code"]?.trim();
    if (code) {
      trdReferencedProducts.add(code);
      akraReferencedProducts.add(code);
    }
  });
  data.trdW1.rows.forEach((row) => {
    const name = row["ชื่อสินค้า"]?.trim();
    if (name) {
      const key = toNameKey(name);
      const p = productNameMap.get(key);
      if (p && p.canonical_code) {
        trdReferencedProducts.add(p.canonical_code);
      }
    }
  });

  // W5 references from W5 Stock and W5 History
  data.w5Product.rows.forEach((row) => {
    const name = row["ชื่อสินค้า"]?.trim();
    if (name) {
      const key = toNameKey(name);
      const p = productNameMap.get(key);
      if (p && p.canonical_code) {
        w5ReferencedProducts.add(p.canonical_code);
      }
    }
  });
  data.w5History.rows.forEach((row) => {
    const name = row["ProductName"]?.trim();
    if (name) {
      const key = toNameKey(name);
      const p = productNameMap.get(key);
      if (p && p.canonical_code) {
        w5ReferencedProducts.add(p.canonical_code);
      }
    }
  });

  // Business references from PO warehouse destinations:
  // W1 is TRD; W2, W3, W4, W5, C1, and C2 are AKRA.
  data.poPO.rows.forEach((row) => {
    const code = row["SKU"]?.trim();
    const wh = row["Warehouse"]?.trim()?.toUpperCase();
    if (code && wh) {
      if (AKRA_WAREHOUSE_KEYS.has(wh)) {
        akraReferencedProducts.add(code);
      }
      if (TRD_WAREHOUSE_KEYS.has(wh)) {
        trdReferencedProducts.add(code);
      }
    }
  });

  // Build scopes and business buckets for canonical products
  const scopeSummary = [];
  products.forEach((p) => {
    const code = p.canonical_code;
    const hasTrd = trdReferencedProducts.has(code);
    const hasW5 = w5ReferencedProducts.has(code);
    const hasAkra = akraReferencedProducts.has(code);

    let bucket = "unassigned";
    if (hasTrd && hasAkra) {
      bucket = "akra_trd";
    } else if (hasTrd) {
      bucket = "trd_only";
    } else if (hasAkra) {
      bucket = "akra_only";
    }

    scopeSummary.push({
      canonical_code: code,
      canonical_name: p.canonical_name,
      has_trd: hasTrd,
      has_akra: hasAkra,
      has_w5: hasW5,
      business_bucket: bucket
    });
  });

  // Count buckets
  const bucketCounts = {
    trd_only: 0,
    akra_only: 0,
    akra_trd: 0,
    unassigned: 0
  };
  scopeSummary.forEach((s) => {
    bucketCounts[s.business_bucket]++;
  });

  // ==========================================
  // LOCATION & WAREHOUSE SEED NORMALIZATION
  // ==========================================
  const warehouses = [
    { key: "w1", display: "คลัง W1 (TRD)", bu: "trd" },
    { key: "w2", display: "คลัง W2 (AKRA)", bu: "akra" },
    { key: "w3", display: "คลัง W3 (AKRA)", bu: "akra" },
    { key: "w4", display: "คลัง W4 (AKRA)", bu: "akra" },
    { key: "w5", display: "คลัง W5 (วัตถุดิบแป้ง)", bu: "akra" },
    { key: "c1", display: "คลัง C1 (ห้องเย็น W4)", bu: "akra" },
    { key: "c2", display: "คลัง C2 (AKRA)", bu: "akra" },
  ];

  const warehouseLocations = [];
  const seenLocations = new Set();

  // Helper to normalize location
  function addLocation(whKey, rawLoc, source) {
    if (!rawLoc) return;
    const key = `${whKey}:${rawLoc.toLowerCase()}`;
    if (seenLocations.has(key)) return;
    seenLocations.add(key);

    // simple derived parsing
    let floor = null;
    let zone = null;
    const cleanLoc = rawLoc.toLowerCase();

    const floorMatch = cleanLoc.match(/(?:floor|ชั้น|f)\s*([0-9a-z]+)/i) || cleanLoc.match(/([0-9a-z]+)\s*(?:floor|ชั้น|f)/i) || cleanLoc.match(/([1-9])\s*[wfc\/]/i);
    if (floorMatch) {
      floor = floorMatch[1].toUpperCase();
    } else if (cleanLoc.includes("ชั้น1") || cleanLoc.includes("-1f") || cleanLoc.includes("/1f") || cleanLoc.includes("1w")) {
      floor = "1";
    } else if (cleanLoc.includes("ชั้น2") || cleanLoc.includes("-2f") || cleanLoc.includes("/2f") || cleanLoc.includes("-2c")) {
      floor = "2";
    } else if (cleanLoc.includes("ชั้น3") || cleanLoc.includes("-3f") || cleanLoc.includes("/3f") || cleanLoc.includes("w1/3")) {
      floor = "3";
    } else if (cleanLoc.includes("ชั้น4") || cleanLoc.includes("-4f") || cleanLoc.includes("/4f") || cleanLoc.includes("f4")) {
      floor = "4";
    }

    warehouseLocations.push({
      warehouse_key: whKey,
      raw_location: rawLoc,
      floor: floor,
      zone: zone,
      source_app: source
    });
  }

  // Parse location sources
  data.poGR.rows.forEach((row) => {
    const loc = row["Loc_IN"]?.trim();
    if (loc) {
      let whKey = "w1"; // default
      const upperLoc = loc.toUpperCase();
      if (upperLoc.startsWith("W2") || upperLoc.includes("W2")) whKey = "w2";
      else if (upperLoc.startsWith("W3") || upperLoc.includes("W3")) whKey = "w3";
      else if (upperLoc.startsWith("W4") || upperLoc.includes("W4")) whKey = "w4";
      else if (upperLoc.startsWith("W5") || upperLoc.includes("W5")) whKey = "w5";
      else if (upperLoc.startsWith("C1")) whKey = "c1";
      else if (upperLoc.startsWith("C2")) whKey = "c2";
      addLocation(whKey, loc, "po-pr-gr");
    }
  });

  data.trdProduct.rows.forEach((row) => {
    const floor = row["Floor"]?.trim();
    const location = row["Location"]?.trim();
    if (floor || location) {
      const locStr = [floor, location].filter(Boolean).join(" - ");
      addLocation("w1", locStr, "akra-trd");
    }
  });

  // Write Preview Report
  const previewPath = join(reportsDir, "transformer-preview-report.md");
  let previewText = `# Shared Catalog & Warehouse Import Preview Report

**Date:** ${new Date().toISOString()}
**Transformation Summary:** Dry run simulation mapping legacy snaps to V2 targets.

## 1. Catalog Targets Summary

| Target Table | Record Count | Source Details |
| --- | ---: | --- |
| \`public.catalog_products\` | ${products.length} | Master codes loaded from PO/GR |
| \`public.catalog_vendors\` | ${vendors.length} | Seeded from Vendor.csv |
| \`public.catalog_product_aliases\` | ${productAliases.length} | Merged aliases (PO/GR, Returnitem, TRDAKRA, W5) |
| \`public.catalog_product_vendors\` | ${productVendors.length} | Vendor primary matches |
| \`public.warehouse_warehouses\` | ${warehouses.length} | Static seeded warehouses |
| \`public.warehouse_locations\` | ${warehouseLocations.length} | Normalized location codes |

---

## 2. Product Classification Buckets (Scopes)

Based on transactional evidence (PO, GR, W1 requests, W5 stock/history), we classify products as follows:

| Classification Bucket | Count | Description |
| --- | ---: | --- |
| **TRD Only** (\`trd_only\`) | ${bucketCounts.trd_only} | Product references exist in TRD/W1 only |
| **AKRA Only** (\`akra_only\`) | ${bucketCounts.akra_only} | Product references exist only in AKRA warehouse evidence |
| **AKRA-TRD** (\`akra_trd\`) | ${bucketCounts.akra_trd} | References exist in both TRD and AKRA |
| **Unassigned** (\`unassigned\`) | ${bucketCounts.unassigned} | Registered in PO master but no transaction evidence yet |

---

## 3. Product Alias Match Matrix

Matches are analyzed based on incoming raw file names matching canonical master keys:

| Source App | Match Status | Count | Notes |
| --- | --- | ---: | --- |
| **po-pr-gr** | \`matched_code\` | ${products.length} | Master self-references |
| **returnitem** | Mapped | ${productAliases.filter(a => a.source_app === 'returnitem' && a.match_status !== 'manual_review').length} | Mapped successfully |
| | \`manual_review\` | ${productAliases.filter(a => a.source_app === 'returnitem' && a.match_status === 'manual_review').length} | Unmatched return records |
| **akra-trd** | Mapped | ${productAliases.filter(a => a.source_app === 'akra-trd' && a.match_status !== 'manual_review').length} | Mapped successfully |
| | \`manual_review\` | ${productAliases.filter(a => a.source_app === 'akra-trd' && a.match_status === 'manual_review').length} | Unmatched TRD records |
| **akra-w5** | Mapped | ${productAliases.filter(a => a.source_app === 'akra-w5' && a.match_status !== 'manual_review').length} | 95 current W5 stock matches |
| | \`manual_review\` | ${productAliases.filter(a => a.source_app === 'akra-w5' && a.match_status === 'manual_review').length} | 21 unmatched W5 stock records |

---

## 4. Location Parsing Preview (Sample)
Showing 20 sample normalized warehouse locations from GR and TRDAKRA Product config:

| Warehouse Key | Raw Location String | Derived Floor | Derived Zone | Source App |
| --- | --- | ---: | ---: | --- |
${warehouseLocations.slice(0, 20).map((loc) => `| \`${loc.warehouse_key}\` | \`${loc.raw_location}\` | \`${loc.floor || 'NULL'}\` | \`${loc.zone || 'NULL'}\` | \`${loc.source_app}\` |`).join("\n")}

---

## 5. Next Steps
- **Manual Alias Review:** Review unmatched W5 stock items and transaction-only product names before using them in production workflows.
- **Staging Baseline:** Re-run \`scripts/product-catalog-import-apply.mjs --confirm-staging-import\` after transformer changes to keep staging aligned with this preview.
`;

  writeFileSync(previewPath, previewText, "utf8");
  console.log(`\nTransformer preview report written to: ${previewPath}`);
}

run().catch((err) => {
  console.error("Fatal error in transformer dry run:", err);
  process.exit(1);
});
