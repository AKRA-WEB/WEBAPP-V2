import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const [email, password, roleKey = "ADMIN"] = process.argv.slice(2);

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: node scripts/create-test-account.mjs <email> <password> [roleKey=ADMIN]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: userData, error: userError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (userError) {
  console.error(`Create user failed: ${userError.message}`);
  process.exit(1);
}

const userId = userData.user.id;

const { data: role, error: roleError } = await admin
  .from("roles")
  .select("id")
  .eq("key", roleKey)
  .single();

if (roleError) {
  console.error(`Role lookup failed for "${roleKey}": ${roleError.message}`);
  process.exit(1);
}

const { error: assignError } = await admin
  .from("user_roles")
  .upsert({ user_id: userId, role_id: role.id }, { onConflict: "user_id,role_id" });

if (assignError) {
  console.error(`Role assignment failed: ${assignError.message}`);
  process.exit(1);
}

console.log(`Created test account: ${email} (${userId}), role ${roleKey}`);
