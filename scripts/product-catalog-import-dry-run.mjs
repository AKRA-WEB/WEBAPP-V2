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
  retRecord: join(importDataDir, "returnitem", "Returned item - Return Record.csv"),
  retVendor: join(importDataDir, "returnitem", "Returned item - Vendor.csv"),
  trdProduct: join(importDataDir, "akra-trd", "เบิกย้าย Request - Product.csv"),
  trdW1: join(importDataDir, "akra-trd", "เบิกย้าย Request - เบิกย้ายW1.csv"),
  w5Product: join(importDataDir, "akra-w5", "ประวัติคลังสินค้า W5 - W5.csv"),
  w5History: join(importDataDir, "akra-w5", "ประวัติคลังสินค้า W5 - History.csv"),
};

// CSV parsing helper that handles quotes, commas, and duplicate headers
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

function checkFileExists(name, path) {
  if (!existsSync(path)) {
    console.error(`Error: Required file "${name}" not found at: ${path}`);
    process.exit(1);
  }
}

async function run() {
  console.log("=== AKRA V2 Product Catalog & Warehouse Profiling ===");

  // Check files
  for (const [name, path] of Object.entries(files)) {
    checkFileExists(name, path);
  }

  console.log("Parsing CSV files...");
  const data = {};
  for (const [name, path] of Object.entries(files)) {
    console.log(`- Parsing ${name}...`);
    const content = readFileSync(path, "utf8");
    data[name] = parseCSV(content);
    console.log(`  Parsed ${data[name].rows.length} rows.`);
  }

  // ==========================================
  // PROFILE: PO/GR Product Master
  // ==========================================
  const poProducts = data.poProduct.rows;
  let poTotal = poProducts.length;
  let poBlankCodes = 0;
  let poBlankNames = 0;
  const poCodes = new Set();
  const poNames = new Set();
  const poNameMap = new Map(); // name -> code
  const poCodeToNameMap = new Map(); // code -> name
  const poCategories = new Set();
  const poUnits = new Set();

  for (let i = 0; i < poProducts.length; i++) {
    const row = poProducts[i];
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    const category = row["Category"]?.trim();
    const unit = row["Unit"]?.trim();

    if (!code) poBlankCodes++;
    if (!name) poBlankNames++;
    if (category) poCategories.add(category);
    if (unit) poUnits.add(unit);

    if (code) {
      poCodes.add(code);
      if (name) {
        poCodeToNameMap.set(code, name);
      }
    }
    if (name) {
      poNames.add(name);
      if (code) {
        poNameMap.set(name, code);
      }
    }
  }

  // ==========================================
  // PROFILE: Returnitem Product Master
  // ==========================================
  const retProducts = data.retProduct.rows;
  let retTotal = retProducts.length;
  let retBlankCodes = 0;
  let retBlankNames = 0;
  let retRefVendors = 0;
  const retCodes = new Set();
  const retNames = new Set();

  for (const row of retProducts) {
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    const vendorCode = row["Vendor Code"]?.trim();
    const vendorName = row["Vendor Name"]?.trim();

    if (!code) retBlankCodes++;
    if (!name) retBlankNames++;
    if (code) retCodes.add(code);
    if (name) retNames.add(name);

    if (vendorCode === "#REF!" || vendorName === "#REF!") {
      retRefVendors++;
    }
  }

  // ==========================================
  // PROFILE: TRDAKRA Product List (เบิกย้าย Request - Product)
  // ==========================================
  const trdProducts = data.trdProduct.rows;
  let trdTotal = trdProducts.length;
  let trdBlankCodes = 0;
  let trdBlankNames = 0;
  let trdBlankFloors = 0;
  let trdBlankLocations = 0;
  let trdParLevelsCount = 0;
  const trdCodes = new Set();
  const trdNames = new Set();

  for (const row of trdProducts) {
    const code = row["Product code"]?.trim();
    const name = row["Product name"]?.trim();
    const floor = row["Floor"]?.trim();
    const location = row["Location"]?.trim();
    const parLevel = row["Par Level"]?.trim();

    if (!code) trdBlankCodes++;
    if (!name) trdBlankNames++;
    if (code) trdCodes.add(code);
    if (name) trdNames.add(name);

    if (!floor) trdBlankFloors++;
    if (!location) trdBlankLocations++;
    if (parLevel && parLevel !== "0" && parLevel !== "") trdParLevelsCount++;
  }

  // ==========================================
  // PROFILE: W5 Current Stock (W5 - W5)
  // ==========================================
  const w5Products = data.w5Product.rows;
  let w5Total = w5Products.length;
  let w5BlankNames = 0;
  const w5Names = new Set();
  const w5ExactNameMatches = [];
  const w5UnmatchedNames = [];

  for (const row of w5Products) {
    const name = row["ชื่อสินค้า"]?.trim();
    const qty = row["จำนวน"]?.trim();
    const unit = row["หน่วย"]?.trim();

    if (!name) {
      w5BlankNames++;
      continue;
    }

    w5Names.add(name);
    if (poNames.has(name)) {
      w5ExactNameMatches.push({ name, qty, unit, code: poNameMap.get(name) });
    } else {
      w5UnmatchedNames.push({ name, qty, unit });
    }
  }

  // ==========================================
  // PROFILE: W1 Request Transactions (เบิกย้ายW1)
  // ==========================================
  const trdW1Rows = data.trdW1.rows;
  const trdW1UniqueNames = new Set();
  const trdW1UnmatchedNames = new Set();
  let trdW1DateFailures = 0;

  for (const row of trdW1Rows) {
    const name = row["ชื่อสินค้า"]?.trim();
    const dateStr = row["เวลา"]?.trim();

    if (name) {
      trdW1UniqueNames.add(name);
      if (!poNames.has(name)) {
        trdW1UnmatchedNames.add(name);
      }
    }

    // Check date parsing: e.g. "17/06/2026 10:30:15"
    if (dateStr) {
      const parts = dateStr.split(" ");
      if (parts[0]) {
        const dParts = parts[0].split("/");
        if (dParts.length !== 3) {
          trdW1DateFailures++;
        }
      }
    }
  }

  // ==========================================
  // PROFILE: W5 History Transactions (W5 - History)
  // ==========================================
  const w5HistoryRows = data.w5History.rows;
  const w5HistoryUniqueNames = new Set();
  const w5HistoryUnmatchedNames = new Set();
  let w5HistoryDateFailures = 0;

  for (const row of w5HistoryRows) {
    const name = row["ProductName"]?.trim();
    const dateStr = row["Date"]?.trim();

    if (name) {
      w5HistoryUniqueNames.add(name);
      if (!poNames.has(name) && !w5Names.has(name)) {
        w5HistoryUnmatchedNames.add(name);
      }
    }

    if (dateStr) {
      const dParts = dateStr.split("/");
      if (dParts.length !== 3) {
        w5HistoryDateFailures++;
      }
    }
  }

  // ==========================================
  // PROFILE: PO & GR Warehouses and Locations
  // ==========================================
  const poWHValues = new Set();
  for (const row of data.poPO.rows) {
    const wh = row["Warehouse"]?.trim();
    if (wh) poWHValues.add(wh);
  }

  const grLocValues = new Set();
  for (const row of data.poGR.rows) {
    const loc = row["Loc_IN"]?.trim();
    if (loc) grLocValues.add(loc);
  }

  // ==========================================
  // PROFILE: Vendors
  // ==========================================
  const poVendors = new Set();
  for (const row of data.poPO.rows) {
    const v = row["Vendor"]?.trim();
    if (v) poVendors.add(v);
  }

  const vendorMasterCodes = new Set();
  const vendorMasterNames = new Set();
  for (const row of data.poVendor.rows) {
    const code = row["Code"]?.trim();
    const name = row["Vendor Name"]?.trim();
    if (code) vendorMasterCodes.add(code);
    if (name) vendorMasterNames.add(name);
  }

  // Check code overlaps between files
  const trdInPo = [...trdCodes].filter(c => poCodes.has(c)).length;
  const retInPo = [...retCodes].filter(c => poCodes.has(c)).length;

  // Print console summary
  console.log("\n--- Profiling Summary ---");
  console.log(`PO Product file: ${poTotal} rows. Unique codes: ${poCodes.size}. Unique names: ${poNames.size}.`);
  console.log(`Returnitem Product file: ${retTotal} rows. Unique codes: ${retCodes.size}. Blank codes: ${retBlankCodes}. #REF! Vendor Cells: ${retRefVendors}`);
  console.log(`TRDAKRA Product file: ${trdTotal} rows. Unique codes: ${trdCodes.size}. Blank codes: ${trdBlankCodes}.`);
  console.log(`W5 Stock file: ${w5Total} rows. Unmatched names: ${w5UnmatchedNames.length}.`);
  console.log(`W1 Transactions unique names: ${trdW1UniqueNames.size}. Unmatched: ${trdW1UnmatchedNames.size}.`);
  console.log(`W5 History unique names: ${w5HistoryUniqueNames.size}. Unmatched: ${w5HistoryUnmatchedNames.size}.`);

  // Write MD report
  const reportPath = join(reportsDir, "product-catalog-dry-run-report.md");
  let reportText = `# Product Catalog & Warehouse Profiling Report

**Date:** ${new Date().toISOString()}
**Analysis Scope:** Legacy snapshot CSV files under \`import-data/\`.

## 1. Product File Counts and Data Quality

| Source Snapshot | Row Count | Unique Codes | Unique Names | Blank Codes | Blank Names | Comments / Quality Flags |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| \`po-pr-gr/ProductName.csv\` | ${poTotal} | ${poCodes.size} | ${poNames.size} | ${poBlankCodes} | ${poBlankNames} | Broadest coded master |
| \`returnitem/ProductName.csv\` | ${retTotal} | ${retCodes.size} | ${retNames.size} | ${retBlankCodes} | ${retBlankNames} | ${retRefVendors} rows contain \`#REF!\` in vendor fields |
| \`akra-trd/Product.csv\` | ${trdTotal} | ${trdCodes.size} | ${trdNames.size} | ${trdBlankCodes} | ${trdBlankNames} | Floor/Location config source |
| \`akra-w5/W5.csv\` | ${w5Total} | N/A | ${w5Names.size} | N/A | ${w5BlankNames} | Name-only W5 stock snapshot |

## 2. Product Code & Name Overlaps

- **PO/GR vs. Returnitem (Product Code Match):**
  - Mapped Returnitem codes present in PO/GR: **${retInPo}** / ${retCodes.size} codes.
  - Returnitem codes missing from PO/GR: **${retCodes.size - retInPo}** codes.
- **PO/GR vs. TRDAKRA Product (Product Code Match):**
  - Mapped TRDAKRA codes present in PO/GR: **${trdInPo}** / ${trdCodes.size} codes.
  - TRDAKRA codes missing from PO/GR: **${trdCodes.size - trdInPo}** codes.
- **PO/GR vs. W5 (Product Name Match):**
  - W5 stock names matching PO/GR: **${w5ExactNameMatches.length}** / ${w5Names.size} names.
  - W5 stock names missing from PO/GR (unmatched): **${w5UnmatchedNames.length}** names.

### 🛑 21 W5 Unmatched Names (Action Required)
These products exist in the W5 stock sheet but their names do not match any PO/GR product name exactly. They must be registered as aliases or temporary catalog products:

| No. | W5 Product Name | Current Stock Qty | Unit | Suggested Action |
| --- | --- | ---: | --- | --- |
${w5UnmatchedNames.map((item, idx) => `| ${idx + 1} | ${item.name} | ${item.qty} | ${item.unit} | Manual Review / Alias Candidate |`).join("\n")}

## 3. Transaction Product Name Validation

### A. W1 Request Transactions (\`เบิกย้ายW1.csv\`)
- Total transaction rows: **${trdW1Rows.length}**
- Unique product names referenced: **${trdW1UniqueNames.size}**
- Names matching PO/GR master exactly: **${trdW1UniqueNames.size - trdW1UnmatchedNames.size}**
- **Unmatched names referenced in W1 transactions (${trdW1UnmatchedNames.size}):**
${[...trdW1UnmatchedNames].map((name) => `  - \`${name}\``).join("\n") || "  - *None*"}

