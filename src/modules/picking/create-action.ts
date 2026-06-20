"use server";

import "server-only";

import { redirect } from "next/navigation";

import { requirePermission } from "@/modules/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PICKING_BILL_TYPES } from "@/modules/picking/format";

export type CreateRequisitionLineInput = {
  productName: string;
  requestedQty: number;
  unit: string;
  isFreeText: boolean;
  catalogProductId?: string | null;
  catalogAliasId?: string | null;
};

export type CreateRequisitionInput = {
  billType: string;
  assigneeStaffId: string;
  lines: CreateRequisitionLineInput[];
};

export type CreateRequisitionResult =
  | { status: "denied" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

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

function validate(input: CreateRequisitionInput): string | null {
  if (!PICKING_BILL_TYPES.includes(input.billType as (typeof PICKING_BILL_TYPES)[number])) {
    return "Select a valid bill type.";
  }
  if (!input.assigneeStaffId) {
    return "Select an assignee.";
  }
  if (!input.lines || input.lines.length === 0) {
    return "Add at least one line.";
  }

  for (const line of input.lines) {
    if (!line.productName.trim()) {
      return "Every line needs a product name.";
    }
    if (!(line.requestedQty > 0)) {
      return "Every line needs a quantity greater than zero.";
    }
    if (!line.unit.trim()) {
      return "Every line needs a unit.";
    }
    if (!line.isFreeText && !line.catalogProductId) {
      return "Select a catalog product or mark the line as free text.";
    }
  }

  return null;
}

export async function createPickingRequisition(
  input: CreateRequisitionInput,
): Promise<CreateRequisitionResult> {
  const guard = await requirePermission({ permission: "picking.write" });
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

  const { data: staff } = await supabase
    .from("picking_staff")
    .select("id, display_name")
    .eq("id", input.assigneeStaffId)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) {
    return { status: "invalid", message: "Selected assignee is not a valid active staff member." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("create_picking_requisition", {
    p_bill_type: input.billType,
    p_bill_date: todayBangkok(),
    p_requester_profile_id: user.id,
    p_requester_name: requesterName,
    p_assignee_staff_id: staff.id,
    p_assignee_name: staff.display_name,
    p_lines: input.lines.map((line) => ({
      product_name: line.productName.trim(),
      requested_qty: line.requestedQty,
      unit: line.unit.trim(),
      is_free_text: line.isFreeText,
      catalog_product_id: line.isFreeText ? null : line.catalogProductId ?? null,
      catalog_alias_id: line.isFreeText ? null : line.catalogAliasId ?? null,
    })),
  });

  if (error || !data || data.length === 0) {
    return { status: "error", message: error?.message ?? "Could not create requisition." };
  }

  redirect(`/picking/${data[0].id}`);
}
