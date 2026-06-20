import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PickingStaffOption = {
  id: string;
  displayName: string;
};

export async function listActivePickingStaff(): Promise<PickingStaffOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("picking_staff")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({ id: row.id, displayName: row.display_name }));
}

export type PickingProductSuggestion = {
  aliasId: string;
  productId: string;
  name: string;
  unit: string | null;
};

const SUGGESTION_LIMIT = 300;

/**
 * Capped, alphabetical list of shared-catalog products with a matched
 * Picking-source alias. Not a search API: rich autocomplete is deferred
 * (V2-0020), so rows outside this cap rely on the explicit free-text path.
 */
export async function listPickingProductSuggestions(): Promise<PickingProductSuggestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("catalog_product_aliases")
    .select("id, product_id, source_name, source_unit")
    .eq("source_app", "picking")
    .eq("match_status", "matched_code")
    .order("source_name", { ascending: true })
    .limit(SUGGESTION_LIMIT);

  if (error || !data) {
    return [];
  }

  return data
    .filter((row): row is typeof row & { product_id: string } => Boolean(row.product_id))
    .map((row) => ({
      aliasId: row.id,
      productId: row.product_id,
      name: row.source_name,
      unit: row.source_unit,
    }));
}
