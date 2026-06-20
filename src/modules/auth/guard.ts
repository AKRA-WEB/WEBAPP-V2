import "server-only";

import { AppPermission, can, PermissionSnapshot } from "./permissions";
import { getPermissionSnapshot } from "./get-permission-snapshot";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";

export type GuardResult =
  | { status: "allowed"; snapshot: PermissionSnapshot }
  | { status: "denied"; reason: "forbidden"; snapshot: PermissionSnapshot }
  | { status: "denied"; reason: "unauthenticated"; snapshot: null }
  | { status: "denied"; reason: "not_configured"; snapshot: null };

type NonEmptyPermissionList = [AppPermission, ...AppPermission[]];

export type GuardOptions =
  | {
  /**
   * The user must have this specific permission.
   */
      permission: AppPermission;
      anyOf?: never;
      allOf?: never;
    }
  | {
  /**
   * The user must have at least one of these permissions.
   */
      anyOf: NonEmptyPermissionList;
      permission?: never;
      allOf?: never;
    }
  | {
  /**
   * The user must have all of these permissions.
   */
      allOf: NonEmptyPermissionList;
      permission?: never;
      anyOf?: never;
    };

/**
 * Server-only helper to require permissions and fail closed.
 * Automatically checks for env configuration, authentication, and permission snapshot matches.
 * Admins (role "ADMIN") bypass valid permission checks, but callers must still
 * provide an explicit requirement so accidental empty guards fail closed.
 */
export async function requirePermission(options: GuardOptions): Promise<GuardResult> {
  if (!hasPublicSupabaseEnv()) {
    return { status: "denied", reason: "not_configured", snapshot: null };
  }

  const snapshot = await getPermissionSnapshot();
  if (!snapshot) {
    return { status: "denied", reason: "unauthenticated", snapshot: null };
  }

  const hasRequirement = Boolean(options.permission || options.anyOf?.length || options.allOf?.length);
  if (!hasRequirement) {
    return { status: "denied", reason: "forbidden", snapshot };
  }

  // Admin bypass
  if (snapshot.roles.includes("ADMIN")) {
    return { status: "allowed", snapshot };
  }

  // 1. Single permission check
  if (options.permission && !can(snapshot, options.permission)) {
    return { status: "denied", reason: "forbidden", snapshot };
  }

  // 2. anyOf check: must have at least one of the listed permissions
  if (options.anyOf && options.anyOf.length > 0) {
    const hasAny = options.anyOf.some((p) => can(snapshot, p));
    if (!hasAny) {
      return { status: "denied", reason: "forbidden", snapshot };
    }
  }

  // 3. allOf check: must have all of the listed permissions
  if (options.allOf && options.allOf.length > 0) {
    const hasAll = options.allOf.every((p) => can(snapshot, p));
    if (!hasAll) {
      return { status: "denied", reason: "forbidden", snapshot };
    }
  }

  return { status: "allowed", snapshot };
}
