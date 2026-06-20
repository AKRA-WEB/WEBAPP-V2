import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const root = process.cwd();
const importDataDir = join(root, "import-data");

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

const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";
const REQUIRED_IMPORT_FLAG = "--confirm-staging-import";
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

// Convert DD/MM/YYYY or DD/MM/YYYY HH:MM:SS to ISO string in Asia/Bangkok
function parseBangkokDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/\s+/);
  const dParts = parts[0].split("/");
  if (dParts.length !== 3) return null;

  const day = dParts[0].padStart(2, "0");
  const month = dParts[1].padStart(2, "0");
  let year = dParts[2];
  if (year.length === 2) {
    year = "20" + year; // assume 20xx
  }

  let timeStr = "00:00:00";
  if (parts[1]) {
    const tParts = parts[1].split(":");
    const hours = tParts[0]?.padStart(2, "0") || "00";
    const minutes = tParts[1]?.padStart(2, "0") || "00";
    const seconds = tParts[2]?.padStart(2, "0") || "00";
    timeStr = `${hours}:${minutes}:${seconds}`;
  }

  return `${year}-${month}-${day}T${timeStr}+07:00`;
}

// Reusable batch bulk insert helper
async function bulkInsert(client, tableName, columns, rows) {
  if (rows.length === 0) return [];
  const results = [];
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const flatValues = [];
    let counter = 1;
    for (const row of batch) {
      const rowPlaceholders = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${counter}`);
        flatValues.push(row[col] !== undefined ? row[col] : null);
        counter++;
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
    }
    const query = `insert into ${tableName} (${columns.join(", ")}) values ${valuePlaceholders.join(", ")} returning *`;
    const res = await client.query(query, flatValues);
    results.push(...res.rows);
  }
  return results;
}

async function run() {
  console.log("=== AKRA V2 Shared Catalog & Warehouse Import ===");

  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && existsSync(join(root, ".env.local"))) {
    const envText = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        databaseUrl = match[1].trim();
        break;
      }
    }
  }

  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  if (!process.argv.includes(REQUIRED_IMPORT_FLAG)) {
    console.error(`Refusing to truncate/import without ${REQUIRED_IMPORT_FLAG}.`);
    process.exit(1);
  }

  if (!databaseUrl.includes(STAGING_PROJECT_REF) && process.env.AKRA_ALLOW_NON_STAGING_IMPORT !== "true") {
    console.error("Refusing catalog import because DATABASE_URL does not target the known staging project.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to staging database.");

  console.log("Parsing CSV snapshots...");
  const data = {};
  for (const [name, path] of Object.entries(files)) {
    data[name] = parseCSV(readFileSync(path, "utf8"));
  }

  try {
    await client.query("begin");

    // 1. Clean existing catalog/warehouse tables
    console.log("Truncating existing catalog/warehouse records...");
    await client.query(`
      truncate
        public.warehouse_stock_movements,
        public.warehouse_inventory_balances,
        public.warehouse_product_locations,
        public.warehouse_locations,
        public.warehouse_warehouses,
        public.catalog_product_vendors,
        public.catalog_vendors,
        public.catalog_product_scopes,
        public.catalog_product_aliases,
        public.catalog_products
      cascade;
    `);

    // 2. Insert static warehouses (7 rows)
    console.log("Inserting warehouses...");
    const warehouses = [
      { key: "w1", display: "คลัง W1 (TRD)", bu: "trd" },
      { key: "w2", display: "คลัง W2 (AKRA)", bu: "akra" },
      { key: "w3", display: "คลัง W3 (AKRA)", bu: "akra" },
      { key: "w4", display: "คลัง W4 (AKRA)", bu: "akra" },
      { key: "w5", display: "คลัง W5 (วัตถุดิบแป้ง)", bu: "akra" },
      { key: "c1", display: "คลัง C1 (ห้องเย็น W4)", bu: "akra" },
      { key: "c2", display: "คลัง C2 (ห้องฟรีซ W5)", bu: "akra" },
    ];
    const warehouseIdMap = new Map();
    for (const wh of warehouses) {
      const res = await client.query(
        "insert into public.warehouse_warehouses (warehouse_key, display_name, business_unit) values ($1, $2, $3) returning id",
        [wh.key, wh.display, wh.bu]
      );
      warehouseIdMap.set(wh.key, res.rows[0].id);
    }

    // 3. Bulk Insert Vendors
    console.log("Inserting vendors...");
    const vendorRows = [];
    data.poVendor.rows.forEach((row) => {
      const code = row["Code"]?.trim();
      const name = row["Vendor Name"]?.trim();
      if (code && name) {
        vendorRows.push({
          vendor_key: code.toLowerCase(),
          display_name: name,
          phone: row["Phone Number"]?.trim() || null,
          email: row["Email"]?.trim() || null,
          address: row["Address"]?.trim() || null,
          tax_id: row["Tax ID"]?.trim() || null,
        });
      }
    });
    const insertedVendors = await bulkInsert(
      client,
      "public.catalog_vendors",
      ["vendor_key", "display_name", "phone", "email", "address", "tax_id"],
      vendorRows
    );
    const vendorIdMap = new Map();
    insertedVendors.forEach((v) => {
      vendorIdMap.set(v.vendor_key.toUpperCase(), v.id);
    });

    // 4. Bulk Insert Canonical Products
    console.log("Inserting canonical products...");
    const productRows = [];
    data.poProduct.rows.forEach((row) => {
      const code = row["Product code"]?.trim();
      const name = row["Product name"]?.trim();
      if (code && name) {
        productRows.push({
          canonical_code: code,
          canonical_name: name,
          name_key: toNameKey(name),
          default_unit: row["Unit"]?.trim() || "ลัง",
          category: row["Category"]?.trim() || null,
        });
      }
    });
    const insertedProducts = await bulkInsert(
      client,
      "public.catalog_products",
      ["canonical_code", "canonical_name", "name_key", "default_unit", "category"],
      productRows
    );

    const productIdMap = new Map(); // canonical_code -> uuid
    const productByNameKeyMap = new Map(); // name_key -> uuid
    insertedProducts.forEach((p) => {
      productIdMap.set(p.canonical_code, p.id);
      productByNameKeyMap.set(p.name_key, p.id);
    });

    // 5. Bulk Insert Product-Vendor links and Primary Aliases
    console.log("Preparing product-vendors & primary aliases...");
    const productVendorRows = [];
    const aliasRows = [];

    data.poProduct.rows.forEach((row) => {
      const code = row["Product code"]?.trim();
      const name = row["Product name"]?.trim();
      if (!code || !name) return;

      const pId = productIdMap.get(code);
      if (!pId) return;

      const vendorCode = row["Vendor Code"]?.trim();
      if (vendorCode && vendorCode !== "#REF!") {
        const vId = vendorIdMap.get(vendorCode.toUpperCase());
        if (vId) {
          productVendorRows.push({
            product_id: pId,
            vendor_id: vId,
            vendor_product_code: code,
            vendor_product_name: name,
            is_primary: true,
            lead_time_days: parseInt(row["Lead Time"]?.trim(), 10) || null,
          });
        }
      }

      aliasRows.push({
        product_id: pId,
        source_app: "po-pr-gr",
        source_file: "Trackingpo - webapp - ProductName.csv",
        legacy_code: code,
        source_name: name,
        source_name_key: toNameKey(name),
        source_unit: row["Unit"]?.trim() || null,
        source_category: row["Category"]?.trim() || null,
        match_status: "matched_code",
        match_confidence: 100.00,
      });
    });

    // 6. Append Returnitem, TRDAKRA, and W5 aliases
    console.log("Preparing secondary aliases...");
    data.retProduct.rows.forEach((row) => {
      const code = row["Product code"]?.trim();
      const name = row["Product name"]?.trim();
      if (!name) return;

      const nameKey = toNameKey(name);
      const pId = code ? productIdMap.get(code) : productByNameKeyMap.get(nameKey);
      aliasRows.push({
        product_id: pId || null,
        source_app: "returnitem",
        source_file: "Returned item - ProductName.csv",
        legacy_code: code || null,
        source_name: name,
        source_name_key: nameKey,
        source_unit: row["Unit"]?.trim() || null,
        source_category: row["Category"]?.trim() || null,
        match_status: pId ? (code ? "matched_code" : "matched_exact_name") : "manual_review",
        match_confidence: pId ? 100.00 : 0.00,
      });
    });

    data.trdProduct.rows.forEach((row) => {
      const code = row["Product code"]?.trim();
      const name = row["Product name"]?.trim();
      if (!name) return;

      const nameKey = toNameKey(name);
      const pId = code ? productIdMap.get(code) : productByNameKeyMap.get(nameKey);
      aliasRows.push({
        product_id: pId || null,
        source_app: "akra-trd",
        source_file: "เบิกย้าย Request - Product.csv",
        legacy_code: code || null,
        source_name: name,
        source_name_key: nameKey,
        source_unit: row["Unit"]?.trim() || null,
        source_category: null,
        match_status: pId ? (code ? "matched_code" : "matched_exact_name") : "manual_review",
        match_confidence: pId ? 100.00 : 0.00,
      });
    });

    data.w5Product.rows.forEach((row) => {
      const name = row["ชื่อสินค้า"]?.trim();
      if (!name) return;

      const nameKey = toNameKey(name);
      const pId = productByNameKeyMap.get(nameKey);
      aliasRows.push({
        product_id: pId || null,
        source_app: "akra-w5",
        source_file: "ประวัติคลังสินค้า W5 - W5.csv",
        legacy_code: null,
        source_name: name,
        source_name_key: nameKey,
        source_unit: row["หน่วย"]?.trim() || null,
        source_category: null,
        match_status: pId ? "matched_exact_name" : "manual_review",
        match_confidence: pId ? 100.00 : 0.00,
      });
    });

    console.log(`Bulk inserting ${productVendorRows.length} product-vendors...`);
    await bulkInsert(
      client,
      "public.catalog_product_vendors",
      ["product_id", "vendor_id", "vendor_product_code", "vendor_product_name", "is_primary", "lead_time_days"],
      productVendorRows
    );

    console.log(`Bulk inserting ${aliasRows.length} product aliases...`);
    await bulkInsert(
      client,
      "public.catalog_product_aliases",
      ["product_id", "source_app", "source_file", "legacy_code", "source_name", "source_name_key", "source_unit", "source_category", "match_status", "match_confidence"],
      aliasRows
    );

    // 7. Bulk Insert Scopes
    console.log("Preparing scopes...");
    const scopeRows = [];
    const trdReferencedProducts = new Set();
    const w5ReferencedProducts = new Set();
    const akraReferencedProducts = new Set();

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
        const p = data.poProduct.rows.find(r => r["Product name"]?.trim() === name);
        if (p && p["Product code"]) trdReferencedProducts.add(p["Product code"]);
      }
    });

    data.w5Product.rows.forEach((row) => {
      const name = row["ชื่อสินค้า"]?.trim();
      if (name) {
        const p = data.poProduct.rows.find(r => r["Product name"]?.trim() === name);
        if (p && p["Product code"]) w5ReferencedProducts.add(p["Product code"]);
      }
    });
    data.w5History.rows.forEach((row) => {
      const name = row["ProductName"]?.trim();
      if (name) {
        const p = data.poProduct.rows.find(r => r["Product name"]?.trim() === name);
        if (p && p["Product code"]) w5ReferencedProducts.add(p["Product code"]);
      }
    });

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

    for (const [code, pId] of productIdMap.entries()) {
      const hasTrd = trdReferencedProducts.has(code);
      const hasW5 = w5ReferencedProducts.has(code);
      const hasAkra = akraReferencedProducts.has(code);

      if (hasTrd) {
        scopeRows.push({
          product_id: pId,
          scope_type: "business_unit",
          scope_key: "trd",
          source_app: "transform",
          evidence: "transaction_evidence",
        });
      }
      if (hasAkra || hasW5) {
        scopeRows.push({
          product_id: pId,
          scope_type: "business_unit",
          scope_key: "akra",
          source_app: "transform",
          evidence: "transaction_evidence",
        });
      }
      if (hasW5) {
        scopeRows.push({
          product_id: pId,
          scope_type: "warehouse",
          scope_key: "w5",
          source_app: "transform",
          evidence: "stock_evidence",
        });
      }
    }
    console.log(`Bulk inserting ${scopeRows.length} scope entries...`);
    await bulkInsert(
      client,
      "public.catalog_product_scopes",
      ["product_id", "scope_type", "scope_key", "source_app", "evidence"],
      scopeRows
    );

    // 8. Normalize & Bulk Insert Locations
    console.log("Preparing locations...");
    const locationRows = [];
    const seenLocations = new Set();

    function addLocationToBatch(whKey, rawLoc, source) {
      if (!rawLoc) return;
      const key = `${whKey}:${rawLoc.toLowerCase()}`;
      if (seenLocations.has(key)) return;
      seenLocations.add(key);

      const whId = warehouseIdMap.get(whKey);
      let floor = null;
      const cleanLoc = rawLoc.toLowerCase();
      if (cleanLoc.includes("ชั้น1") || cleanLoc.includes("-1f") || cleanLoc.includes("/1f") || cleanLoc.includes("1w")) floor = "1";
      else if (cleanLoc.includes("ชั้น2") || cleanLoc.includes("-2f") || cleanLoc.includes("/2f") || cleanLoc.includes("-2c")) floor = "2";
      else if (cleanLoc.includes("ชั้น3") || cleanLoc.includes("-3f") || cleanLoc.includes("/3f") || cleanLoc.includes("w1/3")) floor = "3";
      else if (cleanLoc.includes("ชั้น4") || cleanLoc.includes("-4f") || cleanLoc.includes("/4f") || cleanLoc.includes("f4")) floor = "4";

      locationRows.push({
        warehouse_id: whId,
        raw_location: rawLoc,
        floor: floor,
        source_app: source,
      });
    }

    data.poGR.rows.forEach((row) => {
      const loc = row["Loc_IN"]?.trim();
      if (loc) {
        let whKey = "w1";
        const upperLoc = loc.toUpperCase();
        if (upperLoc.startsWith("W2") || upperLoc.includes("W2")) whKey = "w2";
        else if (upperLoc.startsWith("W3") || upperLoc.includes("W3")) whKey = "w3";
        else if (upperLoc.startsWith("W4") || upperLoc.includes("W4")) whKey = "w4";
        else if (upperLoc.startsWith("W5") || upperLoc.includes("W5")) whKey = "w5";
        else if (upperLoc.startsWith("C1")) whKey = "c1";
        else if (upperLoc.startsWith("C2")) whKey = "c2";
        addLocationToBatch(whKey, loc, "po-pr-gr");
      }
    });

    data.trdProduct.rows.forEach((row) => {
      const floor = row["Floor"]?.trim();
      const location = row["Location"]?.trim();
      if (floor || location) {
        const locStr = [floor, location].filter(Boolean).join(" - ");
        addLocationToBatch("w1", locStr, "akra-trd");
      }
    });

    console.log(`Bulk inserting ${locationRows.length} locations...`);
    const insertedLocations = await bulkInsert(
      client,
      "public.warehouse_locations",
      ["warehouse_id", "raw_location", "floor", "source_app"],
      locationRows
    );
    const locationIdMap = new Map();
    insertedLocations.forEach((loc) => {
      const whKey = warehouses.find(w => warehouseIdMap.get(w.key) === loc.warehouse_id).key;
      locationIdMap.set(`${whKey}:${loc.raw_location.toLowerCase()}`, loc.id);
    });

    // 9. Bulk Insert Product Placement / Par configurations
    console.log("Preparing product par configurations...");
    const productLocationRows = [];
    data.trdProduct.rows.forEach((row) => {
      const code = row["Product code"]?.trim();
      const parLevel = row["Par Level"]?.trim();
      const floor = row["Floor"]?.trim();
      const location = row["Location"]?.trim();

      if (!code) return;
      const pId = productIdMap.get(code);
      if (!pId) return;

      let locId = null;
      if (floor || location) {
        const locStr = [floor, location].filter(Boolean).join(" - ");
        locId = locationIdMap.get(`w1:${locStr.toLowerCase()}`);
      }

      productLocationRows.push({
        product_id: pId,
        warehouse_id: warehouseIdMap.get("w1"),
        location_id: locId || null,
        location_role: "picking",
        par_level: parseFloat(parLevel) || 0,
        source_app: "akra-trd",
      });
    });
    console.log(`Bulk inserting ${productLocationRows.length} par configs...`);
    await bulkInsert(
      client,
      "public.warehouse_product_locations",
      ["product_id", "warehouse_id", "location_id", "location_role", "par_level", "source_app"],
      productLocationRows
    );

    // 10. Bulk Insert W5 Inventory Balances
    console.log("Preparing W5 inventory balances...");
    const balanceRows = [];
    data.w5Product.rows.forEach((row) => {
      const name = row["ชื่อสินค้า"]?.trim();
      const qty = row["จำนวน"]?.trim();
      const unit = row["หน่วย"]?.trim();
      if (!name) return;

      const pId = productByNameKeyMap.get(toNameKey(name));
      balanceRows.push({
        product_id: pId || null,
        warehouse_id: warehouseIdMap.get("w5"),
        qty_on_hand: parseFloat(qty) || 0,
        unit: unit || "กระสอบ",
        source_name: name,
        source_app: "akra-w5",
        as_of: "2026-06-19T00:00:00+07:00",
      });
    });
    console.log(`Bulk inserting ${balanceRows.length} inventory balances...`);
    await bulkInsert(
      client,
      "public.warehouse_inventory_balances",
      ["product_id", "warehouse_id", "qty_on_hand", "unit", "source_name", "source_app", "as_of"],
      balanceRows
    );

    // 11. Bulk Insert Stock Movements
    console.log("Preparing stock movements...");
    const movementRows = [];

    data.w5History.rows.forEach((row) => {
      const name = row["ProductName"]?.trim();
      const dateStr = row["Date"]?.trim();
      const timeStr = row["Time"]?.trim();
      const type = row["Type"]?.trim()?.toLowerCase();
      const qty = row["Qty"]?.trim();
      const user = row["User"]?.trim();

      if (!name) return;
      const pId = productByNameKeyMap.get(toNameKey(name));
      const occurred = parseBangkokDate(timeStr ? `${dateStr} ${timeStr}` : dateStr);

      movementRows.push({
        product_id: pId || null,
        warehouse_id: warehouseIdMap.get("w5"),
        movement_type: type || "adjust",
        qty: parseFloat(qty) || 0,
        unit: "กระสอบ",
        occurred_at: occurred,
        actor_name: user || null,
        source_app: "akra-w5",
        source_name: name,
        metadata: {},
      });
    });

    data.trdW1.rows.forEach((row) => {
      const legacyId = row["ID"]?.trim();
      const timeStr = row["เวลา"]?.trim();
      const name = row["ชื่อสินค้า"]?.trim();
      const qty = row["จำนวนเบิก"]?.trim();
      const status = row["สถานะ"]?.trim();
      const notes = row["หมายเหตุ"]?.trim();

      if (!name) return;
      const pId = productByNameKeyMap.get(toNameKey(name));
      const occurred = parseBangkokDate(timeStr);

      movementRows.push({
        product_id: pId || null,
        warehouse_id: warehouseIdMap.get("w1"),
        movement_type: "request",
        qty: parseFloat(qty) || 0,
        unit: "ลัง",
        occurred_at: occurred,
        actor_name: null,
        source_app: "akra-trd",
        legacy_id: legacyId || null,
        source_name: name,
        metadata: { status, notes },
      });
    });

    console.log(`Bulk inserting ${movementRows.length} stock movements...`);
    await bulkInsert(
      client,
      "public.warehouse_stock_movements",
      ["product_id", "warehouse_id", "movement_type", "qty", "unit", "occurred_at", "actor_name", "source_app", "legacy_id", "source_name", "metadata"],
      movementRows
    );

    await client.query("commit");
    console.log("Import completed successfully!");
  } catch (err) {
    await client.query("rollback");
    console.error("Rollback due to error during import apply:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