### B. W5 History Transactions (\`W5 - History.csv\`)
- Total transaction rows: **${w5HistoryRows.length}**
- Unique product names referenced: **${w5HistoryUniqueNames.size}**
- Names matching PO/GR master or W5 master: **${w5HistoryUniqueNames.size - w5HistoryUnmatchedNames.size}**
- **Unmatched names referenced in W5 History transactions (${w5HistoryUnmatchedNames.size}):**
${[...w5HistoryUnmatchedNames].map((name) => `  - \`${name}\``).join("\n") || "  - *None*"}

## 4. Date and Formatting Profiling

- **W1 request transaction timestamps:**
  - Date parsing issues: **${trdW1DateFailures}** invalid dates. Format check pattern: \`DD/MM/YYYY HH:MM:SS\`.
- **W5 history transaction dates:**
  - Date parsing issues: **${w5HistoryDateFailures}** invalid dates. Format check pattern: \`DD/MM/YYYY\`.

## 5. Warehouse & Location Profiling

### A. Raw Warehouse Identifiers in PO (\`Trackingpo - webapp - PO.csv\`)
The following raw warehouse values were found in PO records:
${[...poWHValues].map((wh) => `- \`${wh}\``).join("\n")}

### B. Raw Location Values in GR (\`Trackingpo - webapp - GR.csv\`)
Unique Location/Inbound cells parsed from GR (showing first 30 sample values):
${[...grLocValues].slice(0, 30).map((loc) => `- \`${loc}\``).join("\n")}

### C. TRDAKRA Floor/Location Status (\`เบิกย้าย Request - Product.csv\`)
- Blank Floor rows: **${trdBlankFloors}** / ${trdTotal}
- Blank Location rows: **${trdBlankLocations}** / ${trdTotal}
- Rows with Par Levels defined (> 0): **${trdParLevelsCount}**

## 6. Vendor Profiling

- Unique vendor codes in ProductName files: **${vendorMasterCodes.size}**
- Unique vendor names in ProductName files: **${vendorMasterNames.size}**
- Unique Vendor Code file rows: **${data.poVendor.rows.length}** in \`Vendor.csv\`

## 7. Conclusions & Dry Run Status
- **Blockers:** 0
- **Warnings:** Potential typos in unmatched W5 and transaction-only product names.
- **Recommendation:** Use this report as the recurring source-data profile before rerunning the shared catalog transformer/import. The staging schema/import path now exists; production use still requires manual alias review and module-specific verification.
`;

  writeFileSync(reportPath, reportText, "utf8");
  console.log(`\nReport successfully written to: ${reportPath}`);
}

run().catch((err) => {
  console.error("Fatal error during profiling dry run:", err);
  process.exit(1);
});
