import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const root = process.cwd();
const migrationDir = join(root, "supabase", "migrations");
const allMigrationFiles = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const requestedFiles = process.argv.slice(2);
const migrationFiles = requestedFiles.length > 0 ? requestedFiles : allMigrationFiles;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (migrationFiles.length === 0) {
  console.error("No migration SQL files found.");
  process.exit(1);
}

for (const file of migrationFiles) {
  if (!allMigrationFiles.includes(file)) {
    console.error(`Migration file not found: ${file}`);
    process.exit(1);
  }
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

function log(message) {
  process.stdout.write(`${message}\n`);
}

try {
  await client.connect();
  const identity = await client.query(
    "select current_database() as database, current_user as user",
  );
  log(
    `Connected to ${identity.rows[0].database} as ${identity.rows[0].user}.`,
  );

  await client.query("begin");

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationDir, file), "utf8");
    log(`Applying ${file}...`);
    await client.query(sql);
  }

  await client.query("commit");
  log(`Applied ${migrationFiles.length} migration files.`);

  const sanity = await client.query(`
    select
      (select count(*)::int from information_schema.tables where table_schema = 'public') as public_tables,
      (select count(*)::int from public.permissions) as permissions,
      (select count(*)::int from public.apps) as apps,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private') as private_functions
  `);

  const row = sanity.rows[0];
  log(
    `Sanity: public_tables=${row.public_tables}, permissions=${row.permissions}, apps=${row.apps}, private_functions=${row.private_functions}`,
  );
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // Ignore rollback failures so the original error stays visible.
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
