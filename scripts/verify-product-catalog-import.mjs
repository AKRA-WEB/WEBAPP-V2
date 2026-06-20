import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();

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

const expectedCounts = new Map([
  ["catalog_products", 4793],
  ["catalog_vendors", 173],
  // Excludes source_app='picking': those aliases come from the separate,
  // re-runnable V2-0020 Picking reference import, not this V2-0018 import.
  ["catalog_product_aliases", 11433],
  ["catalog_product_scopes", 3760],
  ["warehouse_locations", 126],
  ["warehouse_product_locations", 1791],
  ["warehouse_inventory_balances", 116],
  ["warehouse_stock_movements", 1660],
]);

const failures = [];

function fail(message) {
  failures.push(message);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const countsResult = await client.query(`
    select 'catalog_products' as table_name, count(*)::int as count from public.catalog_products
    union all select 'catalog_vendors', count(*)::int from public.catalog_vendors
    union all select 'catalog_product_aliases', count(*)::int from public.catalog_product_aliases where source_app <> 'picking'
    union all select 'catalog_product_scopes', count(*)::int from public.catalog_product_scopes
    union all select 'warehouse_locations', count(*)::int from public.warehouse_locations
    union all select 'warehouse_product_locations', count(*)::int from public.warehouse_product_locations
    union all select 'warehouse_inventory_balances', count(*)::int from public.warehouse_inventory_balances
    union all select 'warehouse_stock_movements', count(*)::int from public.warehouse_stock_movements
  `);

  for (const row of countsResult.rows) {
    const expected = expectedCounts.get(row.table_name);
    if (row.count !== expected) {
      fail(`${row.table_name}: expected ${expected}, got ${row.count}`);
    }
  }

  const scopeResult = await client.query(`
    with scoped as (
      select
        p.id,
        bool_or(s.scope_type = 'business_unit' and s.scope_key = 'trd') as has_trd,
        bool_or(s.scope_type = 'business_unit' and s.scope_key = 'akra') as has_akra,
        bool_or(s.scope_type = 'warehouse' and s.scope_key = 'w5') as has_w5
      from public.catalog_products p
      left join public.catalog_product_scopes s on s.product_id = p.id and s.is_active
      group by p.id
    ),
    trd_alias_products as (
      select distinct product_id
      from public.catalog_product_aliases
      where source_app = 'akra-trd' and product_id is not null
    )
    select
      count(*) filter (where has_trd and not has_akra)::int as trd_only,
      count(*) filter (where has_akra and not has_trd)::int as akra_only,
      count(*) filter (where has_trd and has_akra)::int as akra_trd,
      count(*) filter (where not coalesce(has_trd, false) and not coalesce(has_akra, false))::int as unassigned,
      count(*) filter (where has_w5)::int as has_w5,
      (select count(*)::int from trd_alias_products) as trd_alias_products,
      (
        select count(*)::int
        from trd_alias_products tap
        join scoped s on s.id = tap.product_id
        where s.has_trd and s.has_akra
      ) as trd_alias_products_akra_trd,
      (
        select count(*)::int
        from trd_alias_products tap
        join scoped s on s.id = tap.product_id
        where s.has_trd and not s.has_akra
      ) as trd_alias_products_trd_only
    from scoped
  `);

  const scope = scopeResult.rows[0];
  const expectedScope = {
    trd_only: 45,
    akra_only: 36,
    akra_trd: 1791,
    unassigned: 2921,
    has_w5: 97,
    trd_alias_products: 1791,
    trd_alias_products_akra_trd: 1791,
    trd_alias_products_trd_only: 0,
  };

  for (const [key, expected] of Object.entries(expectedScope)) {
    if (scope[key] !== expected) {
      fail(`${key}: expected ${expected}, got ${scope[key]}`);
    }
  }

  const warehouseResult = await client.query(`
    select warehouse_key, business_unit
    from public.warehouse_warehouses
    where warehouse_key in ('w1', 'w2', 'w3', 'w4', 'w5', 'c1', 'c2')
    order by warehouse_key
  `);

  const expectedWarehouseUnits = new Map([
    ["w1", "trd"],
    ["w2", "akra"],
    ["w3", "akra"],
    ["w4", "akra"],
    ["w5", "akra"],
    ["c1", "akra"],
    ["c2", "akra"],
  ]);

  for (const row of warehouseResult.rows) {
    if (row.business_unit !== expectedWarehouseUnits.get(row.warehouse_key)) {
      fail(
        `${row.warehouse_key}: expected ${expectedWarehouseUnits.get(row.warehouse_key)}, got ${row.business_unit}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("Catalog import verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Catalog import verification passed (${expectedCounts.get("catalog_products")} products, ${expectedCounts.get("catalog_product_scopes")} scopes).`,
  );
} finally {
  await client.end().catch(() => {});
}
