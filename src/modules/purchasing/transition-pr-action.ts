"use server";

import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/modules/auth/guard";

export type PurchaseRequisitionTransitionState = {
  status: "idle" | "error";
  message: string;
};

type TransitionTarget = "pr_approved" | "pr_rejected";

type TransitionResultRow = {
  id: string;
  status: string;
};

async function transitionPurchaseRequisitionStatus(
  requestId: string,
  targetStatus: TransitionTarget,
  rejectedReason: string | null,
): Promise<PurchaseRequisitionTransitionState> {
  const guard = await requirePermission({ permission: "purchasing.write" });
  if (guard.status !== "allowed") {
    return {
      status: "error",
      message: "You no longer have permission to update this purchase requisition.",
    };
  }

  const reason = rejectedReason?.trim() || null;
  if (targetStatus === "pr_rejected" && !reason) {
    return {
      status: "error",
      message: "Enter a rejection reason before rejecting this PR.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Sign in again before updating this purchase requisition.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const actorName = profile?.display_name || profile?.email || user.email || "Unknown";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("transition_purchase_requisition_status", {
    p_request_id: requestId,
    p_target_status: targetStatus,
    p_actor_profile_id: user.id,
    p_actor_name: actorName,
    p_rejected_reason: reason,
  });

  const rows = data as TransitionResultRow[] | null;
  if (error || !rows || rows.length === 0) {
    return {
      status: "error",
      message: "Could not update this purchase requisition. Refresh and try again.",
    };
  }

  redirect(`/purchasing/pr/${requestId}` as Route);
}

export async function approvePurchaseRequisition(
  requestId: string,
  previousState: PurchaseRequisitionTransitionState,
  formData: FormData,
): Promise<PurchaseRequisitionTransitionState> {
  void previousState;
  void formData;
  return transitionPurchaseRequisitionStatus(requestId, "pr_approved", null);
}

export async function rejectPurchaseRequisition(
  requestId: string,
  previousState: PurchaseRequisitionTransitionState,
  formData: FormData,
): Promise<PurchaseRequisitionTransitionState> {
  void previousState;
  return transitionPurchaseRequisitionStatus(
    requestId,
    "pr_rejected",
    String(formData.get("rejectedReason") || ""),
  );
}
