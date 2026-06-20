"use server";

import "server-only";

import { redirect } from "next/navigation";

import { requirePermission } from "@/modules/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PickingTransitionTarget = "picked" | "sent";

export async function transitionPickingRequisitionStatus(
  requisitionId: string,
  targetStatus: PickingTransitionTarget,
): Promise<void> {
  const guard = await requirePermission({ permission: "picking.write" });
  if (guard.status !== "allowed") {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const actorName = profile?.display_name || profile?.email || user.email || "Unknown";

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("transition_picking_requisition_status", {
    p_requisition_id: requisitionId,
    p_target_status: targetStatus,
    p_actor_profile_id: user.id,
    p_actor_name: actorName,
  });

  if (error || !data || data.length === 0) {
    return;
  }

  redirect(`/picking/${requisitionId}`);
}
