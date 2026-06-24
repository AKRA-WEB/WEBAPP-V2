import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  parseCSV,
  toNameKey,
  parseV1Date,
  classifyDateField,
  billGroupKey,
  classifyRefPrUid,
  LIFT_FEE_CURRENT_RE,
  LIFT_FEE_LEGACY_RE,
  EXTRA_ITEM_TAG,
  readDatabaseUrl as readDatabaseUrlFromRoot,
  KNOWN_WAREHOUSE_KEYS,
} from "./lib/pr-po-gr-parsing.mjs";

const { Client } = pg;
const root = process.cwd();
const importDataDir = join(root, "import-data", "po-pr-gr");
const reportsDir = join(root, "import-reports");

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}

const files = {
  po: join(importDataDir, "Trackingpo - webapp - PO.csv"),
  gr: join(importDataDir, "Trackingpo - webapp - GR.csv"),
  product: join(importDataDir, "Trackingpo - webapp - ProductName.csv"),
  vendor: join(importDataDir, "Trackingpo - webapp - Vendor.csv"),
};

// PR CSV is optional for this dry-run. A missing or empty PR source does not
// block PO/GR profiling; it means PR-derived PO rows can only be reported as
// unverifiable/manual-review until source PR rows exist.
const prCsvPath = join(importDataDir, "Trackingpo - webapp - PR.csv");

function readDatabaseUrl() {
  return readDatabaseUrlFromRoot(root);
}

function checkFileExists(name, path) {
  if (!existsSync(path)) {
    console.error(`Error: required file "${name}" not found at: ${path}`);
    process.exit(1);
  }
}

