import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";
const shouldTerminate = process.argv.includes("--terminate");
const confirmed = process.argv.includes("--confirm-staging-lock-cleanup");

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

if (shouldTerminate && !confirmed) {
  console.error("Refusing to terminate connections without --confirm-staging-lock-cleanup.");
  process.exit(1);
}

if (
  shouldTerminate &&
  !databaseUrl.includes(STAGING_PROJECT_REF) &&
  process.env.AKRA_ALLOW_NON_STAGING_IMPORT !== "true"
) {
  console.error("Refusing to terminate connections because DATABASE_URL does not target the known staging project.");
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to database. Checking for active backend connections...");

  // Find all other connections that might be holding locks
  const res = await client.query(`
    select pid, usename, client_addr, state, query, age(clock_timestamp(), query_start) as age
    from pg_stat_activity
    where pid <> pg_backend_pid()
      and datname = current_database()
  `);

  if (res.rows.length === 0) {
    console.log("No other active database connections found.");
  } else {
    console.log(`Found ${res.rows.length} other database connections:`);
    for (const row of res.rows) {
      console.log(`- PID: ${row.pid}, User: ${row.usename}, State: ${row.state}, Age: ${row.age}`);
      console.log(`  Query: ${row.query}`);

      if (row.state === 'active' || row.state === 'idle in transaction' || row.state === 'idle') {
        if (!shouldTerminate) {
          console.log(`  Dry run: would terminate backend session PID ${row.pid}.`);
          continue;
        }

        console.log(`  Terminating backend session PID ${row.pid}...`);
        try {
          await client.query("select pg_terminate_backend($1)", [row.pid]);
          console.log(`  Successfully terminated PID ${row.pid}.`);
        } catch (err) {
          console.error(`  Failed to terminate PID ${row.pid}: ${err.message}`);
        }
      }
    }
  }

  await client.end();
}

run().catch(console.error);
