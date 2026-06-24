import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Shared by scripts/pr-po-gr-import-dry-run.mjs, scripts/pr-po-gr-import-apply.mjs,
// and scripts/verify-pr-po-gr-import.mjs so bill-identity grouping, date
// classification, and Remark-tag parsing cannot silently drift between the
// dry-run report and the real import (see docs/migration/master-data-vocabulary.md
// "Folder Boundary Rules"). This module does not write to the database or read
// secrets by itself.

export const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";

export const KNOWN_WAREHOUSE_KEYS = new Set(["w1", "w2", "w3", "w4", "w5", "c1", "c2"]);

export function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
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

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] !== undefined ? values[idx] : "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function toNameKey(name) {
  return name ? name.trim().toLowerCase() : "";
}

// V1 dates observed as "D/M/YYYY" with no leading zeros (e.g. "4/5/2026").
export function parseV1Date(raw) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const parts = value.split(" ")[0].split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return { day: d, month: m, year: y, formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}` };
}

// Converts a parsed V1 date to an ISO yyyy-mm-dd string for SQL `date` columns.
export function toISODate(parsed) {
  if (!parsed) return null;
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

// GR date fields (esp. Exp_Date) carry two known V1 conventions that are not
// real parse failures: a literal "-" placeholder for "no expiry", and
// pre-1980 dates that are spreadsheet epoch-zero export artifacts from a
// blank cell, not real dates. Both are tallied separately from genuine
// malformed strings.
export function classifyDateField(raw) {
  const value = (raw ?? "").trim();
  if (!value) return "blank";
  if (value === "-") return "placeholder_dash";
  const parts = value.split(" ")[0].split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts.map((p) => parseInt(p, 10));
    if (d && m && y && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 0 && y < 1980) return "epoch_artifact";
  }
  return parseV1Date(value) ? "valid" : "malformed";
}

// Maps classifyDateField's category to the receiving_goods_receipt_lines
// .date_parse_status check (parsed/placeholder/epoch_artifact/malformed, or
// null when the field was simply blank with nothing to flag).
export function dateFieldToParseStatus(classification) {
  switch (classification) {
    case "valid":
      return "parsed";
    case "placeholder_dash":
      return "placeholder";
    case "epoch_artifact":
      return "epoch_artifact";
    case "malformed":
      return "malformed";
    default:
      return null;
  }
}

// Mirrors V1's actual bill-display grouping (PO/index.html `poBillGroupKey`,
// `usableBillRefUid`), NOT the separate lead-time/insights grouping used by
// `readCurrentLeadSamples_` (which also folds in PO_Number/Vendor/Date/
// Warehouse even for non-DIRECT refs). A non-blank, non-bare-"DIRECT" ref
// (i.e. `DIRECT-<uuid>` or a real PR_UID) is the bill identity by itself;
// only the ambiguous legacy case falls back to grouping by the four raw
// fields.
export function usableBillRefUid(raw) {
  const ref = (raw ?? "").trim();
  return ref && ref !== "DIRECT" ? ref : "";
}

export function billGroupKey(row) {
  const ref = usableBillRefUid(row["Ref_PR_UID"]);
  if (ref) return `bill:${ref}`;
  const date = parseV1Date(row["PO_Date"]);
  return [
    "legacy",
    row["PO_Number"] || "",
    (row["Vendor"] || "").trim(),
    date ? date.formatted : (row["PO_Date"] || ""),
    (row["Warehouse"] || "").trim(),
  ].join("|");
}

export function classifyRefPrUid(raw) {
  const ref = (raw ?? "").trim();
  if (!ref) return "blank";
  if (ref === "DIRECT") return "direct_legacy_bare";
  if (ref.startsWith("DIRECT-")) return "direct_stable";
  return "pr_derived";
}

// Maps classifyRefPrUid's category to purchasing_purchase_orders'
// bill_identity_kind check ('pr_uid' | 'direct_stable' | 'legacy_direct' |
// 'v2_direct' — v2_direct is reserved for future runtime-created direct POs,
// never produced by import). A blank Ref_PR_UID (none observed in the current
// snapshot) falls into the same ambiguous legacy grouping path as a bare
// "DIRECT", since neither carries a usable bill identity value.
export function mapBillIdentityKind(refClass, ref) {
  switch (refClass) {
    case "pr_derived":
      return { kind: "pr_uid", value: ref, isDirect: false, isLegacyAmbiguous: false, legacyRefPrUid: ref };
    case "direct_stable":
      return { kind: "direct_stable", value: ref, isDirect: true, isLegacyAmbiguous: false, legacyRefPrUid: null };
    case "direct_legacy_bare":
      return { kind: "legacy_direct", value: null, isDirect: true, isLegacyAmbiguous: true, legacyRefPrUid: null };
    default:
      return { kind: "legacy_direct", value: null, isDirect: false, isLegacyAmbiguous: true, legacyRefPrUid: null };
  }
}

export const LIFT_FEE_CURRENT_RE = /\[ค่าลิฟท์\s*(\d+)?\s*รอบ\s*(จ่ายสด|เชื่อ)\]/;
export const LIFT_FEE_LEGACY_RE = /\[ค่าลิฟท์:\s*(จ่ายสด|เชื่อ)\]/;
export const EXTRA_ITEM_TAG = "[นอกบิล/ของแถม]";

export function readDatabaseUrl(root) {
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
  return databaseUrl;
}
