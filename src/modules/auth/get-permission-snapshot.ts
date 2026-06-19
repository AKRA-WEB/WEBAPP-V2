import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import type { AppPermission, PermissionSnapshot } from "@/modules/auth/permissions";

type UserRoleRow = {
  role_id: string;
  roles: { key: string } | null;
};

type RolePermissionRow = {
  permissions: { key: string } | null;
};

/**
 * Builds the {@link PermissionSnapshot} consumed by `can()` for the currently
 * authenticated user. Runs server-side only; reads are RLS-scoped to the user.
 * Returns `null` when Supabase env is missing or no user is signed in.
 */
export async function getPermissionSnapshot(): Promise<PermissionSnapshot | null> {
  if (!hasPublicSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id, roles(key)")
    .eq("user_id", user.id);

  const rows = (userRoles ?? []) as unknown as UserRoleRow[];
  const roles = rows.map((row) => row.roles?.key).filter((key): key is string => Boolean(key));
  const roleIds = rows.map((row) => row.role_id);

  let permissions: AppPermission[] = [];

  if (roleIds.length > 0) {
    const { data: rolePermissions } = await supabase
      .from("role_permissions")
      .select("permissions(key)")
      .in("role_id", roleIds);

    const permRows = (rolePermissions ?? []) as unknown as RolePermissionRow[];
    const keys = permRows
      .map((row) => row.permissions?.key)
      .filter((key): key is string => Boolean(key));

    permissions = [...new Set(keys)] as AppPermission[];
  }

  return { roles, permissions };
}