async function run() {
  console.log("=== AKRA V2 PR/PO/GR Foundation Dry Run (read-only) ===");

  for (const [name, path] of Object.entries(files)) {
    checkFileExists(name, path);
  }
  const prCsvExists = existsSync(prCsvPath);

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  console.log("Parsing CSV files...");
  const data = {};
  for (const [name, path] of Object.entries(files)) {
    data[name] = parseCSV(readFileSync(path, "utf8"));
    console.log(`- ${name}: ${data[name].rows.length} rows`);
  }

  // PR is optional. When absent or genuinely empty, PR-side counts stay zero
  // and PR -> PO coverage is reported as unverifiable rather than as a false
  // orphan/mismatch.
  const prData = prCsvExists ? parseCSV(readFileSync(prCsvPath, "utf8")) : { headers: [], rows: [] };
  console.log(`- pr: ${prData.rows.length} rows${prCsvExists ? "" : " (no CSV export found)"}`);

  const poRows = data.po.rows;
  const grRows = data.gr.rows;
  const productRows = data.product.rows;
  const vendorRows = data.vendor.rows;

  // ==========================================
  // PO profiling
  // ==========================================
  const poUidSeen = new Set();
  let poDuplicateUid = 0;
  let poBlankUid = 0;
  let poBlankSku = 0;
  let poBlankProduct = 0;
  let poDateFailures = 0;
  const poStatusCounts = new Map();
  const poByUid = new Map();
  const refClassCounts = new Map();
  const billGroups = new Map(); // key -> { refClass, rows: [] }
  const poVendorNames = new Set();
  const poWarehouseValues = new Map(); // value -> count
  const poSkuValues = new Set();

  for (const row of poRows) {
    const uid = (row["PO_UID"] || "").trim();
    if (!uid) poBlankUid++;
    else if (poUidSeen.has(uid)) poDuplicateUid++;
    else poUidSeen.add(uid);

    if (uid) poByUid.set(uid, row);

    const sku = (row["SKU"] || "").trim();
    const product = (row["Product"] || "").trim();
    if (!sku) poBlankSku++;
    if (!product) poBlankProduct++;
    if (sku) poSkuValues.add(sku);

    const status = (row["Status"] || "(blank)").trim() || "(blank)";
    poStatusCounts.set(status, (poStatusCounts.get(status) || 0) + 1);

    if (!parseV1Date(row["PO_Date"])) poDateFailures++;

    const vendor = (row["Vendor"] || "").trim();
    if (vendor) poVendorNames.add(vendor);

    const wh = (row["Warehouse"] || "").trim();
    poWarehouseValues.set(wh, (poWarehouseValues.get(wh) || 0) + 1);

    const refClass = classifyRefPrUid(row["Ref_PR_UID"]);
    refClassCounts.set(refClass, (refClassCounts.get(refClass) || 0) + 1);

    const key = billGroupKey(row);
    if (!billGroups.has(key)) billGroups.set(key, { refClass, rows: [] });
    billGroups.get(key).rows.push(row);
  }

  const bareDirectGroups = [...billGroups.entries()].filter(([, g]) => g.refClass === "direct_legacy_bare");
  const stableDirectGroups = [...billGroups.entries()].filter(([, g]) => g.refClass === "direct_stable");
  const prDerivedGroups = [...billGroups.entries()].filter(([, g]) => g.refClass === "pr_derived");
  const largestBareDirectGroups = bareDirectGroups
    .slice()
    .sort((a, b) => b[1].rows.length - a[1].rows.length)
    .slice(0, 5);

  const unexpectedWarehouseValues = [...poWarehouseValues.entries()].filter(
    ([wh]) => wh && !KNOWN_WAREHOUSE_KEYS.has(wh.trim().toLowerCase()),
  );

  // ==========================================
  // PR profiling
  // ==========================================
  const prRows = prData.rows;
  const prUidSeen = new Set();
  let prDuplicateUid = 0;
  let prBlankUid = 0;
  const prStatusCounts = new Map();

  for (const row of prRows) {
    const uid = (row["PR_UID"] || "").trim();
    if (!uid) prBlankUid++;
    else if (prUidSeen.has(uid)) prDuplicateUid++;
    else prUidSeen.add(uid);

    const status = (row["Status"] || "(blank)").trim() || "(blank)";
    prStatusCounts.set(status, (prStatusCounts.get(status) || 0) + 1);
  }

  // ==========================================
  // PR -> PO reconciliation
  // ==========================================
  // Only PO rows classified pr_derived (a real, non-DIRECT Ref_PR_UID) are
  // expected to match a PR row. Direct POs (DIRECT / DIRECT-<uuid>) never
  // require a PR match by design. An empty PR CSV is treated the same as a
  // missing file for matching purposes: there is no PR row data to check
  // against, so every pr_derived ref is "unverifiable", not a false
  // "genuinely unmatched" blocker.
  const prSourceHasRows = prRows.length > 0;
  let prPoMatched = 0;
  let prPoUnmatchedVerifiable = 0; // PR source has real rows, ref genuinely not found
  let prPoUnverifiable = 0; // no usable PR source (missing or empty) to check against
  const prPoUnmatchedSamples = [];

  for (const [, group] of prDerivedGroups) {
    for (const row of group.rows) {
      const ref = (row["Ref_PR_UID"] || "").trim();
      if (!prSourceHasRows) {
        prPoUnverifiable++;
      } else if (prUidSeen.has(ref)) {
        prPoMatched++;
      } else {
        prPoUnmatchedVerifiable++;
        if (prPoUnmatchedSamples.length < 10) {
          prPoUnmatchedSamples.push({ poUid: row["PO_UID"] || "(blank)", ref });
        }
      }
    }
  }

  // ==========================================
  // GR profiling
  // ==========================================
  const grUidSeen = new Set();
  let grDuplicateUid = 0;
  let grBlankUid = 0;
  let grOrphanRefPo = 0;
  let grDateFailures = 0;
  let grDatePlaceholderDash = 0;
  let grDateEpochArtifact = 0;
  const grStatusCounts = new Map();
  let splitLocationCount = 0;
  const splitLocationSamples = [];
  let liftFeeCount = 0;
  let liftFeeOnNonW2 = 0;
  const liftFeeNonW2Samples = [];
  let extraItemTagCount = 0;

  for (const row of grRows) {
    const uid = (row["GR_UID"] || "").trim();
    if (!uid) grBlankUid++;
    else if (grUidSeen.has(uid)) grDuplicateUid++;
    else grUidSeen.add(uid);

    const refPoUid = (row["Ref_PO_UID"] || "").trim();
    if (refPoUid && !poByUid.has(refPoUid)) grOrphanRefPo++;

    const status = (row["Status"] || "(blank)").trim() || "(blank)";
    grStatusCounts.set(status, (grStatusCounts.get(status) || 0) + 1);

    for (const field of ["GR_Date", "ATA", "Exp_Date"]) {
      const classification = classifyDateField(row[field]);
      if (classification === "placeholder_dash") grDatePlaceholderDash++;
      else if (classification === "epoch_artifact") grDateEpochArtifact++;
      else if (classification === "malformed") grDateFailures++;
    }

    const locIn = row["Loc_IN"] || "";
    if (locIn.includes("|")) {
      splitLocationCount++;
      if (splitLocationSamples.length < 10) splitLocationSamples.push(locIn);
    }

    const remark = row["Remark"] || "";
    const liftMatch = remark.match(LIFT_FEE_CURRENT_RE) || remark.match(LIFT_FEE_LEGACY_RE);
    if (liftMatch) {
      liftFeeCount++;
      const poWarehouse = (poByUid.get(refPoUid)?.["Warehouse"] || "").trim().toLowerCase();
      if (poWarehouse !== "w2") {
        liftFeeOnNonW2++;
        if (liftFeeNonW2Samples.length < 5) {
          liftFeeNonW2Samples.push({ grUid: uid, poWarehouse: poWarehouse || "(unknown/orphan)", remark });
        }
      }
    }
    if (remark.includes(EXTRA_ITEM_TAG)) extraItemTagCount++;
  }

  // ==========================================
  // PO -> GR line coverage
  // ==========================================
  // Does not depend on PR data: every PO line either has at least one GR
  // row referencing it via Ref_PO_UID, or it doesn't yet.
  const poUidsWithGr = new Set();
  for (const row of grRows) {
    const refPoUid = (row["Ref_PO_UID"] || "").trim();
    if (refPoUid) poUidsWithGr.add(refPoUid);
  }
  const poLinesCoveredByGr = [...poByUid.keys()].filter((uid) => poUidsWithGr.has(uid)).length;
  const poLinesCoveragePercent =
    poByUid.size > 0 ? ((poLinesCoveredByGr / poByUid.size) * 100).toFixed(1) : "0.0";

  // ==========================================
  // ProductName / Vendor master profiling
  // ==========================================
  let productBlankCode = 0;
  let productBlankName = 0;
  const productSeenCodes = new Set();
  let productDuplicateCodes = 0;
  const productCodeSet = new Set();
  const productVendorCodes = new Set();

  for (const row of productRows) {
    const code = (row["Product code"] || "").trim();
    const name = (row["Product name"] || "").trim();
    if (!code) productBlankCode++;
    if (!name) productBlankName++;
    if (code) {
      if (productSeenCodes.has(code)) productDuplicateCodes++;
      productSeenCodes.add(code);
      productCodeSet.add(code);
    }
    const vendorCode = (row["Vendor Code"] || "").trim();
    if (vendorCode) productVendorCodes.add(vendorCode);
  }

  let vendorBlankCode = 0;
  const vendorSeenCodes = new Set();
  let vendorDuplicateCodes = 0;
  const vendorNameSet = new Set();
  const vendorCodeByName = new Map();

  for (const row of vendorRows) {
    const code = (row["Code"] || "").trim();
    const name = (row["Vendor Name"] || "").trim();
    if (!code) vendorBlankCode++;
    if (code) {
      if (vendorSeenCodes.has(code)) vendorDuplicateCodes++;
      vendorSeenCodes.add(code);
    }
    if (name) {
      vendorNameSet.add(name);
      vendorCodeByName.set(name, code);
    }
  }

  // PO.Vendor (free-text name) vs Vendor.csv "Vendor Name"
  const unmatchedPoVendorNames = [...poVendorNames].filter((v) => !vendorNameSet.has(v));

  // PO.SKU vs ProductName.csv "Product code"
  const unmatchedPoSkus = [...poSkuValues].filter((sku) => !productCodeSet.has(sku));

  const productVendorCodesMissingFromVendorFile = [...productVendorCodes].filter((c) => !vendorSeenCodes.has(c));

  // ==========================================
  // DB cross-reference (read-only, staging catalog/warehouse baseline)
  // ==========================================
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let catalogCodeMap = new Map();
  let catalogNameKeyMap = new Map();
  let catalogVendorKeys = new Set();
  let dbWarehouseKeys = new Set();

  try {
    const catalogResult = await client.query("select id, canonical_code, name_key from public.catalog_products");
    for (const row of catalogResult.rows) {
      if (row.canonical_code) catalogCodeMap.set(row.canonical_code, row.id);
      if (!catalogNameKeyMap.has(row.name_key)) catalogNameKeyMap.set(row.name_key, row.id);
    }

    const vendorResult = await client.query("select vendor_key from public.catalog_vendors");
    catalogVendorKeys = new Set(vendorResult.rows.map((r) => r.vendor_key));

    const warehouseResult = await client.query("select warehouse_key from public.warehouse_warehouses");
    dbWarehouseKeys = new Set(warehouseResult.rows.map((r) => r.warehouse_key));
  } finally {
    await client.end().catch(() => {});
  }

  let poSkuMatchedByCode = 0;
  let poSkuMatchedByName = 0;
  const poManualReviewProducts = [];
  for (const row of poRows) {
    const sku = (row["SKU"] || "").trim();
    const product = (row["Product"] || "").trim();
    if (!product) continue;
    const nameKey = toNameKey(product);
    if (sku && catalogCodeMap.has(sku)) {
      poSkuMatchedByCode++;
    } else if (catalogNameKeyMap.has(nameKey)) {
      poSkuMatchedByName++;
    } else {
      poManualReviewProducts.push({ sku: sku || "(blank)", product });
    }
  }
  const dedupedManualReview = [...new Map(poManualReviewProducts.map((r) => [`${r.sku}|${r.product}`, r])).values()];

  const matchedVendorCodes = [...new Set([...poVendorNames].map((n) => vendorCodeByName.get(n)).filter(Boolean))];
  const vendorKeysFromPo = matchedVendorCodes.map((c) => c.toLowerCase());
  const poVendorsMatchedInDb = vendorKeysFromPo.filter((k) => catalogVendorKeys.has(k)).length;

  const poWarehouseKeysUsed = [...poWarehouseValues.keys()].filter(Boolean).map((w) => w.trim().toLowerCase());
  const poWarehousesMissingFromDb = poWarehouseKeysUsed.filter((w) => !dbWarehouseKeys.has(w));

  // ==========================================
  // Blockers / warnings
  // ==========================================
  const blockers = [];
  if (poBlankUid > 0) blockers.push(`${poBlankUid} PO row(s) have a blank PO_UID.`);
  if (poDuplicateUid > 0) blockers.push(`${poDuplicateUid} PO row(s) reuse an existing PO_UID.`);
  if (grBlankUid > 0) blockers.push(`${grBlankUid} GR row(s) have a blank GR_UID.`);
  if (grDuplicateUid > 0) blockers.push(`${grDuplicateUid} GR row(s) reuse an existing GR_UID.`);
  if (prSourceHasRows && prBlankUid > 0) blockers.push(`${prBlankUid} PR row(s) have a blank PR_UID.`);
  if (prSourceHasRows && prDuplicateUid > 0) blockers.push(`${prDuplicateUid} PR row(s) reuse an existing PR_UID.`);
  if (prSourceHasRows && prPoUnmatchedVerifiable > 0) {
    blockers.push(
      `${prPoUnmatchedVerifiable} PO row(s) reference a Ref_PR_UID not found in the PR source (real orphan PR linkage, not a missing-export issue).`,
    );
  }

  const warnings = [];
  if (!prSourceHasRows) {
    warnings.push(
      prCsvExists
        ? "PR CSV exists with 0 data rows. Treating the PR source as currently empty; PR-row import would import zero PR rows, and PR -> PO coverage cannot be verified from PR rows."
        : "No PR CSV export found (`Trackingpo - webapp - PR.csv`). The live V1 `PR` sheet exists (see docs/migration/pr-po-gr-v1-mapping.md) but was never exported into this snapshot; PR-row import needs a fresh export first.",
    );
  }
  if (prPoUnverifiable > 0) {
    warnings.push(
      `${prPoUnverifiable} PO row(s) reference a real PR_UID via Ref_PR_UID across ${prDerivedGroups.length} bill group(s), but PR -> PO coverage cannot be verified because the PR source has zero usable rows. Treat these as manual-review rows before import/cutover decisions.`,
    );
  }
  if (poByUid.size > 0 && poLinesCoveredByGr < poByUid.size) {
    warnings.push(
      `${poByUid.size - poLinesCoveredByGr} of ${poByUid.size} PO line(s) (${(100 - Number(poLinesCoveragePercent)).toFixed(1)}%) have no GR row referencing them yet via Ref_PO_UID — expected for open/pending POs, not necessarily a data issue.`,
    );
  }
  if (poDateFailures > 0) warnings.push(`${poDateFailures} PO row(s) failed PO_Date parsing.`);
  if (grDateFailures > 0) warnings.push(`${grDateFailures} GR date field(s) (GR_Date/ATA/Exp_Date) are genuinely malformed (excludes the "-" placeholder and pre-1980 epoch-zero artifacts, tallied separately).`);
  if (grDateEpochArtifact > 0) warnings.push(`${grDateEpochArtifact} GR date field(s) are pre-1980 epoch-zero export artifacts (treat as null on import, not a real date).`);
  if (grOrphanRefPo > 0) warnings.push(`${grOrphanRefPo} GR row(s) reference a Ref_PO_UID not found in PO.csv.`);
  if (bareDirectGroups.length > 0) {
    warnings.push(
      `${bareDirectGroups.length} bill group(s) use the legacy bare "DIRECT" ref (ambiguous grouping); largest has ${largestBareDirectGroups[0]?.[1].rows.length ?? 0} line row(s). Do not reuse this fallback key for new V2 writes.`,
    );
  }
  if (unexpectedWarehouseValues.length > 0) {
    warnings.push(
      `${unexpectedWarehouseValues.length} unexpected raw Warehouse value(s) in PO.csv not in {w1,w2,w3,w4,w5,c1,c2}: ${unexpectedWarehouseValues.map(([w, c]) => `"${w}" (${c})`).join(", ")}.`,
    );
  }
  if (poWarehousesMissingFromDb.length > 0) {
    warnings.push(`PO warehouse value(s) not yet in staging \`warehouse_warehouses\`: ${poWarehousesMissingFromDb.join(", ")}.`);
  }
  if (unmatchedPoVendorNames.length > 0) {
    warnings.push(`${unmatchedPoVendorNames.length} vendor name(s) referenced in PO.csv have no exact match in Vendor.csv.`);
  }
  if (unmatchedPoSkus.length > 0) {
    warnings.push(`${unmatchedPoSkus.length} non-blank PO.SKU value(s) have no match in ProductName.csv "Product code".`);
  }
  if (dedupedManualReview.length > 0) {
    warnings.push(`${dedupedManualReview.length} distinct PO product row(s) need manual review against staging catalog_products (no code or exact-name match).`);
  }
  if (productVendorCodesMissingFromVendorFile.length > 0) {
    warnings.push(`${productVendorCodesMissingFromVendorFile.length} Vendor Code(s) in ProductName.csv are missing from Vendor.csv.`);
  }
  if (productDuplicateCodes > 0) warnings.push(`${productDuplicateCodes} duplicate Product code(s) within ProductName.csv.`);
  if (vendorDuplicateCodes > 0) warnings.push(`${vendorDuplicateCodes} duplicate Code(s) within Vendor.csv.`);
  if (liftFeeOnNonW2 > 0) {
    warnings.push(`${liftFeeOnNonW2} GR row(s) carry a lift-fee Remark tag while their PO's Warehouse is not W2 (V1 only renders this UI for W2).`);
  }

  // ==========================================
  // Report
  // ==========================================
  const reportPath = join(reportsDir, "pr-po-gr-dry-run-report.md");
  const reportText = `# PR/PO/GR Foundation Dry Run Report

Date: ${new Date().toISOString()}
Source files: \`import-data/po-pr-gr/Trackingpo - webapp - {PO,GR,ProductName,Vendor}.csv\`
PR source: ${
    prSourceHasRows
      ? `CSV export found, ${prRows.length} row(s)`
      : prCsvExists
        ? "**empty** — CSV exists with 0 data rows"
        : "**no CSV export found** — live V1 `PR` sheet only, see docs/migration/pr-po-gr-v1-mapping.md"
  }

## 1. File Row Counts

| File | Rows |
| --- | ---: |
| PR.csv | ${prRows.length}${prSourceHasRows ? "" : prCsvExists ? " (empty source)" : " (no export found)"} |
| PO.csv | ${poRows.length} |
| GR.csv | ${grRows.length} |
| ProductName.csv | ${productRows.length} |
| Vendor.csv | ${vendorRows.length} |

## 2. PO Profiling

| Metric | Count |
| --- | ---: |
| Total rows (line items) | ${poRows.length} |
| Blank PO_UID | ${poBlankUid} |
| Duplicate PO_UID | ${poDuplicateUid} |
| Blank SKU | ${poBlankSku} |
| Blank Product | ${poBlankProduct} |
| PO_Date parse failures | ${poDateFailures} |
| Distinct vendor names referenced | ${poVendorNames.size} |
| Distinct bill groups (V1 grouping key) | ${billGroups.size} |

### Status distribution

| Status | Count |
| --- | ---: |
${[...poStatusCounts.entries()].map(([s, c]) => `| ${s} | ${c} |`).join("\n")}

### Warehouse value distribution

| Raw Warehouse | Rows | In {w1..w5,c1,c2}? |
| --- | ---: | --- |
${[...poWarehouseValues.entries()].map(([w, c]) => `| ${w || "(blank)"} | ${c} | ${w && KNOWN_WAREHOUSE_KEYS.has(w.trim().toLowerCase()) ? "yes" : "no"} |`).join("\n")}

### Direct PO / Ref_PR_UID classification

| Classification | Line rows | Bill groups |
| --- | ---: | ---: |
| \`DIRECT\` (legacy bare, ambiguous grouping) | ${refClassCounts.get("direct_legacy_bare") || 0} | ${bareDirectGroups.length} |
| \`DIRECT-<uuid>\` (stable) | ${refClassCounts.get("direct_stable") || 0} | ${stableDirectGroups.length} |
| PR-derived (real PR UID) | ${refClassCounts.get("pr_derived") || 0} | ${prDerivedGroups.length} |
| Blank | ${refClassCounts.get("blank") || 0} | - |

#### Largest legacy-bare-\`DIRECT\` groups (manual review — possible false merge of unrelated Direct POs)

${
  largestBareDirectGroups.length > 0
    ? `| Bill group key | Line rows |\n| --- | ---: |\n${largestBareDirectGroups.map(([key, g]) => `| \`${key}\` | ${g.rows.length} |`).join("\n")}`
    : "No bare-`DIRECT` groups found."
}

## 3. PR Profiling

PR source: ${
    prSourceHasRows
      ? `CSV export found, ${prRows.length} row(s)`
      : prCsvExists
        ? "**empty** — CSV exists with 0 data rows, all counts below are necessarily zero"
        : "**no CSV export found**, all counts below are necessarily zero"
  }

| Metric | Count |
| --- | ---: |
| Total rows | ${prRows.length} |
| Blank PR_UID | ${prBlankUid} |
| Duplicate PR_UID | ${prDuplicateUid} |

### Status distribution

${
  prStatusCounts.size > 0
    ? `| Status | Count |\n| --- | ---: |\n${[...prStatusCounts.entries()].map(([s, c]) => `| ${s} | ${c} |`).join("\n")}`
    : "- No PR rows to classify."
}

## 4. PR -> PO Reconciliation

Only PO rows classified \`pr_derived\` (a real, non-\`DIRECT\` \`Ref_PR_UID\`) are
expected to match a PR row; Direct POs never require one.

| Metric | Count |
| --- | ---: |
| PO row(s) with a PR-derived Ref_PR_UID | ${refClassCounts.get("pr_derived") || 0} |
| ... matched to a PR_UID in the PR source | ${prPoMatched} |
| ... genuinely unmatched (PR source present, ref not found) | ${prPoUnmatchedVerifiable} |
| ... unverifiable (no PR source to check against) | ${prPoUnverifiable} |

${
  prPoUnmatchedSamples.length > 0
    ? `### Unmatched PR-derived PO rows (first 10, manual review)\n\n| PO_UID | Ref_PR_UID |\n| --- | --- |\n${prPoUnmatchedSamples.map((s) => `| ${s.poUid} | ${s.ref} |`).join("\n")}`
    : ""
}

