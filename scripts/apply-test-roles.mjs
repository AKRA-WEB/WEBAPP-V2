import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

// Load .env.local manually
let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SECRET_KEY;

if (existsSync(join(root, ".env.local"))) {
  const envText = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const matchUrl = line.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/);
    const matchKey = line.match(/^\s*SUPABASE_SECRET_KEY\s*=\s*(.+)$/);
    if (matchUrl) url = matchUrl[1].trim();
    if (matchKey) serviceKey = matchKey[1].trim();
  }
}

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Upserting roles...");
  const rolesToInsert = [
    { key: 'PICKING_WRITER', name: 'Picking Writer', description: 'Test role with read and write access to Picking.', is_system: false },
    { key: 'PICKING_READER', name: 'Picking Reader', description: 'Test role with read-only access to Picking.', is_system: false },
    { key: 'GUEST', name: 'Guest User', description: 'Test role with no permissions assigned.', is_system: false }
  ];

  const { data: upsertedRoles, error: rolesError } = await supabase
    .from('roles')
    .upsert(rolesToInsert, { onConflict: 'key' })
    .select();

  if (rolesError) {
    console.error("Error upserting roles:", rolesError.message);
    process.exit(1);
  }

  console.log("Upserted roles successfully:", upsertedRoles.map(r => r.key));

  // Get IDs
  const { data: dbRoles, error: dbRolesError } = await supabase
    .from('roles')
    .select('id, key');
  
  const { data: dbPerms, error: dbPermsError } = await supabase
    .from('permissions')
    .select('id, key');

  if (dbRolesError || dbPermsError) {
    console.error("Error fetching metadata:", dbRolesError?.message || dbPermsError?.message);
    process.exit(1);
  }

  const roleMap = new Map(dbRoles.map(r => [r.key, r.id]));
  const permMap = new Map(dbPerms.map(p => [p.key, p.id]));

  console.log("Mapping role permissions...");
  const rolePermissionsToInsert = [];

  const writerId = roleMap.get('PICKING_WRITER');
  const readerId = roleMap.get('PICKING_READER');

  const pickReadId = permMap.get('picking.read');
  const pickWriteId = permMap.get('picking.write');

  if (writerId && pickReadId) {
    rolePermissionsToInsert.push({ role_id: writerId, permission_id: pickReadId });
  }
  if (writerId && pickWriteId) {
    rolePermissionsToInsert.push({ role_id: writerId, permission_id: pickWriteId });
  }
  if (readerId && pickReadId) {
    rolePermissionsToInsert.push({ role_id: readerId, permission_id: pickReadId });
  }

  if (rolePermissionsToInsert.length > 0) {
    const { error: mapError } = await supabase
      .from('role_permissions')
      .upsert(rolePermissionsToInsert, { onConflict: 'role_id,permission_id' });

    if (mapError) {
      console.error("Error mapping role permissions:", mapError.message);
      process.exit(1);
    }
    console.log("Mapped role permissions successfully.");
  } else {
    console.log("No role permissions to map.");
  }
}

run();
