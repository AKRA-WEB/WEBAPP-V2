import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  parseCSV,
  toNameKey,
  parseV1Date,
  toISODate,
  classifyDateField,
  dateFieldToParseStatus,
  billGroupKey,
  classifyRefPrUid,
  mapBillIdentityKind,
  LIFT_FEE_CURRENT_RE,
  LIFT_FEE_LEGACY_RE,
  EXTRA_ITEM_TAG,
  readDatabaseUrl,
  STAGING_PROJECT_REF,
} from "./lib/pr-po-gr-parsing.mjs";

const { Client } = pg;
const root = process.cwd();
const importDataDir = join(root, "import-data", "po-pr-gr");
const reportsDir = join(root, "import-reports");
if (!existsSync(reportsDir)) mkdirSync(reportsDir);

const REQUIRED_FLAG = "--confirm-pr-po-gr-import";
const CONFIRMED = process.argv.includes(REQUIRED_FLAG);
const LEGACY_SOURCE = "v1_import";
const SOURCE_FILE = {
  pr: "Trackingpo - webapp - PR.csv",
  po: "Trackingpo - webapp - PO.csv",
  gr: "Trackingpo - webapp - GR.csv",
  vendor: "Trackingpo - webapp - Vendor.csv",
};
// Mirrors product-catalog-import-apply.mjs's own ProductName.csv-Unit
// fallback precedent (`default_unit: row["Unit"]?.trim() || "ลัง"`), used
// here only for the handful of rows whose product never resolved a catalog
// match at all (so no default_unit exists to fall back to either).
const FALLBACK_UNIT_LITERAL = "ลัง";
const ALL_TABLES_IN_DEPENDENCY_ORDER = [
  "public.purchasing_purchase_request_lines",
  "public.purchasing_purchase_requests",
  "public.purchasing_purchase_order_lines",
  "public.purchasing_purchase_orders",
  "public.purchasing_events",
  "public.receiving_line_splits",
  "public.receiving_goods_receipt_lines",
  "public.receiving_goods_receipts",
  "public.receiving_events",
];

function readCsv(name) {
  const path = join(importDataDir, SOURCE_FILE[name]);
  if (!existsSync(path)) return { headers: [], rows: [] };
  const parsed = parseCSV(readFileSync(path, "utf8"));
  parsed.rows.forEach((row, idx) => {
    row.__sourceRow = idx + 2; // +1 header row, +1 for 1-based row numbers
  });
  return parsed;
}

// ==========================================
// Resolution helpers (read-only against already-fetched DB maps)
// ==========================================

function matchCatalogProduct(sku, product, codeMap, nameKeyMap) {
  const skuTrim = (sku || "").trim();
  if (skuTrim && codeMap.has(skuTrim)) {
    return { ...codeMap.get(skuTrim), matchStatus: "matched_code" };
  }
  const nameKey = toNameKey(product);
  if (nameKeyMap.has(nameKey)) {
    return { ...nameKeyMap.get(nameKey), matchStatus: "matched_exact_name" };
  }
  return { id: null, defaultUnit: null, matchStatus: "no_catalog_match" };
}

function resolveUnit(rawUnit, catalogMatch) {
  const raw = (rawUnit || "").trim();
  if (raw) return raw;
  if (catalogMatch?.defaultUnit) return catalogMatch.defaultUnit;
  return FALLBACK_UNIT_LITERAL;
}

function matchVendorId(rawVendorName, vendorCodeByName, vendorKeyToId) {
  const code = vendorCodeByName.get((rawVendorName || "").trim());
  if (!code) return null;
  return vendorKeyToId.get(code.trim().toLowerCase()) || null;
}

function matchWarehouseId(rawWarehouse, warehouseKeyToId) {
  return warehouseKeyToId.get((rawWarehouse || "").trim().toLowerCase()) || null;
}

// PO line Status is a binary signal in V1: only the explicit closing label
// means "closed for APV"; every other observed label (GR Completed, Pending
// GR, Pending Review) means the bill is not yet formally closed. raw_status
// always preserves the exact source text regardless of this mapping.
function normalizePoStatus(rawStatus) {
  return (rawStatus || "").trim() === "PO Closed - Ready for APV" ? "po_closed_apv_ready" : "po_pending_receipt";
}

