import "server-only";

import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AppStatus = "Planning" | "Pilot" | "Queued" | "Live" | "Retired";

export type AppRegistryItem = {
  key: string;
  name: string;
  description: string;
  route: string | null;
  icon: string;
  status: AppStatus;
  requiredPermission: string | null;
};

type AppRow = {
  key: string;
  name: string;
  description: string | null;
  route: string | null;
  icon: string | null;
  status: AppStatus;
  required_permission: string | null;
};

export const fallbackAppRegistry: AppRegistryItem[] = [
  {
    key: "core",
    name: "Core",
    description: "Users, roles, permissions, audit",
    route: "/admin/permissions",
    icon: "ShieldCheck",
    status: "Planning",
    requiredPermission: "core.admin",
  },
  {
    key: "picking",
    name: "Picking",
    description: "Requisition, bill numbers, issue flow",
    route: "/picking",
    icon: "ClipboardList",
    status: "Pilot",
    requiredPermission: "picking.read",
  },
  {
    key: "purchasing",
    name: "Purchasing",
    description: "PR, PO, vendor lead time",
    route: "/purchasing",
    icon: "ReceiptText",
    status: "Queued",
    requiredPermission: "purchasing.read",
  },
  {
    key: "receiving",
    name: "Receiving",
    description: "GR, warehouse locations, reset/recall",
    route: "/receiving",
    icon: "PackageCheck",
    status: "Queued",
    requiredPermission: "receiving.read",
  },
  {
    key: "warehouse",
    name: "Warehouse",
    description: "TRDAKRA, dispatch, survey, stock",
    route: "/warehouse",
    icon: "Boxes",
    status: "Queued",
    requiredPermission: "warehouse.read",
  },
  {
    key: "returns",
    name: "Returns",
    description: "Return intake, claims, damaged goods",
    route: "/returns",
    icon: "RefreshCcw",
    status: "Queued",
    requiredPermission: "returns.read",
  },
  {
    key: "kpi",
    name: "KPI",
    description: "Daily records and dashboards",
    route: "/kpi",
    icon: "BarChart3",
    status: "Queued",
    requiredPermission: "kpi.read",
  },
  {
    key: "notifications",
    name: "Notifications",
    description: "LINE jobs and delivery hooks",
    route: null,
    icon: "Truck",
    status: "Queued",
    requiredPermission: null,
  },
];

export async function getAppRegistry(): Promise<{
  items: AppRegistryItem[];
  source: "database" | "fallback";
}> {
  if (!hasPublicSupabaseEnv()) {
    return { items: fallbackAppRegistry, source: "fallback" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: fallbackAppRegistry, source: "fallback" };
  }

  const { data, error } = await supabase
    .from("apps")
    .select("key, name, description, route, icon, status, required_permission")
    .order("sort_order");

  if (error || !data?.length) {
    return { items: fallbackAppRegistry, source: "fallback" };
  }

  return {
    items: (data as AppRow[]).map((row) => ({
      key: row.key,
      name: row.name,
      description: row.description ?? "",
      route: row.route,
      icon: row.icon ?? "Boxes",
      status: row.status,
      requiredPermission: row.required_permission,
    })),
    source: "database",
  };
}
