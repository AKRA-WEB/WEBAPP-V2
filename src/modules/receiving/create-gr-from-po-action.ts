"use server";

import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/auth/guard";

export type CreateGrFromPoState = {
  status: "idle" | "error";
  message: string;
};

export async function createGoodsReceiptFromOrder(
  purchaseOrderId: string,
  previousState: CreateGrFromPoState,
  formData: FormData,
): Promise<CreateGrFromPoState> {
  void previousState;

  const guard = await requirePermission({ permission: "receiving.write" });
  if (guard.status !== "allowed") {
    return {
      status: "error",
      message: "You no longer have permission to create goods receipts.",
    };
  }

  const receiptDate = String(formData.get("receiptDate") || "").trim();
  const remark = String(formData.get("remark") || "").trim() || null;

  if (!receiptDate) {
    return { status: "error", message: "Enter a receipt date." };
  }

  const lineQuantities: { po_line_id: string; received_qty: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("qty_")) {
      const poLineId = key.slice(4);
      const qty = parseFloat(String(value));
      if (!Number.isNaN(qty) && qty > 0) {
        lineQuantities.push({ po_line_id: poLineId, received_qty: qty });
      }
    }
  }

  if (lineQuantities.length === 0) {
    return {
      status: "error",
      message: "Enter a quantity greater than zero for at least one line.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Sign in again before creating a goods receipt.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const actorName = profile?.display_name || profile?.email || user.email || "Unknown";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_goods_receipt_from_order", {
    p_purchase_order_id: purchaseOrderId,
    p_actor_profile_id: user.id,
    p_actor_name: actorName,
    p_receipt_date: receiptDate,
    p_line_quantities: lineQuantities,
    p_remark: remark,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("po_not_found")) {
      return { status: "error", message: "Purchase order not found." };
    }
    if (msg.includes("po_not_pending_receipt")) {
      return { status: "error", message: "This PO is not in pending receipt status." };
    }
    if (msg.includes("no_lines")) {
      return {
        status: "error",
        message: "Enter a quantity greater than zero for at least one line.",
      };
    }
    if (msg.includes("invalid_po_line")) {
      return { status: "error", message: "One or more lines do not belong to this purchase order." };
    }
    return { status: "error", message: "Could not create goods receipt. Refresh and try again." };
  }

  const grId = data as string | null;
  if (!grId) {
    return { status: "error", message: "Could not create goods receipt. Refresh and try again." };
  }

  redirect(`/receiving/${grId}` as Route);
}
