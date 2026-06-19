import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";


const root = process.cwd();
const snapshotsDir = join(root, "import-snapshots");
const reportsDir = join(root, "import-reports");

// Step 1: Ensure directories exist
if (!existsSync(snapshotsDir)) {
  mkdirSync(snapshotsDir);
}
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}

// Write synthetic fixtures if empty to ensure the script is instantly runnable
const userFixturePath = join(snapshotsDir, "User.csv");
const roleConfigFixturePath = join(snapshotsDir, "RoleConfig.csv");
const permConfigFixturePath = join(snapshotsDir, "PermConfig.csv");
const appConfigFixturePath = join(snapshotsDir, "AppConfig.csv");

if (!existsSync(userFixturePath)) {
  writeFileSync(
    userFixturePath,
    `id,name,roles,Password\n001,Somchai,SUPERVISOR,pbkdf2_sha256$20000$pepper$hash1\n002,Anong,AKRA,pbkdf2_sha256$20000$pepper$hash2\n003,V1Admin,ADMIN,pbkdf2_sha256$20000$pepper$hash3\n004,NoRoleUser,,\n005,DuplicateName,TRD,\n006,DuplicateName,WAREHOUSE,\n`,
    "utf8"
  );
  console.log(`Created sample fixture User.csv`);
}
if (!existsSync(roleConfigFixturePath)) {
  writeFileSync(
    roleConfigFixturePath,
    `role\nADMIN\nSUPERVISOR\nAKRA\nTRD\nWAREHOUSE\nCashier\n`,
    "utf8"
  );
  console.log(`Created sample fixture RoleConfig.csv`);
}
if (!existsSync(permConfigFixturePath)) {
  writeFileSync(
    permConfigFixturePath,
    `AppID,PermKey,ADMIN,SUPERVISOR,AKRA,TRD,WAREHOUSE,Cashier\napp-gr,receiveGR,TRUE,TRUE,FALSE,FALSE,TRUE,FALSE\napp-gr,approveGR,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE\napp-po,createPO,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE\napp-po,approvePR,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE\napp-ret,ADD_RET,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE\napp-ret,QC_RET,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE\napp-kpi,adminDashboard,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE\n`,
    "utf8"
  );
  console.log(`Created sample fixture PermConfig.csv`);
}
if (!existsSync(appConfigFixturePath)) {
  writeFileSync(
    appConfigFixturePath,
    `AppID,ADMIN,SUPERVISOR,AKRA,TRD,WAREHOUSE,Cashier\napp-gr,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE\napp-po,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE\napp-ret,TRUE,TRUE,TRUE,TRUE,TRUE,FALSE\napp-kpi,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE\n`,
    "utf8"
  );
  console.log(`Created sample fixture AppConfig.csv`);
}

// Load Supabase config if available for DB-side validation
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
if (existsSync(join(root, ".env.local"))) {
  const envText = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const matchUrl = line.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/);
    const matchKey = line.match(/^\s*SUPABASE_SECRET_KEY\s*=\s*(.+)$/);
    if (matchUrl) supabaseUrl = matchUrl[1].trim();
    if (matchKey) supabaseSecretKey = matchKey[1].trim();
  }
}


// Baseline V2 permissions if database not connected
const baselineV2Permissions = new Set([
  "core.admin",
  "picking.read",
  "picking.write",
  "purchasing.read",
  "purchasing.write",
  "receiving.read",
  "receiving.write",
  "warehouse.read",
  "warehouse.write",
  "returns.read",
  "returns.write",
  "kpi.read",
  "kpi.write",
]);

// Baseline V2 roles if database not connected
const baselineV2Roles = new Set(["ADMIN", "PICKING_WRITER", "PICKING_READER", "GUEST"]);

// V1 to V2 permission mappings
const v1ToV2PermissionMap = {
  "app-gr.receiveGR": "receiving.write",
  "app-gr.approveGR": "receiving.write",
  "app-po.createPO": "purchasing.write",
  "app-po.approvePR": "purchasing.write",
  "app-po.closePO": "purchasing.write",
  "app-ret.ADD_RET": "returns.write",
  "app-ret.QC_RET": "returns.write",
  "app-ret.MANAGE_CLM": "returns.write",
  "app-ret.AUDIT_TASK": "returns.write",
  "app-kpi.adminDashboard": "kpi.write",
  "app-pick.createRequisition": "picking.write",
  "app-pick.readRequisition": "picking.read",
};

// CSV parsing helper
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
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
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

