"use server";

import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { requirePermission } from "@/modules/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreatePurchaseRequisitionLineInput = {
  mode: "catalog" | "freeText";
  catalogAliasId?: string | null;
  productName?: string;
  requestedQty: number;
  unit: string;
  warehouseId: string;
  remark?: string;
};

export type CreatePurchaseRequisitionInput = {
  lines: CreatePurchaseRequisitionLineInput[];
};

export type CreatePurchaseRequisitionResult =
  | { status: "denied" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

type WarehouseRow = {
  id: string;
  display_name: string;
};

type ProductAliasRow = {
  id: string;
  product_id: string | null;
  legacy_code: string | null;
  source_name: string;
  source_unit: string | null;
  match_status: string;
};

type CreatedPurchaseRequisitionRow = {
  created_id: string;
  created_request_number: string;
};

function todayBangkok(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function validate(input: CreatePurchaseRequisitionInput): string | null {
  if (!input.lines || input.lines.length === 0) {
    return "Add at least one line.";
  }

  for (const line of input.lines) {
    if (line.mode !== "catalog" && line.mode !== "freeText") {
      return "Select a valid line type.";
    }
    if (!line.warehouseId) {
      return "Every line needs a warehouse.";
    }
    if (!(line.requestedQty > 0)) {
      return "Every line needs a quantity greater than zero.";
    }

    if (line.mode === "catalog") {
      if (!line.catalogAliasId) {
        return "Select a catalog product or use manual review.";
      }
    } else {
      if (!line.productName?.trim()) {
        return "Every manual-review line needs a product name.";
      }
      if (!line.unit.trim()) {
        return "Every manual-review line needs a unit.";
      }
    }
  }

  return null;
}

export async function createPurchaseRequisition(
  input: CreatePurchaseRequisitionInput,
): Promise<CreatePurchaseRequisitionResult> {
  const guard = await requirePermission({ permission: "purchasing.write" });
  if (guard.status !== "allowed") {
    return { status: "denied" };
  }

  const validationError = validate(input);
  if (validationError) {
    return { status: "invalid", message: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "denied" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const requesterName = profile?.display_name || profile?.email || user.email || "Unknown";
  const warehouseIds = unique(input.lines.map((line) => line.warehouseId));
  const catalogAliasIds = unique(
    input.lines
      .filter((line) => line.mode === "catalog")
      .map((line) => line.catalogAliasId ?? ""),
  );

  const admin = createAdminClient();

  const [warehousesResult, aliasesResult] = await Promise.all([
    admin
      .from("warehouse_warehouses")
      .select("id, display_name")
      .in("id", warehouseIds)
      .eq("is_active", true),
    catalogAliasIds.length > 0
      ? admin
        .from("catalog_product_aliases")
        .select("id, product_id, legacy_code, source_name, source_unit, match_status")
        .in("id", catalogAliasIds)
        .eq("source_app", "po-pr-gr")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (warehousesResult.error || aliasesResult.error) {
    return { status: "error", message: "Could not validate PR reference data." };
  }

  const warehousesById = new Map(
    ((warehousesResult.data ?? []) as unknown as WarehouseRow[]).map((row) => [row.id, row]),
  );
  const aliasesById = new Map(
    ((aliasesResult.data ?? []) as unknown as ProductAliasRow[]).map((row) => [row.id, row]),
  );

  const lines = [];

  for (const line of input.lines) {
    const warehouse = warehousesById.get(line.warehouseId);
    if (!warehouse) {
      return { status: "invalid", message: "Selected warehouse is not active." };
    }

    if (line.mode === "catalog") {
      const alias = aliasesById.get(line.catalogAliasId ?? "");
      if (!alias || !alias.product_id) {
        return { status: "invalid", message: "Selected product is not a valid catalog product." };
      }

      const unit = (line.unit || alias.source_unit || "").trim();
      if (!unit) {
        return { status: "invalid", message: "Every catalog line needs a unit." };
      }

      lines.push({
        catalog_product_id: alias.product_id,
        catalog_alias_id: alias.id,
        raw_sku: alias.legacy_code,
        raw_product_name: alias.source_name,
        requested_qty: line.requestedQty,
        unit,
        warehouse_id: warehouse.id,
        raw_warehouse: warehouse.display_name,
        remark: line.remark?.trim() || null,
        match_status: alias.match_status,
      });
    } else {
      lines.push({
        catalog_product_id: null,
        catalog_alias_id: null,
        raw_sku: null,
        raw_product_name: line.productName?.trim() ?? "",
        requested_qty: line.requestedQty,
        unit: line.unit.trim(),
        warehouse_id: warehouse.id,
        raw_warehouse: warehouse.display_name,
        remark: line.remark?.trim() || null,
        match_status: "manual_review",
      });
    }
  }

  const { data, error } = await admin.rpc("create_purchase_requisition", {
    p_request_date: todayBangkok(),
    p_requester_profile_id: user.id,
    p_requester_name: requesterName,
    p_lines: lines,
  });

  const rows = data as CreatedPurchaseRequisitionRow[] | null;
  if (error || !rows || rows.length === 0) {
    return { status: "error", message: error?.message ?? "Could not create purchase requisition." };
  }

  redirect(`/purchasing/pr/${rows[0].created_id}` as Route);
}
