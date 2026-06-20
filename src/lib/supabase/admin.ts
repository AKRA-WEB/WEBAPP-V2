import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Service-role Supabase client. Bypasses RLS, so only call this after an
 * explicit server-side permission check (e.g. requirePermission()). The
 * `server-only` import makes any accidental client-bundle import a build
 * error rather than a runtime leak.
 */
export function createAdminClient() {
  const { url } = getPublicSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY environment variable.");
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
