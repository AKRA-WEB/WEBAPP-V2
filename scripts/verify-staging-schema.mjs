import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const root = process.cwd();
const migrationDir = join(root, "supabase", "migrations");
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

function extractAll(regex, text, group = 1) {
  return [...text.matchAll(regex)].map((match) => match[group]);
}

function unique(values) {
  return [...new Set(values)];
}

const migrationSql = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(migrationDir, name), "utf8"))
  .join("\n");

const expectedTables = unique(
  extractAll(/\bcreate table public\.([a-z_]+)/gi, migrationSql),
).sort();

const expectedSeedCounts = {
  apps: 8,
  permissions: 13,
};

const serverOnlyTables = new Set([
  "picking_daily_sequences",
  "picking_requisition_secrets",
  "picking_staff_line_accounts",
]);

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const failures = [];

function fail(message) {
  failures.push(message);
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    fail(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertSetEqual(label, actual, expected) {
  const actualJson = JSON.stringify([...actual].sort());
  const expectedJson = JSON.stringify([...expected].sort());

  if (actualJson !== expectedJson) {
    fail(`${label}: expected ${expectedJson}, got ${actualJson}`);
  }
}

try {
  await client.connect();

  const tableResult = await client.query(
    `
      select c.relname as table_name, c.relrowsecurity as rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any($1::text[])
      order by c.relname
    `,
    [expectedTables],
  );

  const foundTables = tableResult.rows.map((row) => row.table_name);
  assertSetEqual("public tables", foundTables, expectedTables);

  for (const row of tableResult.rows) {
    if (!row.rls_enabled) {
      fail(`RLS is not enabled on public.${row.table_name}`);
    }
  }

  const grantsResult = await client.query(
    `
      select table_name, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, grantee, privilege_type
    `,
    [expectedTables],
  );

  const grants = grantsResult.rows;
  const anonGrants = grants.filter((row) => row.grantee === "anon");
  assertEqual("anon table grants", anonGrants.length, 0);

  const serverOnlyAuthenticatedGrants = grants.filter(
    (row) =>
      row.grantee === "authenticated" && serverOnlyTables.has(row.table_name),
  );
  assertEqual(
    "authenticated grants on server-only tables",
    serverOnlyAuthenticatedGrants.length,
    0,
  );

  for (const table of expectedTables) {
    const servicePrivileges = new Set(
      grants
        .filter((row) => row.table_name === table && row.grantee === "service_role")
        .map((row) => row.privilege_type),
    );

    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      if (!servicePrivileges.has(privilege)) {
        fail(`service_role missing ${privilege} on public.${table}`);
      }
    }
  }

  const policyResult = await client.query(
    `
      select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, policyname
    `,
    [expectedTables],
  );

  const tablesWithPolicies = new Set(
    policyResult.rows.map((row) => row.tablename),
  );

  for (const table of expectedTables) {
    if (serverOnlyTables.has(table)) {
      continue;
    }

    if (!tablesWithPolicies.has(table)) {
      fail(`No RLS policy found on public.${table}`);
    }
  }

  const seedResult = await client.query(
    `
      select
        (select count(*)::int from public.permissions) as permissions,
        (select count(*)::int from public.apps) as apps
    `,
  );

  assertEqual(
    "permission seed count",
    seedResult.rows[0].permissions,
    expectedSeedCounts.permissions,
  );
  assertEqual("app seed count", seedResult.rows[0].apps, expectedSeedCounts.apps);

  const functionResult = await client.query(`
    select n.nspname as schema_name, p.proname as function_name, p.prosecdef as security_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'private' and p.proname in ('is_admin', 'has_permission', 'handle_new_user', 'next_picking_bill_no'))
       or (n.nspname = 'public' and p.proname = 'set_updated_at')
    order by n.nspname, p.proname
  `);

  const functionNames = functionResult.rows.map(
    (row) => `${row.schema_name}.${row.function_name}`,
  );
  assertSetEqual("expected functions", functionNames, [
    "private.handle_new_user",
    "private.has_permission",
    "private.is_admin",
    "private.next_picking_bill_no",
    "public.set_updated_at",
  ]);

  for (const row of functionResult.rows) {
    if (row.schema_name === "private" && !row.security_definer) {
      fail(`${row.schema_name}.${row.function_name} is not security definer`);
    }
  }

  if (failures.length > 0) {
    console.error(`Schema verification failed (${failures.length}):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Schema verification passed (${expectedTables.length} public tables, ${policyResult.rows.length} policies).`,
  );
} finally {
  await client.end().catch(() => {});
}