## 5. GR Profiling

| Metric | Count |
| --- | ---: |
| Total rows | ${grRows.length} |
| Blank GR_UID | ${grBlankUid} |
| Duplicate GR_UID | ${grDuplicateUid} |
| Orphan Ref_PO_UID (no matching PO_UID) | ${grOrphanRefPo} |
| PO line(s) covered by at least one GR row | ${poLinesCoveredByGr} / ${poByUid.size} (${poLinesCoveragePercent}%) |
| Date fields genuinely malformed (GR_Date/ATA/Exp_Date) | ${grDateFailures} |
| Date fields using \`-\` "no date" placeholder | ${grDatePlaceholderDash} |
| Date fields with pre-1980 epoch-zero export artifact | ${grDateEpochArtifact} |
| Split-location rows (\`Loc_IN\` contains \`\\|\`) | ${splitLocationCount} |
| Lift-fee Remark tag rows | ${liftFeeCount} |
| Lift-fee tag rows where joined PO warehouse != W2 | ${liftFeeOnNonW2} |
| \`${EXTRA_ITEM_TAG}\` extra-item tag rows | ${extraItemTagCount} |

### Status distribution

| Status | Count |
| --- | ---: |
${[...grStatusCounts.entries()].map(([s, c]) => `| ${s} | ${c} |`).join("\n")}

### Split-location samples (first 10)

${splitLocationSamples.length > 0 ? splitLocationSamples.map((s) => `- \`${s}\``).join("\n") : "- None found."}