// GR Status maps onto the schema's 3-value check. "Pending GR" (1 row in the
// current snapshot) is a documented one-row judgment call, not a 4th
// category: inspection (docs/migration/pr-po-gr-v1-mapping.md / 2026-06-24
// import notes) showed that row already carries a real received qty/location,
// so it is closer to "pending review" than "draft". Throws on any other
// unmapped label so a future refreshed export with a genuinely new status
// string fails loudly instead of being silently miscategorized.
const GR_STATUS_MAP = new Map([
  ["Draft GR", "gr_draft"],
  ["GR Completed", "gr_completed"],
  ["Pending Review", "gr_pending_review"],
  ["Pending GR", "gr_pending_review"],
]);
function normalizeGrStatus(rawStatus) {
  const key = (rawStatus || "").trim();
  if (!GR_STATUS_MAP.has(key)) {
    throw new Error(`Unmapped GR Status "${key}" — update normalizeGrStatus before re-running the import.`);
  }
  return GR_STATUS_MAP.get(key);
}

// PR Status values per docs/migration/pr-po-gr-v1-mapping.md (PR/Code.gs.txt):
// Pending, Approved, Rejected. Throws on anything else for the same reason as
// normalizeGrStatus: a real export with a new label should fail loudly, not
// guess. Unproven against real data — the current PR.csv snapshot has 0 rows
// (see docs/decisions/0022-pr-po-gr-3-row-pr-linkage.md) — but the loop below
// runs over an empty array today, exactly like every other untested-but-typed
// branch in this codebase pattern (e.g. V2-0027's LINE real-send path).
const PR_STATUS_MAP = new Map([
  ["Pending", "pr_pending"],
  ["Approved", "pr_approved"],
  ["Rejected", "pr_rejected"],
]);
function normalizePrStatus(rawStatus) {
  const key = (rawStatus || "").trim();
  if (!PR_STATUS_MAP.has(key)) {
    throw new Error(`Unmapped PR Status "${key}" — update normalizePrStatus before re-running the import.`);
  }
  return PR_STATUS_MAP.get(key);
}

// ==========================================
// PR candidate building + grouping (per migration 0013's comment: "PR by
// PR_Number"). request_number is nullable+unique-if-present in the schema
// (unlike po_number), so a blank PR_Number just falls back to one header per
// PR_UID instead of needing a synthesized placeholder.
// ==========================================

function buildPrCandidate(row, dbMaps) {
  const sku = (row["SKU"] || "").trim();
  const product = (row["Product"] || "").trim();
  const catalogMatch = matchCatalogProduct(sku, product, dbMaps.catalogCodeMap, dbMaps.catalogNameKeyMap);
  const unit = resolveUnit(row["Unit"], catalogMatch);
  const requestedQty = Number((row["Qty"] || "").trim());
  const requesterName = (row["Requester"] || "").trim();

  const reasons = [];
  if (!(requestedQty > 0)) reasons.push(`requested_qty must be > 0 (raw Qty="${row["Qty"]}")`);
  if (!unit) reasons.push("unit resolved to blank");
  if (!product) reasons.push("blank Product (raw_product_name)");
  if (!requesterName) reasons.push("blank Requester (requester_name)");

  return { row, valid: reasons.length === 0, skipReasons: reasons, sku, product, catalogMatch, unit, requestedQty, requesterName };
}

