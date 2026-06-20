import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const realDataDir = join(root, "import-data", "main");
const reportsDir = join(root, "import-reports");

const realUserPath = join(realDataDir, "Main Menu - User.csv");
const realRoleConfigPath = join(realDataDir, "Main Menu - RoleConfig.csv");
const realPermConfigPath = join(realDataDir, "Main Menu - PermConfig.csv");

const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";
const REQUIRED_IMPORT_FLAG = "--confirm-core-import";
const LEGACY_SOURCE = "v1-main";

// V1 to V2 permission mappings. Must stay in sync with scripts/core-import-dry-run.mjs.
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
  "app-ret.ADD_CLM": "returns.write",
  "app-ret.WH_CLM": "returns.write",
  "app-ret.AUDIT_CREATE": "returns.write",
  "app-ret.AUDIT_REVIEW": "returns.write",
  "app-ret.BATCH_RET": "returns.write",
  "app-ret.TRACK_CUST": "returns.write",
  "app-kpi.adminDashboard": "kpi.write",
  "app-pick.createRequisition": "picking.write",
  "app-pick.readRequisition": "picking.read",
};

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
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

function buildHeaderIndex(headers) {
  const index = {};
  headers.forEach((h) => {
    index[h.toLowerCase()] = h;
  });
  return index;
}

function getField(row, headerIndex, ...candidates) {
  for (const candidate of candidates) {
    const actualHeader = headerIndex[candidate.toLowerCase()];
    if (actualHeader !== undefined) return row[actualHeader] ?? "";
  }
  return "";
}

function readEnvLocal() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let secretKey = process.env.SUPABASE_SECRET_KEY;
  if (existsSync(join(root, ".env.local"))) {
    const envText = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const matchUrl = line.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/);
      const matchKey = line.match(/^\s*SUPABASE_SECRET_KEY\s*=\s*(.+)$/);
      if (matchUrl) url = matchUrl[1].trim();
      if (matchKey) secretKey = matchKey[1].trim();
    }
  }
  return { url, secretKey };
}