### Lift-fee tag rows on a non-W2 PO warehouse (first 5, manual review)

${
  liftFeeNonW2Samples.length > 0
    ? `| GR_UID | Joined PO Warehouse | Remark |\n| --- | --- | --- |\n${liftFeeNonW2Samples.map((s) => `| ${s.grUid} | ${s.poWarehouse} | ${s.remark.replace(/\|/g, "\\|")} |`).join("\n")}`
    : "None found."
}

## 6. ProductName / Vendor Master Profiling

| Metric | Count |
| --- | ---: |
| ProductName.csv rows | ${productRows.length} |
| Blank Product code | ${productBlankCode} |
| Blank Product name | ${productBlankName} |
| Duplicate Product code | ${productDuplicateCodes} |
| Vendor.csv rows | ${vendorRows.length} |
| Blank Vendor Code | ${vendorBlankCode} |
| Duplicate Vendor Code | ${vendorDuplicateCodes} |
| ProductName Vendor Code(s) missing from Vendor.csv | ${productVendorCodesMissingFromVendorFile.length} |

## 7. Cross-File Matching

- PO vendor names with no exact match in Vendor.csv: **${unmatchedPoVendorNames.length}** / ${poVendorNames.size}
${unmatchedPoVendorNames.length > 0 ? unmatchedPoVendorNames.slice(0, 30).map((v) => `  - \`${v}\``).join("\n") : ""}
- PO non-blank SKUs with no match in ProductName.csv \`Product code\`: **${unmatchedPoSkus.length}** / ${poSkuValues.size}
${unmatchedPoSkus.length > 0 ? unmatchedPoSkus.slice(0, 30).map((s) => `  - \`${s}\``).join("\n") : ""}

