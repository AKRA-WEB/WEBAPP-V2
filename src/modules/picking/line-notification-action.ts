"use server";

import "server-only";

import { redirect } from "next/navigation";

import { requirePermission } from "@/modules/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { sendPickingLineNotification } from "@/modules/picking/line-notification";

export async function retryPickingLineNotification(requisitionId: string): Promise<void> {
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

  await sendPickingLineNotification(requisitionId, { profileId: user.id, name: actorName });

  redirect(`/picking/${requisitionId}`);
}
