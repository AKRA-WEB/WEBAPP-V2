import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const importDataDir = join(root, "import-data", "Picking");
const reportsDir = join(root, "import-reports");

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}

const productFilePath = join(importDataDir, "Picking - ProductName.csv");
const staffFilePath = join(importDataDir, "Picking - Staff.csv");

function parseCSVLine(line) {
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

function parseCSV(text) {
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

function toNameKey(name) {
  return name ? name.trim().toLowerCase() : "";
}

function isActiveValue(raw) {
  const value = (raw ?? "").trim().toLowerCase();
  if (["false", "0", "no", "inactive", "n"].includes(value)) {
    return false;
  }
  // V1 Staff export leaves `active` blank for the currently active row, so
  // blank/unrecognized values default to active. Explicit falsey values above
  // are the only way to mark a staff row inactive.
  return true;
}

function readDatabaseUrl() {
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

async function run() {
  console.log("=== AKRA V2 Picking Reference Data Dry Run (read-only) ===");

  if (!existsSync(productFilePath)) {
    console.error(`Missing file: ${productFilePath}`);
    process.exit(1);
  }
  if (!existsSync(staffFilePath)) {
    console.error(`Missing file: ${staffFilePath}`);
    process.exit(1);
  }

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const productRows = parseCSV(readFileSync(productFilePath, "utf8")).rows;
  const staffRows = parseCSV(readFileSync(staffFilePath, "utf8")).rows;

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const catalogResult = await client.query(
      "select id, canonical_code, name_key from public.catalog_products",
    );
    const codeMap = new Map();
    const nameKeyMap = new Map();
    for (const row of catalogResult.rows) {
      if (row.canonical_code) codeMap.set(row.canonical_code, row.id);
      if (!nameKeyMap.has(row.name_key)) nameKeyMap.set(row.name_key, row.id);
    }

    const existingAliasResult = await client.query(
      "select count(*)::int as count from public.catalog_product_aliases where source_app = 'picking'",
    );
    const existingAliasCount = existingAliasResult.rows[0].count;

    const existingStaffResult = await client.query(
      "select display_name, legacy_source, is_active from public.picking_staff",
    );
    const existingStaffByName = new Map(
      existingStaffResult.rows.map((row) => [toNameKey(row.display_name), row]),
    );

    // --- Product matching ---
    let blankName = 0;
    let blankCode = 0;
    const seenCodes = new Set();
    let duplicateCodes = 0;
    let matchedCode = 0;
    let matchedExactName = 0;
    const manualReview = [];

    for (const row of productRows) {
      const code = row["Product code"]?.trim();
      const name = row["Product name"]?.trim();

      if (!name) {
        blankName++;
        continue;
      }
      if (!code) blankCode++;
      if (code) {
        if (seenCodes.has(code)) duplicateCodes++;
        seenCodes.add(code);
      }

      const nameKey = toNameKey(name);
      if (code && codeMap.has(code)) {
        matchedCode++;
      } else if (nameKeyMap.has(nameKey)) {
        matchedExactName++;
      } else {
        manualReview.push({ code: code || "(blank)", name });
      }
    }

    // --- Staff matching ---
    const staffSummary = staffRows.map((row) => {
      const name = row.name?.trim() ?? "";
      const lineUserId = row.lineUserId?.trim() ?? "";
      const active = isActiveValue(row.active);
      const existing = existingStaffByName.get(toNameKey(name));
      return { name, lineUserId, active, existing: Boolean(existing) };
    });

    const blankStaffName = staffSummary.filter((row) => !row.name).length;
    const blankLineUserId = staffSummary.filter((row) => row.name && !row.lineUserId).length;

    const blockers = [];
    if (blankStaffName > 0) {
      blockers.push(`${blankStaffName} Staff row(s) have a blank name and cannot be imported.`);
    }

    const warnings = [];
    if (manualReview.length > 0) {
      warnings.push(
        `${manualReview.length} Picking ProductName row(s) need manual review (no code/name match in catalog_products).`,
      );
    }
    if (blankLineUserId > 0) {
      warnings.push(`${blankLineUserId} Staff row(s) have no lineUserId; LINE account row will be skipped for them.`);
    }
    if (existingAliasCount > 0) {
      warnings.push(
        `${existingAliasCount} picking-source aliases already exist; apply will replace them (delete-then-insert by source_app='picking').`,
      );
    }

    const reportPath = join(reportsDir, "picking-reference-dry-run-report.md");
    const reportText = `# Picking Reference Data Dry Run Report

Date: ${new Date().toISOString()}
Source files: \`import-data/Picking/Picking - ProductName.csv\`, \`import-data/Picking/Picking - Staff.csv\`

## ProductName -> catalog_products

| Metric | Count |
| --- | --- |
| Total rows | ${productRows.length} |
| Blank name (skipped) | ${blankName} |
| Blank code | ${blankCode} |
| Duplicate codes within file | ${duplicateCodes} |
| Matched by code | ${matchedCode} |
| Matched by exact name (no/unknown code) | ${matchedExactName} |
| Manual review (no match) | ${manualReview.length} |
| Existing picking-source aliases in staging | ${existingAliasCount} |

${
  manualReview.length > 0
    ? `### Manual review rows (first 50)\n\n| Code | Name |\n| --- | --- |\n${manualReview
        .slice(0, 50)
        .map((row) => `| ${row.code} | ${row.name} |`)
        .join("\n")}\n`
    : "No manual-review rows."
}

## Staff -> picking_staff

| Metric | Count |
| --- | --- |
| Total rows | ${staffRows.length} |
| Blank name (skipped) | ${blankStaffName} |
| Blank lineUserId | ${blankLineUserId} |

| Name | LINE user id present | Active | Already in staging |
| --- | --- | --- | --- |
${staffSummary
  .map((row) => `| ${row.name || "(blank)"} | ${row.lineUserId ? "yes" : "no"} | ${row.active} | ${row.existing} |`)
  .join("\n")}

## Blockers (${blockers.length})

${blockers.length > 0 ? blockers.map((b) => `- ${b}`).join("\n") : "- None"}

## Warnings (${warnings.length})

${warnings.length > 0 ? warnings.map((w) => `- ${w}`).join("\n") : "- None"}

## Recommendation

${
  blockers.length === 0
    ? "No blockers. Review the manual-review and staff tables above, then run `npm run picking:reference-import-apply -- --confirm-picking-reference-import` to write picking-source aliases and picking_staff/picking_staff_line_accounts to staging."
    : "Resolve blockers before running the gated apply script."
}
`;

    writeFileSync(reportPath, reportText, "utf8");
    console.log(
      `Dry run complete: ${productRows.length} product rows (${matchedCode} matched_code, ${matchedExactName} matched_exact_name, ${manualReview.length} manual_review), ${staffRows.length} staff rows, ${blockers.length} blockers, ${warnings.length} warnings.`,
    );
    console.log(`Report written to: ${reportPath}`);
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch((error) => {
  console.error("Fatal error during Picking reference dry run:", error);
  process.exit(1);
});