async function run() {
  console.log("=== AKRA V2 Core Import Dry Run ===");

  let dbRoles = baselineV2Roles;
  let dbPermissions = baselineV2Permissions;
  let dbConnected = false;

  if (supabaseUrl && supabaseSecretKey) {
    console.log("Connecting to staging database via Supabase API to fetch current roles and permissions...");
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: roleRes, error: roleErr } = await supabaseClient
        .from("roles")
        .select("key");
      
      const { data: permRes, error: permErr } = await supabaseClient
        .from("permissions")
        .select("key");

      if (roleErr || permErr) {
        throw new Error(roleErr?.message || permErr?.message);
      }

      dbRoles = new Set(roleRes.map((r) => r.key));
      dbPermissions = new Set(permRes.map((p) => p.key));
      dbConnected = true;
      console.log(`Connected. Found ${dbRoles.size} roles and ${dbPermissions.size} permissions in database.`);
    } catch (err) {
      console.warn(`Database connection failed: ${err.message}. Using baseline V2 fallbacks.`);
    }
  } else {
    console.log("Supabase URL or Secret Key not configured. Running with static V2 fallbacks.");
  }


  // Read V1 snapshots
  let userSnapshot, roleConfigSnapshot, permConfigSnapshot, appConfigSnapshot;
  try {
    userSnapshot = parseCSV(readFileSync(userFixturePath, "utf8"));
    roleConfigSnapshot = parseCSV(readFileSync(roleConfigFixturePath, "utf8"));
    permConfigSnapshot = parseCSV(readFileSync(permConfigFixturePath, "utf8"));
    appConfigSnapshot = parseCSV(readFileSync(appConfigFixturePath, "utf8"));
  } catch (err) {
    console.error(`Failed to read V1 snapshots: ${err.message}`);
    process.exit(1);
  }

  const blockers = [];
  const warnings = [];

  // Validate headers
  const requiredHeaders = {
    User: ["id", "name", "roles"],
    RoleConfig: ["role"],
    PermConfig: ["AppID", "PermKey"],
    AppConfig: ["AppID"],
  };

  for (const [key, headers] of Object.entries(requiredHeaders)) {
    const snap = key === "User" ? userSnapshot : key === "RoleConfig" ? roleConfigSnapshot : key === "PermConfig" ? permConfigSnapshot : appConfigSnapshot;
    for (const h of headers) {
      if (!snap.headers.includes(h)) {
        blockers.push(`Missing header "${h}" in ${key}.csv`);
      }
    }
  }

  if (blockers.length > 0) {
    console.error(`Validation blocked by missing headers:`);
    blockers.forEach((b) => console.error(`- ${b}`));
    process.exit(1);
  }

  // 1. Process V1 Roles Catalog
  const v1Roles = new Set();
  roleConfigSnapshot.rows.forEach((r) => {
    if (r.role) v1Roles.add(r.role.trim().toUpperCase());
  });

  // Extract roles found in users just in case
  userSnapshot.rows.forEach((u) => {
    if (u.roles) {
      u.roles.split(",").forEach((role) => {
        const cleaned = role.trim().toUpperCase();
        if (cleaned) v1Roles.add(cleaned);
      });
    }
  });

  // 2. Validate users
  const importedUsers = [];
  const usernames = new Set();
  const userIds = new Set();

  userSnapshot.rows.forEach((u, idx) => {
    const lineNum = idx + 2;
    if (!u.id) {
      blockers.push(`User line ${lineNum}: Missing "id"`);
      return;
    }
    if (!u.name) {
      blockers.push(`User line ${lineNum} (ID: ${u.id}): Missing "name"`);
      return;
    }

    if (userIds.has(u.id)) {
      blockers.push(`User line ${lineNum}: Duplicate user ID "${u.id}"`);
    }
    userIds.add(u.id);

    if (usernames.has(u.name.toLowerCase())) {
      warnings.push(`User line ${lineNum}: Duplicate display name "${u.name}" (case-insensitive)`);
    }
    usernames.add(u.name.toLowerCase());

    const rolesList = u.roles
      ? u.roles
          .split(",")
          .map((r) => r.trim().toUpperCase())
          .filter(Boolean)
      : [];

    rolesList.forEach((r) => {
      if (!v1Roles.has(r)) {
        warnings.push(`User "${u.name}": Assigned role "${r}" not listed in RoleConfig.csv`);
      }
    });

    // Propose synthetic email address
    // Strip special characters and spaces, map to @akra-v2.test
    const safeName = u.name.toLowerCase().replace(/[^a-z0-9_.-]/gi, "");
    const syntheticEmail = `${safeName || "user_" + u.id}@akra-v2.test`;

    importedUsers.push({
      legacy_uid: u.id,
      display_name: u.name,
      synthetic_email: syntheticEmail,
      v1_roles: rolesList,
    });
  });

  // 3. Validate permissions from PermConfig
  const mappedPermissionsCount = { mapped: 0, unmapped: 0 };
  const rolePermissionsToInsert = [];
  const unmappedV1Permissions = new Set();

  // Find role columns in PermConfig.csv (all columns except AppID and PermKey)
  const permRoleCols = permConfigSnapshot.headers.filter(
    (h) => h !== "AppID" && h !== "PermKey"
  );

  permConfigSnapshot.rows.forEach((p, idx) => {
    const lineNum = idx + 2;
    const appId = p.AppID.trim();
    const permKey = p.PermKey.trim();
    const compositeKey = `${appId}.${permKey}`;

    const v2Perm = v1ToV2PermissionMap[compositeKey];

    if (!v2Perm) {
      unmappedV1Permissions.add(compositeKey);
      mappedPermissionsCount.unmapped++;
      warnings.push(`Permission line ${lineNum}: V1 permission "${compositeKey}" has no mapped V2 permission key.`);
      return;
    }

    if (!dbPermissions.has(v2Perm)) {
      blockers.push(
        `Permission line ${lineNum}: Mapped V2 permission "${v2Perm}" does not exist in V2 Schema catalog.`
      );
    }
    mappedPermissionsCount.mapped++;

    // For each role in PermConfig, if truthy, map it
    permRoleCols.forEach((roleCol) => {
      const isGranted = ["true", "yes", "1", "t", "y"].includes(p[roleCol].trim().toLowerCase());
      if (isGranted) {
        const v2RoleName = roleCol.trim().toUpperCase();
        rolePermissionsToInsert.push({
          v2_role: v2RoleName,
          v2_permission: v2Perm,
          source_v1: compositeKey,
        });
      }
    });
  });

  // Check which V1 roles do not exist in V2 DB
  const missingV2Roles = [];
  v1Roles.forEach((role) => {
    if (!dbRoles.has(role)) {
      missingV2Roles.push(role);
    }
  });

  // Generate Report
  const reportPath = join(reportsDir, "dry-run-report.md");
  let reportText = `# Core Import Dry Run Report

**Date:** ${new Date().toISOString()}
**Database Status:** ${dbConnected ? "Connected to Staging" : "Statically Checked (No database connected)"}

## 1. Summary Metrics

| Metric | Count | Notes |
| --- | --- | --- |
| **V1 Users parsed** | ${userSnapshot.rows.length} | Source: User.csv |
| **Valid users proposed for import** | ${importedUsers.length} | Will upsert to \`public.profiles\` and create auth users |
| **Proposed synthetic email domains** | ${importedUsers.length} proposed | Defaulting to \`@akra-v2.test\` |
| **V1 Roles identified** | ${v1Roles.size} | Derived from User.roles & RoleConfig.csv |
| **Missing V2 roles to be created** | ${missingV2Roles.length} | Roles needing creation in V2 before user role mapping |
| **V1 Permission matrix rows** | ${permConfigSnapshot.rows.length} | Source: PermConfig.csv |
| **Mapped to V2 permissions** | ${mappedPermissionsCount.mapped} | Successfully mapped |
| **Unmapped V1 permissions** | ${mappedPermissionsCount.unmapped} | Dropped or flagged |

## 2. Issues & Blockers

### 🛑 Blockers (${blockers.length})
${blockers.length === 0 ? "*None found.*" : blockers.map((b) => `- ${b}`).join("\n")}

### ⚠️ Warnings (${warnings.length})
${warnings.length === 0 ? "*None found.*" : warnings.map((w) => `- ${w}`).join("\n")}

## 3. Detailed Proposed Database Changes

### A. Profiles & Auth Users (\`public.profiles\`)
Every V1 user needs a unique email in Supabase Auth. The following mapping is proposed:

| Legacy UID | V1 Display Name | Proposed Synthetic Email | Assigned V1 Roles |
| --- | --- | --- | --- |
${importedUsers
  .map(
    (u) =>
      `| \`${u.legacy_uid}\` | ${u.display_name} | \`${u.synthetic_email}\` | ${u.v1_roles.map((r) => `\`${r}\``).join(", ") || "*None*"} |`
  )
  .join("\n")}

### B. Roles catalog (\`public.roles\`)
The following V1 roles must be created in V2:

| Role Key | Status | Action Required |
| --- | --- | --- |
${[...v1Roles]
  .map((r) => {
    const exists = dbRoles.has(r);
    return `| \`${r}\` | ${exists ? "✅ Already in V2" : "➕ Missing in V2"} | ${
      exists ? "None" : `Create role \`${r}\` in V2 schema`
    } |`;
  })
  .join("\n")}

### C. Permission Assignments (\`public.role_permissions\`)
The following permission grants will be mapped and applied:

| Role | Mapped V2 Permission | V1 Source Rule |
| --- | --- | --- |
${rolePermissionsToInsert
  .map((rp) => `| \`${rp.v2_role}\` | \`${rp.v2_permission}\` | Derived from \`${rp.source_v1}\` |`)
  .join("\n")}

### D. Unmapped V1 Permissions
The following V1 permission keys will **NOT** be imported:

| V1 Permission Key | Notes |
| --- | --- |
${[...unmappedV1Permissions].map((p) => `| \`${p}\` | No mapping rule found |`).join("\n")}
`;

  writeFileSync(reportPath, reportText, "utf8");

  // Output to console
  console.log(`\nDry run completed!`);
  console.log(`- Blockers: ${blockers.length}`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Report written to: ${reportPath}`);

  if (blockers.length > 0) {
    console.error("\n❌ Dry run failed due to blocking validation issues. Please check the report.");
    process.exit(1);
  } else {
    console.log("\n✅ Dry run passed! Ready for staging import script preparation.");
  }
}

run().catch((err) => {
  console.error("Fatal error during dry run:", err);
  process.exit(1);
});
