import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationDir = join(root, "supabase", "migrations");

const migrationFiles = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const migrations = new Map(
  migrationFiles.map((name) => [
    name,
    readFileSync(join(migrationDir, name), "utf8"),
  ]),
);

const allSql = [...migrations.values()].join("\n");
const failures = [];

function fail(message) {
  failures.push(message);
}

function unique(values) {
  return [...new Set(values)];
}

function extractAll(regex, text, group = 1) {
  return [...text.matchAll(regex)].map((match) => match[group]);
}

function normalizeSqlList(text) {
  return text
    .split(",")
    .map((item) => item.trim().replace(/^public\./, ""))
    .filter(Boolean);
}

function assertSame(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    fail(`${label} mismatch\n  actual:   ${actualJson}\n  expected: ${expectedJson}`);
  }
}

const publicTables = unique(
  extractAll(/\bcreate table public\.([a-z_]+)/gi, allSql),
).sort();

const rlsTables = unique(
  extractAll(/\balter table public\.([a-z_]+)\s+enable row level security;/gi, allSql),
).sort();

assertSame("RLS-enabled public tables", rlsTables, publicTables);

const revokeTables = unique(
  extractAll(
    /\brevoke\s+all\s+on\s+([^;]+?)\s+from\s+public,\s*anon,\s*authenticated;/gi,
    allSql,
  ).flatMap(normalizeSqlList),
).sort();

assertSame("public/anon/authenticated table revokes", revokeTables, publicTables);

const grantBlocks = extractAll(
  /\bgrant\s+([\s\S]+?)\s+on\s+([\s\S]+?)\s+to\s+([a-z_,\s]+);/gi,
  allSql,
  0,
);

if (/\bgrant\b[\s\S]+?\bto\s+anon\b/i.test(allSql)) {
  fail("No migration should grant table/function access to anon yet.");
}

const serviceRoleTables = unique(
  grantBlocks.flatMap((block) => {
    const match = block.match(
      /\bgrant\s+select,\s*insert,\s*update,\s*delete\s+on\s+([\s\S]+?)\s+to\s+service_role;/i,
    );

    return match ? normalizeSqlList(match[1]) : [];
  }),
).sort();

assertSame("service_role table grants", serviceRoleTables, publicTables);

const authenticatedSelectTables = unique(
  grantBlocks.flatMap((block) => {
    const match = block.match(/\bgrant\s+select\s+on\s+([\s\S]+?)\s+to\s+authenticated;/i);

    return match ? normalizeSqlList(match[1]) : [];
  }),
).sort();

const expectedServerOnlyTables = [
  "picking_daily_sequences",
  "picking_requisition_secrets",
  "picking_staff_line_accounts",
];

for (const table of expectedServerOnlyTables) {
  if (authenticatedSelectTables.includes(table)) {
    fail(`${table} must not be granted authenticated SELECT access.`);
  }
}

const securityDefinerFunctions = extractAll(
  /\bcreate or replace function\s+([a-z_]+\.[a-z_]+)\s*\([^)]*\)[\s\S]*?\$\$;/gi,
  allSql,
  0,
);

for (const block of securityDefinerFunctions) {
  if (!/\bsecurity definer\b/i.test(block)) {
    continue;
  }

  const name = block.match(/\bcreate or replace function\s+([a-z_]+\.[a-z_]+)/i)?.[1];

  if (!name) {
    fail("Unable to parse security definer function name.");
    continue;
  }

  if (!name.startsWith("private.")) {
    fail(`${name} is SECURITY DEFINER but not in the private schema.`);
  }

  if (!/\bset search_path\s*=\s*''/i.test(block)) {
    fail(`${name} is SECURITY DEFINER without set search_path = ''.`);
  }
}

function normalizeFunctionSignature(name, args) {
  const argTypes = args
    .split(",")
    .map((arg) => arg.trim())
    .filter(Boolean)
    .map((arg) => {
      const parts = arg.split(/\s+/);
      return parts.at(-1);
    });

  return `${name}(${argTypes.join(", ")})`;
}

const privateFunctionMatches = [
  ...allSql.matchAll(/\bcreate or replace function\s+(private\.[a-z_]+)\s*\(([^)]*)\)/gi),
];

const privateFunctions = unique(
  privateFunctionMatches.map((match) => normalizeFunctionSignature(match[1], match[2])),
);

for (const signature of privateFunctions) {
  const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const revokePublicRegex = new RegExp(`revoke all on function\\s+${escaped}\\s+from\\s+public;`, "i");
  const grantAnonRegex = new RegExp(`grant execute on function\\s+${escaped}\\s+to\\s+[^;]*\\banon\\b`, "i");

  if (!revokePublicRegex.test(allSql)) {
    fail(`${signature} must revoke default execute from public.`);
  }

  if (grantAnonRegex.test(allSql)) {
    fail(`${signature} must not grant EXECUTE to anon.`);
  }
}

const expectedPrivateFunctionGrants = new Map([
  ["private.is_admin(uuid)", ["authenticated"]],
  ["private.has_permission(uuid, text)", ["authenticated"]],
  ["private.next_picking_bill_no(date)", ["service_role"]],
  ["private.handle_new_user()", []],
]);

for (const [signature, allowedRoles] of expectedPrivateFunctionGrants) {
  const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const grantMatches = [
    ...allSql.matchAll(new RegExp(`grant execute on function\\s+${escaped}\\s+to\\s+([^;]+);`, "gi")),
  ];
  const grantedRoles = grantMatches.flatMap((match) =>
    match[1].split(",").map((role) => role.trim()).filter(Boolean),
  );

  assertSame(`${signature} EXECUTE grants`, grantedRoles.sort(), allowedRoles.sort());
}

const permissionSeedSql = migrations.get("0003_core_seed.sql") ?? "";
const seededPermissions = extractAll(/\('([a-z]+\.[a-z]+)'\s*,/g, permissionSeedSql);
const permissionTypes = extractAll(
  /\|\s+"([a-z]+\.[a-z]+)"/g,
  readFileSync(join(root, "src", "modules", "auth", "permissions.ts"), "utf8"),
);

assertSame("permission seed keys", seededPermissions, permissionTypes);

const seededApps = extractAll(/\('([a-z]+)'\s*,\s*'[^']+'\s*,/g, permissionSeedSql);
const fallbackApps = extractAll(
  /key:\s+"([a-z]+)"/g,
  readFileSync(join(root, "src", "modules", "core", "app-registry.ts"), "utf8"),
);

assertSame("app registry seed keys", seededApps, fallbackApps);

if (failures.length > 0) {
  console.error("Migration checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Migration checks passed (${publicTables.length} public tables, ${permissionTypes.length} permissions).`);
