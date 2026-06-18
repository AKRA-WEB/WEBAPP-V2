export type AppPermission =
  | "core.admin"
  | "picking.read"
  | "picking.write"
  | "purchasing.read"
  | "purchasing.write"
  | "receiving.read"
  | "receiving.write"
  | "warehouse.read"
  | "warehouse.write"
  | "returns.read"
  | "returns.write"
  | "kpi.read"
  | "kpi.write";

export type PermissionSnapshot = {
  roles: string[];
  permissions: AppPermission[];
};

export function can(snapshot: PermissionSnapshot | null, permission: AppPermission) {
  if (!snapshot) {
    return false;
  }

  if (snapshot.roles.includes("ADMIN")) {
    return true;
  }

  return snapshot.permissions.includes(permission);
}