async function run() {
  console.log("=== AKRA V2 Core Import Apply (writes to staging) ===");

  if (!process.argv.includes(REQUIRED_IMPORT_FLAG)) {
    console.error(`Refusing to write without ${REQUIRED_IMPORT_FLAG}.`);
    process.exit(1);
  }

  if (![realUserPath, realRoleConfigPath, realPermConfigPath].every(existsSync)) {
    console.error(`Real V1 export files not found under ${realDataDir}. Run scripts/core-import-dry-run.mjs first.`);
    process.exit(1);
  }

  const { url, secretKey } = readEnvLocal();
  if (!url || !secretKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
    process.exit(1);
  }
  if (!url.includes(STAGING_PROJECT_REF)) {
    console.error(`Refusing to write: NEXT_PUBLIC_SUPABASE_URL does not target the known staging project (${STAGING_PROJECT_REF}).`);
    process.exit(1);
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userSnapshot = parseCSV(readFileSync(realUserPath, "utf8"));
  const roleConfigSnapshot = parseCSV(readFileSync(realRoleConfigPath, "utf8"));
  const permConfigSnapshot = parseCSV(readFileSync(realPermConfigPath, "utf8"));

  const userHeaderIndex = buildHeaderIndex(userSnapshot.headers);
  const roleConfigHeaderIndex = buildHeaderIndex(roleConfigSnapshot.headers);
  const permConfigHeaderIndex = buildHeaderIndex(permConfigSnapshot.headers);

  // 1. Build proposed users (same synthetic-email scheme as the dry run, keyed on V1 id).
  const importedUsers = userSnapshot.rows.map((u) => {
    const id = getField(u, userHeaderIndex, "id");
    const name = getField(u, userHeaderIndex, "name");
    const roles = getField(u, userHeaderIndex, "roles");
    const safeName = name.toLowerCase().replace(/[^a-z0-9_.-]/gi, "") || "user";
    const safeId = String(id).toLowerCase().replace(/[^a-z0-9_.-]/gi, "");
    return {
      legacy_uid: id,
      display_name: name,
      synthetic_email: `${safeName}.${safeId}@akra-v2.test`,
      v1_roles: roles
        ? roles.split(",").map((r) => r.trim().toUpperCase()).filter(Boolean)
        : [],
    };
  });

  // 2. Role catalog: upsert any V1 role not already present in public.roles.
  const roleConfigByKey = new Map();
  roleConfigSnapshot.rows.forEach((r) => {
    const key = getField(r, roleConfigHeaderIndex, "role", "val").trim().toUpperCase();
    if (!key) return;
    roleConfigByKey.set(key, {
      name: getField(r, roleConfigHeaderIndex, "label") || key,
      description: getField(r, roleConfigHeaderIndex, "desc") || null,
    });
  });

  const v1RoleKeys = new Set();
  roleConfigByKey.forEach((_, key) => v1RoleKeys.add(key));
  importedUsers.forEach((u) => u.v1_roles.forEach((r) => v1RoleKeys.add(r)));

  const { data: existingRoles, error: rolesReadError } = await admin.from("roles").select("id,key");
  if (rolesReadError) {
    console.error(`Failed to read roles: ${rolesReadError.message}`);
    process.exit(1);
  }

  const roleIdByKey = new Map(existingRoles.map((r) => [r.key, r.id]));
  const rolesToCreate = [...v1RoleKeys]
    .filter((key) => !roleIdByKey.has(key))
    .map((key) => ({
      key,
      name: roleConfigByKey.get(key)?.name ?? key,
      description: roleConfigByKey.get(key)?.description ?? null,
      legacy_source: LEGACY_SOURCE,
    }));

  if (rolesToCreate.length > 0) {
    const { data: createdRoles, error: createRolesError } = await admin
      .from("roles")
      .upsert(rolesToCreate, { onConflict: "key" })
      .select("id,key");
    if (createRolesError) {
      console.error(`Failed to create roles: ${createRolesError.message}`);
      process.exit(1);
    }
    createdRoles.forEach((r) => roleIdByKey.set(r.key, r.id));
    console.log(`Created ${rolesToCreate.length} role(s): ${rolesToCreate.map((r) => r.key).join(", ")}`);
  }

  // 3. Role-permission grants: resolve V2 permission ids, dedupe (role,permission) pairs.
  const { data: permissions, error: permsReadError } = await admin.from("permissions").select("id,key");
  if (permsReadError) {
    console.error(`Failed to read permissions: ${permsReadError.message}`);
    process.exit(1);
  }
  const permIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const permRoleCols = permConfigSnapshot.headers.filter(
    (h) => h !== permConfigHeaderIndex["appid"] && h !== permConfigHeaderIndex["permkey"]
  );

  const rolePermissionPairs = new Map(); // `${roleKey}|${permKey}` -> {role_id, permission_id}
  permConfigSnapshot.rows.forEach((p) => {
    const appId = getField(p, permConfigHeaderIndex, "AppID").trim();
    const permKey = getField(p, permConfigHeaderIndex, "PermKey").trim();
    const v2Perm = v1ToV2PermissionMap[`${appId}.${permKey}`];
    if (!v2Perm) return;
    const permissionId = permIdByKey.get(v2Perm);
    if (!permissionId) return;

    permRoleCols.forEach((roleCol) => {
      const isGranted = ["true", "yes", "1", "t", "y"].includes(p[roleCol].trim().toLowerCase());
      if (!isGranted) return;
      const roleKey = roleCol.trim().toUpperCase();
      const roleId = roleIdByKey.get(roleKey);
      if (!roleId) return;
      rolePermissionPairs.set(`${roleKey}|${v2Perm}`, { role_id: roleId, permission_id: permissionId });
    });
  });

  const rolePermissionRows = [...rolePermissionPairs.values()];
  if (rolePermissionRows.length > 0) {
    const { error: rolePermsError } = await admin
      .from("role_permissions")
      .upsert(rolePermissionRows, { onConflict: "role_id,permission_id" });
    if (rolePermsError) {
      console.error(`Failed to write role_permissions: ${rolePermsError.message}`);
      process.exit(1);
    }
    console.log(`Upserted ${rolePermissionRows.length} role_permissions grant(s).`);
  }

  // 4. Users: create auth user (no password) + profile + user_roles per V1 user.
  const userResults = [];
  for (const u of importedUsers) {
    let userId;

    const { data: existingProfile, error: profileLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("legacy_uid", u.legacy_uid)
      .eq("legacy_source", LEGACY_SOURCE)
      .maybeSingle();
    if (profileLookupError) {
      console.error(`Profile lookup failed for legacy_uid "${u.legacy_uid}": ${profileLookupError.message}`);
      process.exit(1);
    }

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: u.synthetic_email,
        email_confirm: true,
      });
      if (createError) {
        const alreadyExists = /already.*registered|already exists/i.test(createError.message);
        if (!alreadyExists) {
          console.error(`Create user failed for "${u.synthetic_email}": ${createError.message}`);
          process.exit(1);
        }
        const { data: byEmail, error: byEmailError } = await admin
          .from("profiles")
          .select("id")
          .eq("email", u.synthetic_email)
          .maybeSingle();
        if (byEmailError || !byEmail) {
          console.error(`Could not resolve existing auth user for "${u.synthetic_email}": ${byEmailError?.message ?? "not found"}`);
          process.exit(1);
        }
        userId = byEmail.id;
      } else {
        userId = created.user.id;
      }
    }

    const { error: profileUpsertError } = await admin
      .from("profiles")
      .update({
        display_name: u.display_name,
        legacy_uid: u.legacy_uid,
        legacy_source: LEGACY_SOURCE,
      })
      .eq("id", userId);
    if (profileUpsertError) {
      console.error(`Profile update failed for "${u.synthetic_email}": ${profileUpsertError.message}`);
      process.exit(1);
    }

    const roleAssignments = u.v1_roles
      .map((r) => roleIdByKey.get(r))
      .filter(Boolean)
      .map((roleId) => ({ user_id: userId, role_id: roleId }));

    if (roleAssignments.length > 0) {
      const { error: userRolesError } = await admin
        .from("user_roles")
        .upsert(roleAssignments, { onConflict: "user_id,role_id" });
      if (userRolesError) {
        console.error(`user_roles upsert failed for "${u.synthetic_email}": ${userRolesError.message}`);
        process.exit(1);
      }
    }

    userResults.push({ ...u, user_id: userId });
    console.log(`OK  ${u.legacy_uid}  ${u.display_name}  -> ${u.synthetic_email}  roles=[${u.v1_roles.join(",")}]`);
  }

  const reportPath = join(reportsDir, "core-import-apply-report.md");
  const reportText = `# Core Import Apply Report

**Date:** ${new Date().toISOString()}
**Target:** Staging Supabase project \`${STAGING_PROJECT_REF}\`

- Roles created: ${rolesToCreate.length} (${rolesToCreate.map((r) => r.key).join(", ") || "none"})
- role_permissions upserted: ${rolePermissionRows.length}
- Users processed: ${userResults.length}

| Legacy UID | Display Name | Email | Roles |
| --- | --- | --- | --- |
${userResults.map((u) => `| \`${u.legacy_uid}\` | ${u.display_name} | \`${u.synthetic_email}\` | ${u.v1_roles.join(", ")} |`).join("\n")}
`;
  if (!existsSync(reportsDir)) mkdirSync(reportsDir);
  writeFileSync(reportPath, reportText, "utf8");

  console.log(`\nDone. ${userResults.length} users processed. Report: ${reportPath}`);
}

run().catch((err) => {
  console.error("Fatal error during core import apply:", err);
  process.exit(1);
});