## 8. Staging Catalog/Warehouse Cross-Reference (DB, read-only)

| Metric | Count |
| --- | ---: |
| PO product rows matched by \`catalog_products.canonical_code\` (= SKU) | ${poSkuMatchedByCode} |
| PO product rows matched by exact \`name_key\` | ${poSkuMatchedByName} |
| Distinct PO product rows needing manual review (no DB match) | ${dedupedManualReview.length} |
| PO vendor codes resolvable + present in \`catalog_vendors\` | ${poVendorsMatchedInDb} / ${matchedVendorCodes.length} |
| PO warehouse value(s) missing from staging \`warehouse_warehouses\` | ${poWarehousesMissingFromDb.length} |

### Manual-review PO products vs staging catalog (first 30, no code/name match)

${
  dedupedManualReview.length > 0
    ? `| SKU | Product |\n| --- | --- |\n${dedupedManualReview.slice(0, 30).map((r) => `| ${r.sku} | ${r.product} |`).join("\n")}`
    : "None — every PO product row matched the staging catalog by code or exact name."
}

## 9. Known Schema Mismatch

The exported \`PO.csv\` header has **no \`Expected_Date\` column**, even though
\`PO/Code.gs.txt\`'s \`setupDatabase()\` documents one. See
\`docs/migration/pr-po-gr-v1-mapping.md\` for detail. Vendor expected-delivery
modeling should not be finalized until this is resolved.

## 10. Blockers (${blockers.length})

${blockers.length > 0 ? blockers.map((b) => `- ${b}`).join("\n") : "- None"}

## 11. Warnings (${warnings.length})

${warnings.length > 0 ? warnings.map((w) => `- ${w}`).join("\n") : "- None"}

## 12. Recommendation

${
  blockers.length === 0
    ? "No blockers. Review the warnings above (empty PR source / PR-derived PO manual-review rows, bare-`DIRECT` grouping, unmatched vendors/products, lift-fee/non-W2 rows, Expected_Date mismatch) before planning PR/PO/GR import."
    : "Resolve blockers before proceeding to schema drafting."
}
`;

  writeFileSync(reportPath, reportText, "utf8");
  console.log(
    `\nDry run complete: ${prRows.length} PR rows, ${poRows.length} PO rows, ${grRows.length} GR rows, ${blockers.length} blockers, ${warnings.length} warnings.`,
  );
  console.log(`Report written to: ${reportPath}`);
}

run().catch((error) => {
  console.error("Fatal error during PR/PO/GR dry run:", error);
  process.exit(1);
});
