import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const importDataDir = join(root, "import-data", "Picking");

const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";
const REQUIRED_FLAG = "--confirm-picking-reference-import";
const SOURCE_APP = "picking";
const SOURCE_FILE = "Picking - ProductName.csv";

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
  return true;
}

async function bulkInsert(client, tableName, columns, rows) {
  if (rows.length === 0) return;
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
    const query = `insert into ${tableName} (${columns.join(", ")}) values ${valuePlaceholders.join(", ")}`;
    await client.query(query, flatValues);
  }
}

async function run() {
  console.log("=== AKRA V2 Picking Reference Data Import (writes to staging) ===");

  if (!process.argv.includes(REQUIRED_FLAG)) {
    console.error(`Refusing to write without ${REQUIRED_FLAG}.`);
    process.exit(1);
  }

  if (!existsSync(productFilePath) || !existsSync(staffFilePath)) {
    console.error("Picking reference source CSVs not found under import-data/Picking/.");
    process.exit(1);
  }

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

  if (!databaseUrl.includes(STAGING_PROJECT_REF) && process.env.AKRA_ALLOW_NON_STAGING_IMPORT !== "true") {
    console.error("Refusing import because DATABASE_URL does not target the known staging project.");
    process.exit(1);
  }

  const productRows = parseCSV(readFileSync(productFilePath, "utf8")).rows;
  const staffRows = parseCSV(readFileSync(staffFilePath, "utf8")).rows;

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("begin");

    const catalogResult = await client.query(
      "select id, canonical_code, name_key from public.catalog_products",
    );
    const codeMap = new Map();
    const nameKeyMap = new Map();
    for (const row of catalogResult.rows) {
      if (row.canonical_code) codeMap.set(row.canonical_code, row.id);
      if (!nameKeyMap.has(row.name_key)) nameKeyMap.set(row.name_key, row.id);
    }

    const aliasRows = [];
    for (const row of productRows) {
      const code = row["Product code"]?.trim() || null;
      const name = row["Product name"]?.trim();
      if (!name) continue;

      const nameKey = toNameKey(name);
      let productId = null;
      let matchStatus = "manual_review";
      let matchConfidence = 0;

      if (code && codeMap.has(code)) {
        productId = codeMap.get(code);
        matchStatus = "matched_code";
        matchConfidence = 100;
      } else if (nameKeyMap.has(nameKey)) {
        productId = nameKeyMap.get(nameKey);
        matchStatus = "matched_exact_name";
        matchConfidence = 100;
      }

      aliasRows.push({
        product_id: productId,
        source_app: SOURCE_APP,
        source_file: SOURCE_FILE,
        legacy_code: code,
        source_name: name,
        source_name_key: nameKey,
        source_unit: row["Unit"]?.trim() || null,
        match_status: matchStatus,
        match_confidence: matchConfidence,
      });
    }

    console.log(`Replacing picking-source aliases (${aliasRows.length} rows)...`);
    await client.query("delete from public.catalog_product_aliases where source_app = $1", [SOURCE_APP]);
    await bulkInsert(
      client,
      "public.catalog_product_aliases",
      [
        "product_id",
        "source_app",
        "source_file",
        "legacy_code",
        "source_name",
        "source_name_key",
        "source_unit",
        "match_status",
        "match_confidence",
      ],
      aliasRows,
    );

    let staffUpserted = 0;
    let lineAccountsUpserted = 0;
    for (const row of staffRows) {
      const name = row.name?.trim();
      if (!name) continue;

      const lineUserId = row.lineUserId?.trim() || null;
      const isActive = isActiveValue(row.active);

      const existing = await client.query(
        "select id from public.picking_staff where display_name = $1 and legacy_source = 'picking_v1'",
        [name],
      );

      let staffId;
      if (existing.rows.length > 0) {
        staffId = existing.rows[0].id;
        await client.query(
          "update public.picking_staff set is_active = $1 where id = $2",
          [isActive, staffId],
        );
      } else {
        const inserted = await client.query(
          "insert into public.picking_staff (display_name, is_active, legacy_source) values ($1, $2, 'picking_v1') returning id",
          [name, isActive],
        );
        staffId = inserted.rows[0].id;
      }
      staffUpserted++;

      if (lineUserId) {
        await client.query(
          `insert into public.picking_staff_line_accounts (staff_id, line_user_id, is_active)
           values ($1, $2, $3)
           on conflict (staff_id) do update set line_user_id = excluded.line_user_id, is_active = excluded.is_active`,
          [staffId, lineUserId, isActive],
        );
        lineAccountsUpserted++;
      }
    }

    await client.query("commit");

    console.log(
      `Done. ${aliasRows.length} picking-source aliases, ${staffUpserted} picking_staff rows, ${lineAccountsUpserted} LINE account rows.`,
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch((error) => {
  console.error("Fatal error during Picking reference import:", error);
  process.exit(1);
});