function buildPrGroups(prRows, dbMaps) {
  const candidates = prRows.map((row) => buildPrCandidate(row, dbMaps));
  const skippedPrRows = candidates
    .filter((c) => !c.valid)
    .map((c) => ({ prUid: c.row["PR_UID"] || "(blank)", sku: c.sku, product: c.product, reasons: c.skipReasons }));

  const validCandidates = candidates.filter((c) => c.valid);
  const groupOrder = [];
  const groups = new Map();
  for (const candidate of validCandidates) {
    const key = (candidate.row["PR_Number"] || "").trim() || `legacy-pr-uid:${candidate.row["PR_UID"]}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key).push(candidate);
  }

  const prGroups = [];
  for (const key of groupOrder) {
    const members = groups.get(key);
    const first = members[0];
    const requestNumber = (first.row["PR_Number"] || "").trim() || null;
    const lines = members.map((m, idx) => ({
      legacyPrUid: m.row["PR_UID"],
      lineNo: idx + 1,
      catalogProductId: m.catalogMatch.id,
      rawSku: m.sku || null,
      rawProductName: m.product,
      requestedQty: m.requestedQty,
      unit: m.unit,
      rawWarehouse: m.row["Warehouse"] || null,
      warehouseId: matchWarehouseId(m.row["Warehouse"], dbMaps.warehouseKeyToId),
      remark: m.row["Remark"] || null,
      status: normalizePrStatus(m.row["Status"]),
      rawStatus: m.row["Status"] || null,
      matchStatus: m.catalogMatch.matchStatus,
    }));

    prGroups.push({
      groupKey: key,
      requestNumber,
      requestDate: toISODate(parseV1Date(first.row["PR_Date"])),
      rawRequestDate: first.row["PR_Date"] || null,
      requesterName: first.requesterName,
      status: normalizePrStatus(first.row["Status"]),
      rawStatus: first.row["Status"] || null,
      sourceRow: first.row.__sourceRow,
      lines,
    });
  }

  return { prGroups, skippedPrRows };
}

// ==========================================
// PO candidate building + validation
// ==========================================

function buildPoCandidate(row, dbMaps) {
  const sku = (row["SKU"] || "").trim();
  const product = (row["Product"] || "").trim();
  const catalogMatch = matchCatalogProduct(sku, product, dbMaps.catalogCodeMap, dbMaps.catalogNameKeyMap);
  const unit = resolveUnit(row["Unit"], catalogMatch);
  const orderedQty = Number((row["PO_Qty"] || "").trim());
  const parsedDate = parseV1Date(row["PO_Date"]);

  const reasons = [];
  if (!(orderedQty > 0)) reasons.push(`ordered_qty must be > 0 (raw PO_Qty="${row["PO_Qty"]}")`);
  if (!unit) reasons.push("unit resolved to blank");
  if (!product) reasons.push("blank Product (raw_product_name)");

  return {
    row,
    valid: reasons.length === 0,
    skipReasons: reasons,
    sku,
    product,
    catalogMatch,
    unit,
    orderedQty,
    parsedDate,
  };
}

function buildPoBillGroups(poRows, dbMaps) {
  const candidates = poRows.map((row) => buildPoCandidate(row, dbMaps));
  const skippedPoRows = candidates
    .filter((c) => !c.valid)
    .map((c) => ({ poUid: c.row["PO_UID"] || "(blank)", sku: c.sku, product: c.product, reasons: c.skipReasons }));

  const validCandidates = candidates.filter((c) => c.valid);
  const groupOrder = [];
  const groups = new Map();
  for (const candidate of validCandidates) {
    const key = billGroupKey(candidate.row);
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key).push(candidate);
  }

  const poBillGroups = [];
  const poLineIndexByLegacyUid = new Map(); // legacy_po_uid -> { billGroupKey }
  for (const key of groupOrder) {
    const members = groups.get(key);
    const first = members[0];
    const refClass = classifyRefPrUid(first.row["Ref_PR_UID"]);
    const ref = (first.row["Ref_PR_UID"] || "").trim();
    const identity = mapBillIdentityKind(refClass, ref);

    const poNumberFromSource = members.map((m) => (m.row["PO_Number"] || "").trim()).find(Boolean);
    const poNumber = poNumberFromSource || `LEGACY-${identity.value || key.replace(/\|/g, "-")}`;

    const allClosed = members.every((m) => normalizePoStatus(m.row["Status"]) === "po_closed_apv_ready");

    const lines = members.map((m, idx) => {
      const lineNo = idx + 1;
      poLineIndexByLegacyUid.set(m.row["PO_UID"], { billGroupKey: key });
      const matchStatus = identity.kind === "pr_uid" ? "pr_link_unverified" : m.catalogMatch.matchStatus;
      return {
        legacyPoUid: m.row["PO_UID"],
        lineNo,
        catalogProductId: m.catalogMatch.id,
        rawSku: m.sku || null,
        rawProductName: m.product,
        orderedQty: m.orderedQty,
        unit: m.unit,
        remark: m.row["Remark"] || null,
        prNumberLabel: identity.kind === "pr_uid" ? m.row["PR_Number"] || null : null,
        rawPoDate: m.row["PO_Date"] || null,
        status: normalizePoStatus(m.row["Status"]),
        rawStatus: m.row["Status"] || null,
        matchStatus,
      };
    });

    poBillGroups.push({
      groupKey: key,
      poNumber,
      poDate: toISODate(first.parsedDate),
      rawPoDate: first.row["PO_Date"] || null,
      vendorId: matchVendorId(first.row["Vendor"], dbMaps.vendorCodeByName, dbMaps.vendorKeyToId),
      rawVendorName: first.row["Vendor"] || null,
      warehouseId: matchWarehouseId(first.row["Warehouse"], dbMaps.warehouseKeyToId),
      rawWarehouse: first.row["Warehouse"] || null,
      status: allClosed ? "po_closed_apv_ready" : "po_pending_receipt",
      rawStatus: members.map((m) => m.row["Status"]).join(" | "),
      billIdentityKind: identity.kind,
      billIdentityValue: identity.value,
      legacyRefPrUid: identity.legacyRefPrUid,
      legacyGroupKey: key,
      isDirect: identity.isDirect,
      isLegacyAmbiguous: identity.isLegacyAmbiguous,
      sourceRow: first.row.__sourceRow,
      lines,
    });
  }

  return { poBillGroups, skippedPoRows, poLineIndexByLegacyUid };
}

// ==========================================
// GR candidate building + grouping
// ==========================================

function buildGrCandidate(row, dbMaps) {
  const sku = (row["SKU"] || "").trim();
  const product = (row["Product"] || "").trim();
  const catalogMatch = matchCatalogProduct(sku, product, dbMaps.catalogCodeMap, dbMaps.catalogNameKeyMap);
  const unit = resolveUnit(row["Unit"], catalogMatch);
  const rawQty = (row["GR_Qty"] || "").trim();
  const receivedQty = rawQty ? Number(rawQty) : 0; // blank GR_Qty only ever observed on Draft GR rows (not yet received)
  const rawOldQty = (row["Old.Qty"] || "").trim();
  const oldQty = rawOldQty ? Number(rawOldQty) : null;

  const reasons = [];
  if (!(receivedQty >= 0)) reasons.push(`received_qty must be >= 0 (raw GR_Qty="${row["GR_Qty"]}")`);
  if (!unit) reasons.push("unit resolved to blank");
  if (!product) reasons.push("blank Product (raw_product_name)");
  if (oldQty !== null && !(oldQty >= 0)) reasons.push(`old_qty must be >= 0 if present (raw Old.Qty="${row["Old.Qty"]}")`);

  return { row, valid: reasons.length === 0, skipReasons: reasons, sku, product, catalogMatch, unit, receivedQty, oldQty };
}

function dateGroupToken(raw) {
  const parsed = parseV1Date(raw);
  return parsed ? parsed.formatted : (raw || "").trim();
}

function parseLocationSplits(locIn, warehouseKeyToId) {
  if (!locIn || !locIn.includes("|")) return [];
  return locIn
    .split("|")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece, idx) => {
      const prefix = piece.split("-")[0]?.trim().toLowerCase();
      return {
        splitNo: idx + 1,
        rawLocation: piece,
        warehouseKey: prefix || null,
        warehouseId: warehouseKeyToId.get(prefix) || null,
      };
    });
}

function buildGrGroups(grRows, dbMaps, poLineIndexByLegacyUid, skippedPoUidSet) {
  const candidates = grRows.map((row) => buildGrCandidate(row, dbMaps));
  const skippedGrRows = candidates
    .filter((c) => !c.valid)
    .map((c) => ({ grUid: c.row["GR_UID"] || "(blank)", sku: c.sku, product: c.product, reasons: c.skipReasons }));

  const validCandidates = candidates.filter((c) => c.valid);
  const groupOrder = [];
  const groups = new Map();
  for (const candidate of validCandidates) {
    const refPoUid = (candidate.row["Ref_PO_UID"] || "").trim();
    const poLineRef = poLineIndexByLegacyUid.get(refPoUid) || null;
    const key = [
      poLineRef ? `po:${poLineRef.billGroupKey}` : `orphan:${refPoUid}`,
      dateGroupToken(candidate.row["GR_Date"]),
      dateGroupToken(candidate.row["ATA"]),
      (candidate.row["Receiver"] || "").trim(),
      (candidate.row["Status"] || "").trim(),
      (candidate.row["Remark"] || "").trim(),
    ].join("|");
    if (!groups.has(key)) {
      groups.set(key, { poLineRef, members: [] });
      groupOrder.push(key);
    }
    groups.get(key).members.push(candidate);
  }

  const grGroups = [];
  for (const key of groupOrder) {
    const { poLineRef, members } = groups.get(key);
    const first = members[0];

    const liftFeeMembers = members.filter((m) => {
      const remark = m.row["Remark"] || "";
      return LIFT_FEE_CURRENT_RE.test(remark) || LIFT_FEE_LEGACY_RE.test(remark);
    });

    const lines = members.map((m) => {
      const refPoUid = (m.row["Ref_PO_UID"] || "").trim();
      const expClassification = classifyDateField(m.row["Exp_Date"]);
      const expParsed = parseV1Date(m.row["Exp_Date"]);
      const isExtraItem = (m.row["Remark"] || "").includes(EXTRA_ITEM_TAG);
      const matchStatus = !poLineRef ? "orphan_ref_po_uid" : m.catalogMatch.matchStatus;
      const orphanReason = !poLineRef
        ? skippedPoUidSet.has(refPoUid)
          ? "po_line_skipped_invalid_qty"
          : "po_uid_not_in_source"
        : null;
      const splits = parseLocationSplits(m.row["Loc_IN"], dbMaps.warehouseKeyToId);
      return {
        legacyGrUid: m.row["GR_UID"],
        legacyRefPoUid: refPoUid || null,
        legacyPoUidForFk: poLineRef ? refPoUid : null,
        orphanReason,
        catalogProductId: m.catalogMatch.id,
        rawSku: m.sku || null,
        rawProductName: m.product,
        receivedQty: m.receivedQty,
        unit: m.unit,
        oldQty: m.oldQty,
        expiryDate: toISODate(expParsed),
        rawExpiryDate: m.row["Exp_Date"] || null,
        dateParseStatus: dateFieldToParseStatus(expClassification),
        locationSummary: m.row["Loc_IN"] || null,
        rawLocIn: m.row["Loc_IN"] || null,
        rawRemark: m.row["Remark"] || null,
        isExtraItem,
        matchStatus,
        splits,
      };
    });

    grGroups.push({
      groupKey: key,
      poBillGroupKey: poLineRef?.billGroupKey || null,
      orphanRefPoUid: poLineRef ? null : (first.row["Ref_PO_UID"] || "").trim(),
      receiptDate: toISODate(parseV1Date(first.row["GR_Date"])),
      rawReceiptDate: first.row["GR_Date"] || null,
      ataDate: toISODate(parseV1Date(first.row["ATA"])),
      rawAta: first.row["ATA"] || null,
      receiverName: first.row["Receiver"] || null,
      status: normalizeGrStatus(first.row["Status"]),
      rawStatus: first.row["Status"] || null,
      remark: first.row["Remark"] || null,
      rawRemark: first.row["Remark"] || null,
      liftFeeSummary:
        liftFeeMembers.length > 0
          ? { line_count: liftFeeMembers.length, samples: liftFeeMembers.slice(0, 3).map((m) => m.row["Remark"]) }
          : {},
      sourceRow: first.row.__sourceRow,
      lines,
    });
  }

  return { grGroups, skippedGrRows };
}

// ==========================================
// Plan assembly (pure, no DB writes)
// ==========================================

async function fetchDbMaps(client) {
  const catalogResult = await client.query("select id, canonical_code, name_key, default_unit from public.catalog_products");
  const catalogCodeMap = new Map();
  const catalogNameKeyMap = new Map();
  for (const row of catalogResult.rows) {
    const entry = { id: row.id, defaultUnit: row.default_unit };
    if (row.canonical_code) catalogCodeMap.set(row.canonical_code, entry);
    if (!catalogNameKeyMap.has(row.name_key)) catalogNameKeyMap.set(row.name_key, entry);
  }

  const vendorResult = await client.query("select id, vendor_key from public.catalog_vendors");
  const vendorKeyToId = new Map(vendorResult.rows.map((r) => [r.vendor_key, r.id]));

  const warehouseResult = await client.query("select id, warehouse_key from public.warehouse_warehouses");
  const warehouseKeyToId = new Map(warehouseResult.rows.map((r) => [r.warehouse_key, r.id]));

  const vendorCsv = readCsv("vendor");
  const vendorCodeByName = new Map();
  for (const row of vendorCsv.rows) {
    const name = (row["Vendor Name"] || "").trim();
    const code = (row["Code"] || "").trim();
    if (name && code) vendorCodeByName.set(name, code);
  }

  return { catalogCodeMap, catalogNameKeyMap, vendorKeyToId, warehouseKeyToId, vendorCodeByName };
}

async function buildPlan(client) {
  const dbMaps = await fetchDbMaps(client);
  const poCsv = readCsv("po");
  const grCsv = readCsv("gr");
  const prCsv = readCsv("pr"); // 0 rows in the current snapshot; same code path handles a future non-empty export.

  const { prGroups, skippedPrRows } = buildPrGroups(prCsv.rows, dbMaps);
  const { poBillGroups, skippedPoRows, poLineIndexByLegacyUid } = buildPoBillGroups(poCsv.rows, dbMaps);
  const skippedPoUidSet = new Set(skippedPoRows.map((s) => s.poUid));
  const { grGroups, skippedGrRows } = buildGrGroups(grCsv.rows, dbMaps, poLineIndexByLegacyUid, skippedPoUidSet);

  return {
    prRowCount: prCsv.rows.length,
    prGroups,
    skippedPrRows,
    poBillGroups,
    skippedPoRows,
    grGroups,
    skippedGrRows,
  };
}

// ==========================================
// Apply (writes inside one transaction)
// ==========================================

async function applyPlan(client, plan) {
  await client.query("begin");
  try {
    await client.query(`truncate table ${ALL_TABLES_IN_DEPENDENCY_ORDER.join(", ")} restart identity cascade`);

    let prImportedHeaderCount = 0;
    let prImportedLineCount = 0;
    for (const group of plan.prGroups) {
      const headerResult = await client.query(
        `insert into public.purchasing_purchase_requests
           (request_number, request_date, raw_request_date, requester_name, status, raw_status,
            legacy_source, source_file, source_row)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning id`,
        [
          group.requestNumber, group.requestDate, group.rawRequestDate, group.requesterName,
          group.status, group.rawStatus, LEGACY_SOURCE, SOURCE_FILE.pr, group.sourceRow,
        ],
      );
      const purchaseRequestId = headerResult.rows[0].id;

      for (const line of group.lines) {
        await client.query(
          `insert into public.purchasing_purchase_request_lines
             (purchase_request_id, legacy_pr_uid, line_no, catalog_product_id, raw_sku, raw_product_name,
              requested_qty, unit, warehouse_id, raw_warehouse, remark, status, raw_status, match_status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            purchaseRequestId, line.legacyPrUid, line.lineNo, line.catalogProductId, line.rawSku,
            line.rawProductName, line.requestedQty, line.unit, line.warehouseId, line.rawWarehouse,
            line.remark, line.status, line.rawStatus, line.matchStatus,
          ],
        );
        prImportedLineCount++;
      }

      await client.query(
        `insert into public.purchasing_events (purchase_request_id, event_type, actor_name, metadata)
         values ($1, 'pr_imported', $2, $3)`,
        [purchaseRequestId, "system_import (V2-0044)", JSON.stringify({ line_count: group.lines.length })],
      );
      prImportedHeaderCount++;
    }

    let poImportedLineCount = 0;
    const realIdByLegacyPoUid = new Map();
    for (const group of plan.poBillGroups) {
      const headerResult = await client.query(
        `insert into public.purchasing_purchase_orders
           (po_number, po_date, raw_po_date, vendor_id, raw_vendor_name, warehouse_id, raw_warehouse,
            status, raw_status, bill_identity_kind, bill_identity_value, legacy_ref_pr_uid, legacy_group_key,
            is_direct, is_legacy_ambiguous, legacy_source, source_file, source_row)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         returning id`,
        [
          group.poNumber, group.poDate, group.rawPoDate, group.vendorId, group.rawVendorName,
          group.warehouseId, group.rawWarehouse, group.status, group.rawStatus, group.billIdentityKind,
          group.billIdentityValue, group.legacyRefPrUid, group.legacyGroupKey, group.isDirect,
          group.isLegacyAmbiguous, LEGACY_SOURCE, SOURCE_FILE.po, group.sourceRow,
        ],
      );
      const purchaseOrderId = headerResult.rows[0].id;

      for (const line of group.lines) {
        const lineResult = await client.query(
          `insert into public.purchasing_purchase_order_lines
             (purchase_order_id, legacy_po_uid, line_no, catalog_product_id, raw_sku, raw_product_name,
              ordered_qty, unit, remark, pr_number_label, raw_po_date, status, raw_status, match_status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           returning id`,
          [
            purchaseOrderId, line.legacyPoUid, line.lineNo, line.catalogProductId, line.rawSku,
            line.rawProductName, line.orderedQty, line.unit, line.remark, line.prNumberLabel,
            line.rawPoDate, line.status, line.rawStatus, line.matchStatus,
          ],
        );
        realIdByLegacyPoUid.set(line.legacyPoUid, { purchaseOrderId, purchaseOrderLineId: lineResult.rows[0].id });
        poImportedLineCount++;
      }

      await client.query(
        `insert into public.purchasing_events (purchase_order_id, event_type, actor_name, metadata)
         values ($1, 'po_imported', $2, $3)`,
        [purchaseOrderId, "system_import (V2-0044)", JSON.stringify({ line_count: group.lines.length, bill_identity_kind: group.billIdentityKind })],
      );
    }

    let grImportedLineCount = 0;
    let grImportedSplitCount = 0;
    for (const group of plan.grGroups) {
      const firstLine = group.lines[0];
      const fk = firstLine.legacyPoUidForFk ? realIdByLegacyPoUid.get(firstLine.legacyPoUidForFk) : null;
      const purchaseOrderId = fk ? fk.purchaseOrderId : null;

      const headerResult = await client.query(
        `insert into public.receiving_goods_receipts
           (purchase_order_id, receipt_date, raw_receipt_date, ata_date, raw_ata, receiver_name,
            status, raw_status, remark, raw_remark, lift_fee_summary, legacy_group_key, legacy_source, source_file, source_row)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         returning id`,
        [
          purchaseOrderId, group.receiptDate, group.rawReceiptDate, group.ataDate, group.rawAta,
          group.receiverName, group.status, group.rawStatus, group.remark, group.rawRemark,
          JSON.stringify(group.liftFeeSummary), group.groupKey, LEGACY_SOURCE, SOURCE_FILE.gr, group.sourceRow,
        ],
      );
      const goodsReceiptId = headerResult.rows[0].id;

      for (const line of group.lines) {
        const lineFk = line.legacyPoUidForFk ? realIdByLegacyPoUid.get(line.legacyPoUidForFk) : null;
        const lineResult = await client.query(
          `insert into public.receiving_goods_receipt_lines
             (goods_receipt_id, purchase_order_line_id, legacy_ref_po_uid, legacy_gr_uid, catalog_product_id,
              raw_sku, raw_product_name, received_qty, unit, old_qty, expiry_date, raw_expiry_date,
              date_parse_status, location_summary, raw_loc_in, raw_remark, is_extra_item, match_status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           returning id`,
          [
            goodsReceiptId, lineFk ? lineFk.purchaseOrderLineId : null, line.legacyRefPoUid, line.legacyGrUid,
            line.catalogProductId, line.rawSku, line.rawProductName, line.receivedQty, line.unit, line.oldQty,
            line.expiryDate, line.rawExpiryDate, line.dateParseStatus, line.locationSummary, line.rawLocIn,
            line.rawRemark, line.isExtraItem, line.matchStatus,
          ],
        );
        grImportedLineCount++;

        for (const split of line.splits) {
          await client.query(
            `insert into public.receiving_line_splits
               (goods_receipt_line_id, split_no, warehouse_id, warehouse_key, raw_location)
             values ($1,$2,$3,$4,$5)`,
            [lineResult.rows[0].id, split.splitNo, split.warehouseId, split.warehouseKey, split.rawLocation],
          );
          grImportedSplitCount++;
        }
      }

      await client.query(
        `insert into public.receiving_events (goods_receipt_id, event_type, actor_name, metadata)
         values ($1, 'gr_imported', $2, $3)`,
        [goodsReceiptId, "system_import (V2-0044)", JSON.stringify({ line_count: group.lines.length })],
      );
    }

    await client.query("commit");
    return {
      prImportedHeaderCount,
      prImportedLineCount,
      poHeaderCount: plan.poBillGroups.length,
      poImportedLineCount,
      grHeaderCount: plan.grGroups.length,
      grImportedLineCount,
      grImportedSplitCount,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

// ==========================================
// Reporting
// ==========================================

function writeReport(plan, result) {
  const matchStatusCounts = new Map();
  for (const group of plan.prGroups) {
    for (const line of group.lines) {
      matchStatusCounts.set(line.matchStatus, (matchStatusCounts.get(line.matchStatus) || 0) + 1);
    }
  }
  for (const group of plan.poBillGroups) {
    for (const line of group.lines) {
      matchStatusCounts.set(line.matchStatus, (matchStatusCounts.get(line.matchStatus) || 0) + 1);
    }
  }
  for (const group of plan.grGroups) {
    for (const line of group.lines) {
      matchStatusCounts.set(line.matchStatus, (matchStatusCounts.get(line.matchStatus) || 0) + 1);
    }
  }

  const orphanLines = plan.grGroups.flatMap((g) => g.lines).filter((l) => l.orphanReason);
  const trueOrphanCount = orphanLines.filter((l) => l.orphanReason === "po_uid_not_in_source").length;
  const skippedRefOrphanCount = orphanLines.filter((l) => l.orphanReason === "po_line_skipped_invalid_qty").length;

  const mode = result ? "APPLY (staging write committed)" : "PREVIEW (no writes)";
  const lines = [
    `# PR/PO/GR Import ${result ? "Apply" : "Preview"} Report`,
    "",
    `Date: ${new Date().toISOString()}`,
    `Mode: ${mode}`,
    "",
    "## Would-Import / Imported Counts",
    "",
    `- PR rows in source: ${plan.prRowCount}`,
    `- PR headers: ${plan.prGroups.length}`,
    `- PR lines: ${plan.prGroups.reduce((n, g) => n + g.lines.length, 0)} (skipped: ${plan.skippedPrRows.length})`,
    `- PO bill headers: ${plan.poBillGroups.length}`,
    `- PO lines: ${plan.poBillGroups.reduce((n, g) => n + g.lines.length, 0)} (skipped: ${plan.skippedPoRows.length})`,
    `- GR headers (new grouping logic): ${plan.grGroups.length}`,
    `- GR lines: ${plan.grGroups.reduce((n, g) => n + g.lines.length, 0)} (skipped: ${plan.skippedGrRows.length})`,
    `- GR location splits: ${plan.grGroups.reduce((n, g) => n + g.lines.reduce((m, l) => m + l.splits.length, 0), 0)}`,
    `- Orphan Ref_PO_UID GR lines: ${orphanLines.length} (${trueOrphanCount} PO_UID genuinely absent from PO.csv, matching the dry-run's 10; ${skippedRefOrphanCount} reference a real PO_UID whose only line(s) failed ordered_qty > 0 validation and were skipped, see Skipped PO Rows below)`,
    "",
    "## match_status Distribution",
    "",
    ...[...matchStatusCounts.entries()].map(([status, count]) => `- ${status}: ${count}`),
    "",
    `## Skipped PR Rows (${plan.skippedPrRows.length}, invalid_source_row)`,
    "",
    ...(plan.skippedPrRows.length > 0
      ? plan.skippedPrRows.map((s) => `- PR_UID ${s.prUid} (SKU ${s.sku || "(blank)"}, ${s.product}): ${s.reasons.join("; ")}`)
      : ["- None"]),
    "",
    `## Skipped PO Rows (${plan.skippedPoRows.length}, invalid_source_row)`,
    "",
    ...(plan.skippedPoRows.length > 0
      ? plan.skippedPoRows.map((s) => `- PO_UID ${s.poUid} (SKU ${s.sku || "(blank)"}, ${s.product}): ${s.reasons.join("; ")}`)
      : ["- None"]),
    "",
    `## Skipped GR Rows (${plan.skippedGrRows.length}, invalid_source_row)`,
    "",
    ...(plan.skippedGrRows.length > 0
      ? plan.skippedGrRows.map((s) => `- GR_UID ${s.grUid} (SKU ${s.sku || "(blank)"}, ${s.product}): ${s.reasons.join("; ")}`)
      : ["- None"]),
    "",
  ];

  if (result) {
    lines.push(
      "## Apply Result",
      "",
      `- PR headers inserted: ${result.prImportedHeaderCount}, lines: ${result.prImportedLineCount}`,
      `- PO headers inserted: ${result.poHeaderCount}, lines: ${result.poImportedLineCount}`,
      `- GR headers inserted: ${result.grHeaderCount}, lines: ${result.grImportedLineCount}, splits: ${result.grImportedSplitCount}`,
      "",
    );
  }

  const reportPath = join(reportsDir, result ? "pr-po-gr-import-apply-report.md" : "pr-po-gr-import-preview-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf8");
  console.log(`Report written to: ${reportPath}`);
}

// ==========================================
// Entry point
// ==========================================

async function run() {
  console.log(`=== AKRA V2 PR/PO/GR Staging Import (${CONFIRMED ? "APPLY" : "PREVIEW, no writes"}) ===`);

  const databaseUrl = readDatabaseUrl(root);
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  if (CONFIRMED && !databaseUrl.includes(STAGING_PROJECT_REF) && process.env.AKRA_ALLOW_NON_STAGING_IMPORT !== "true") {
    console.error("Refusing import because DATABASE_URL does not target the known staging project.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const plan = await buildPlan(client);
    console.log(
      `Plan built: ${plan.poBillGroups.length} PO headers / ${plan.poBillGroups.reduce((n, g) => n + g.lines.length, 0)} PO lines (${plan.skippedPoRows.length} skipped), ${plan.grGroups.length} GR headers / ${plan.grGroups.reduce((n, g) => n + g.lines.length, 0)} GR lines (${plan.skippedGrRows.length} skipped).`,
    );

    if (!CONFIRMED) {
      writeReport(plan, null);
      console.log(`\nPreview only. Re-run with ${REQUIRED_FLAG} against the staging DATABASE_URL to write.`);
      return;
    }

    const result = await applyPlan(client, plan);
    writeReport(plan, result);
    console.log(
      `\nApplied: ${result.poHeaderCount} PO headers / ${result.poImportedLineCount} PO lines, ${result.grHeaderCount} GR headers / ${result.grImportedLineCount} GR lines / ${result.grImportedSplitCount} splits.`,
    );
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch((error) => {
  console.error("Fatal error during PR/PO/GR import:", error);
  process.exit(1);
});
