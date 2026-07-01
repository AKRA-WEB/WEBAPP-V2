import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCT_LIMIT = 500;

export type PurchaseRequisitionProductOption = {
  aliasId: string;
  productId: string;
  legacyCode: string | null;
  name: string;
  unit: string | null;
  matchStatus: string;
};

export type PurchaseRequisitionWarehouseOption = {
  id: string;
  warehouseKey: string;
  displayName: string;
};

type ProductAliasRow = {
  id: string;
  product_id: string | null;
  legacy_code: string | null;
  source_name: string;
  source_unit: string | null;
  match_status: string;
};

type WarehouseRow = {
  id: string;
  warehouse_key: string;
  display_name: string;
};

type VendorRow = {
  id: string;
  display_name: string;
};

export type PurchaseRequisitionReferenceData = {
  products: PurchaseRequisitionProductOption[];
  warehouses: PurchaseRequisitionWarehouseOption[];
};

export type PurchaseOrderVendorOption = {
  id: string;
  displayName: string;
};

export type CreatePoReferenceData = {
  vendors: PurchaseOrderVendorOption[];
};

/**
 * Loaded server-side after a purchasing.write guard. Catalog/warehouse RLS grants
 * read permissions to *.read roles, while this write form must also work for
 * purchasing.write-only users.
 */
export async function listPurchaseRequisitionReferenceData(): Promise<PurchaseRequisitionReferenceData> {
  const supabase = createAdminClient();

  const [productsResult, warehousesResult] = await Promise.all([
    supabase
      .from("catalog_product_aliases")
      .select("id, product_id, legacy_code, source_name, source_unit, match_status")
      .eq("source_app", "po-pr-gr")
      .in("match_status", ["matched_code", "matched_exact_name"])
      .order("source_name", { ascending: true })
      .limit(PRODUCT_LIMIT),
    supabase
      .from("warehouse_warehouses")
      .select("id, warehouse_key, display_name")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
  ]);

  const products = productsResult.error
    ? []
    : ((productsResult.data ?? []) as unknown as ProductAliasRow[])
      .filter((row): row is ProductAliasRow & { product_id: string } => Boolean(row.product_id))
      .map((row) => ({
        aliasId: row.id,
        productId: row.product_id,
        legacyCode: row.legacy_code,
        name: row.source_name,
        unit: row.source_unit,
        matchStatus: row.match_status,
      }));

  const warehouses = warehousesResult.error
    ? []
    : ((warehousesResult.data ?? []) as unknown as WarehouseRow[]).map((row) => ({
      id: row.id,
      warehouseKey: row.warehouse_key,
      displayName: row.display_name,
    }));

  return { products, warehouses };
}

export async function listCreatePoReferenceData(): Promise<CreatePoReferenceData> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("catalog_vendors")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  const vendors = error
    ? []
    : ((data ?? []) as unknown as VendorRow[]).map((row) => ({
      id: row.id,
      displayName: row.display_name,
    }));

  return { vendors };
}
