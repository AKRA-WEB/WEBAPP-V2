"use server";

import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/auth/guard";

export type CreatePoFromPrState = {
  status: "idle" | "error";
  message: string;
};

type CreatePoResultRow = {
  po_id: string;
  po_number: string;
};

export async function createPurchaseOrderFromRequisition(
  requestId: string,
  previousState: CreatePoFromPrState,
  formData: FormData,
): Promise<CreatePoFromPrState> {
  void previousState;

  const guard = await requirePermission({ permission: "purchasing.write" });
  if (guard.status !== "allowed") {
    return {
      status: "error",
      message: "You no longer have permission to create purchase orders.",
    };
  }

  const vendorId = String(formData.get("vendorId") || "").trim();
  const poDate = String(formData.get("poDate") || "").trim();
  const expectedDate = String(formData.get("expectedDate") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;

  if (!vendorId) {
    return { status: "error", message: "Select a vendor." };
  }
  if (!poDate) {
    return { status: "error", message: "Enter a PO date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Sign in again before creating a purchase order.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const actorName = profile?.display_name || profile?.email || user.email || "Unknown";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_purchase_order_from_requisition", {
    p_request_id: requestId,
    p_actor_profile_id: user.id,
    p_actor_name: actorName,
    p_vendor_id: vendorId,
    p_po_date: poDate,
    p_expected_date: expectedDate,
    p_note: note,
  });

  const rows = data as CreatePoResultRow[] | null;
  if (error || !rows || rows.length === 0) {
    const msg = error?.message ?? "";
    if (msg.includes("pr_not_approved")) {
      return { status: "error", message: "This PR is not in approved status." };
    }
    if (msg.includes("pr_no_lines")) {
      return { status: "error", message: "This PR has no lines." };
    }
    if (msg.includes("pr_mixed_warehouse")) {
      return {
        status: "error",
        message: "This PR has lines from different warehouses. Split-by-warehouse is not supported yet.",
      };
    }
    if (msg.includes("vendor_not_found")) {
      return { status: "error", message: "Selected vendor is not active." };
    }
    if (msg.includes("po_already_exists")) {
      return { status: "error", message: "A purchase order already exists for this PR." };
    }
    return { status: "error", message: "Could not create purchase order. Refresh and try again." };
  }

  redirect(`/purchasing/${rows[0].po_id}` as Route);
}
