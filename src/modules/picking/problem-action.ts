"use server";

import "server-only";

import { redirect } from "next/navigation";

import { requirePermission } from "@/modules/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReportProblemLineInput = {
  lineId: string;
  actualQty: number;
  note: string;
};

export type ReportProblemResult =
  | { status: "denied" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export async function reportPickingProblem(
  requisitionId: string,
  lines: ReportProblemLineInput[],
): Promise<ReportProblemResult> {
  const guard = await requirePermission({ permission: "picking.write" });
  if (guard.status !== "allowed") {
    return { status: "denied" };
  }

  if (!lines || lines.length === 0) {
    return { status: "invalid", message: "Add at least one line." };
  }
  for (const line of lines) {
    if (!(line.actualQty >= 0)) {
      return { status: "invalid", message: "Actual quantity cannot be negative." };
    }
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

  const actorName = profile?.display_name || profile?.email || user.email || "Unknown";

  const { data: existingLines, error: linesError } = await supabase
    .from("picking_requisition_lines")
    .select("id, product_name, requested_qty, unit")
    .eq("requisition_id", requisitionId);

  if (linesError || !existingLines || existingLines.length === 0) {
    return { status: "error", message: "Could not load requisition lines." };
  }

  const existingById = new Map(existingLines.map((line) => [line.id, line]));
  const submittedIds = new Set(lines.map((line) => line.lineId));
  if (lines.length !== existingById.size || submittedIds.size !== existingById.size) {
    return { status: "invalid", message: "Submitted lines do not match this requisition." };
  }
  for (const id of submittedIds) {
    if (!existingById.has(id)) {
      return { status: "invalid", message: "Submitted lines do not match this requisition." };
    }
  }

  const payload = lines.map((line) => {
    const source = existingById.get(line.lineId)!;
    return {
      line_id: line.lineId,
      product_name: source.product_name,
      requested_qty: source.requested_qty,
      actual_qty: line.actualQty,
      unit: source.unit,
      note: line.note.trim().slice(0, 500),
    };
  });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("report_picking_problem", {
    p_requisition_id: requisitionId,
    p_actor_profile_id: user.id,
    p_actor_name: actorName,
    p_lines: payload,
  });

  if (error || !data || data.length === 0) {
    if (error?.message?.toLowerCase().includes("sent")) {
      return {
        status: "invalid",
        message: "This requisition has already been sent and cannot be edited.",
      };
    }
    return { status: "error", message: error?.message ?? "Could not save the problem report." };
  }

  redirect(`/picking/${requisitionId}`);
}
