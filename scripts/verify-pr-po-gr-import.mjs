import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { readDatabaseUrl } from "./lib/pr-po-gr-parsing.mjs";

const { Client } = pg;
const root = process.cwd();

// Expected counts come from the V2-0044 import-apply preview pass
// (import-reports/pr-po-gr-import-preview-report.md), not the original
// pr-po-gr-import-dry-run.mjs report: that report counts raw CSV rows before
// the apply script's own qty>0 validation (2 PO rows skipped) and before the
// GR header grouping logic (new for this slice, no external source of truth
// to check it against besides re-run stability).
const EXPECTED = {
  prHeaders: 0,
  poHeaders: 253,
  poLines: 748,
  grHeaders: 588,
  grLines: 1868,
  grSplits: 6,
  orphanGrLines: 14,
  prLinkUnverifiedLines: 3,
};
const ADR_0022_REF_PR_UID = "343d0d75-68db-4ce1-aa9a-e13e7e7f6837";

function readEnvVar(name) {
  let value = process.env[name];
  if (!value && existsSync(join(root, ".env.local"))) {
    const envText = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`));
      if (match) {
        value = match[1].trim();
        break;
      }
    }
  }
  return value;
}

const failures = [];
const passes = [];
function check(label, condition, detail) {
  if (condition) {
    passes.push(label);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function run() {
  console.log("=== AKRA V2 PR/PO/GR Import Verification (read-only) ===");

  const databaseUrl = readDatabaseUrl(root);
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const counts = await client.query(`
      select
        (select count(*)::int from public.purchasing_purchase_requests) as pr_headers,
        (select count(*)::int from public.purchasing_purchase_orders) as po_headers,
        (select count(*)::int from public.purchasing_purchase_order_lines) as po_lines,
        (select count(*)::int from public.receiving_goods_receipts) as gr_headers,
        (select count(*)::int from public.receiving_goods_receipt_lines) as gr_lines,
        (select count(*)::int from public.receiving_line_splits) as gr_splits,
        (select count(*)::int from public.receiving_goods_receipt_lines where match_status = 'orphan_ref_po_uid') as orphan_gr_lines,
        (select count(*)::int from public.purchasing_purchase_order_lines where match_status = 'pr_link_unverified') as pr_link_unverified_lines,
        (select count(*)::int from public.purchasing_events where event_type = 'po_imported') as po_imported_events,
        (select count(*)::int from public.purchasing_events where event_type = 'pr_imported') as pr_imported_events,
        (select count(*)::int from public.receiving_events where event_type = 'gr_imported') as gr_imported_events
    `);
    const row = counts.rows[0];

    check("PR headers count", row.pr_headers === EXPECTED.prHeaders, `got ${row.pr_headers}, expected ${EXPECTED.prHeaders}`);
    check("PO headers count", row.po_headers === EXPECTED.poHeaders, `got ${row.po_headers}, expected ${EXPECTED.poHeaders}`);
    check("PO lines count", row.po_lines === EXPECTED.poLines, `got ${row.po_lines}, expected ${EXPECTED.poLines}`);
    check("GR headers count", row.gr_headers === EXPECTED.grHeaders, `got ${row.gr_headers}, expected ${EXPECTED.grHeaders}`);
    check("GR lines count", row.gr_lines === EXPECTED.grLines, `got ${row.gr_lines}, expected ${EXPECTED.grLines}`);
    check("GR splits count", row.gr_splits === EXPECTED.grSplits, `got ${row.gr_splits}, expected ${EXPECTED.grSplits}`);
    check(
      "Orphan GR lines count",
      row.orphan_gr_lines === EXPECTED.orphanGrLines,
      `got ${row.orphan_gr_lines}, expected ${EXPECTED.orphanGrLines}`,
    );
    check(
      "ADR 0022 pr_link_unverified lines count",
      row.pr_link_unverified_lines === EXPECTED.prLinkUnverifiedLines,
      `got ${row.pr_link_unverified_lines}, expected ${EXPECTED.prLinkUnverifiedLines}`,
    );
    // The whole point of migration 0014 was to let the import write one audit
    // event per header; confirm it actually did, not just that the commit succeeded.
    check(
      "po_imported event count matches PO headers",
      row.po_imported_events === EXPECTED.poHeaders,
      `got ${row.po_imported_events}, expected ${EXPECTED.poHeaders}`,
    );
    check(
      "gr_imported event count matches GR headers",
      row.gr_imported_events === EXPECTED.grHeaders,
      `got ${row.gr_imported_events}, expected ${EXPECTED.grHeaders}`,
    );
    check("pr_imported event count is 0 (PR source is empty)", row.pr_imported_events === EXPECTED.prHeaders);

    // ADR 0022: the 3 PR-derived PO lines must carry the exact raw PR UID,
    // a human-readable breadcrumb, and a null structured PR-line link.
    const adrRows = await client.query(
      `select pol.pr_number_label, pol.purchase_request_line_id, po.legacy_ref_pr_uid
         from public.purchasing_purchase_order_lines pol
         join public.purchasing_purchase_orders po on po.id = pol.purchase_order_id
        where pol.match_status = 'pr_link_unverified'`,
    );
    check("ADR 0022 rows found", adrRows.rows.length === 3, `got ${adrRows.rows.length}`);
    check(
      "ADR 0022 rows have correct legacy_ref_pr_uid",
      adrRows.rows.every((r) => r.legacy_ref_pr_uid === ADR_0022_REF_PR_UID),
    );
    check(
      "ADR 0022 rows have a pr_number_label breadcrumb and null purchase_request_line_id",
      adrRows.rows.every((r) => r.pr_number_label && r.purchase_request_line_id === null),
    );

    // anon must still be denied via the real Data API (matches V2-0008/V2-0036 precedent).
    const supabaseUrl = readEnvVar("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = readEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    if (supabaseUrl && anonKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/purchasing_purchase_orders?select=id&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      check("anon Data API access denied", response.status === 401, `got HTTP ${response.status}`);
    } else {
      failures.push("anon Data API check skipped — NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY not found in env/.env.local");
    }

    // A real purchasing.read/write-or-receiving.read/write-holding profile
    // (not ADMIN, to exercise the permission branch rather than the admin
    // bypass) must be able to read real imported rows through the actual
    // RLS policy. Impersonates via the same request.jwt.claims GUC mechanism
    // PostgREST uses, inside a transaction that always rolls back — no
    // password reset, no persisted state.
    const holder = await client.query(`
      select ur.user_id
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
       where p.key in ('purchasing.read', 'purchasing.write', 'receiving.read', 'receiving.write')
         and r.key <> 'ADMIN'
       limit 1
    `);
    if (holder.rows.length > 0) {
      const userId = holder.rows[0].user_id;
      await client.query("begin");
      try {
        await client.query("set local role authenticated");
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: userId, role: "authenticated" }),
        ]);
        const asUser = await client.query("select count(*)::int as n from public.purchasing_purchase_orders");
        // Proves a permission holder CAN read (the V2-0036-deferred check).
        // Does not by itself prove RLS denies the unpermissioned — that path
        // is already proven by Picking's identical has_permission() policy.
        check(
          "Non-ADMIN purchasing/receiving permission holder can read imported PO rows",
          asUser.rows[0].n === EXPECTED.poHeaders,
          `got ${asUser.rows[0].n} as profile ${userId}`,
        );
      } catch (error) {
        failures.push(`RLS impersonation check errored: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await client.query("rollback").catch(() => {});
      }
    } else {
      failures.push("No non-ADMIN profile with purchasing/receiving permission found — cannot prove RLS read access.");
    }

    console.log(`\nPassed: ${passes.length}`);
    for (const p of passes) console.log(`  - ${p}`);
    console.log(`Failed: ${failures.length}`);
    for (const f of failures) console.log(`  - ${f}`);

    if (failures.length > 0) process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch((error) => {
  console.error("Fatal error during PR/PO/GR import verification:", error);
  process.exit(1);
});
