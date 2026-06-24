import "server-only";

import { createClient } from "@/lib/supabase/server";

const RECENT_LIST_LIMIT = 50;

export type PurchaseOrderListItem = {
  id: string;
  poNumber: string;
  poDate: string | null;
  status: string;
  vendorName: string | null;
  warehouseName: string | null;
  lineCount: number;
};

export type PurchaseOrderStatusSummary = Record<string, number>;

export type PurchaseOrderLine = {
  id: string;
  lineNo: number;
  productName: string;
  catalogProductName: string | null;
  orderedQty: number;
  unit: string;
  remark: string | null;
  prNumberLabel: string | null;
  matchStatus: string | null;
  status: string;
};

export type PurchaseOrderEvent = {
  id: string;
  eventType: string;
  actorName: string | null;
  createdAt: string;
};

export type PurchaseOrderDetail = {
  id: string;
  poNumber: string;
  poDate: string | null;
  rawPoDate: string | null;
  status: string;
  rawStatus: string | null;
  vendorName: string | null;
  warehouseName: string | null;
  billIdentityKind: string;
  legacyGroupKey: string | null;
  isDirect: boolean;
  isLegacyAmbiguous: boolean;
  legacyRefPrUid: string | null;
  closedAt: string | null;
  closedByName: string | null;
  lines: PurchaseOrderLine[];
  events: PurchaseOrderEvent[];
};

type ListRow = {
  id: string;
  po_number: string;
  po_date: string | null;
  status: string;
  line_count: { count: number }[];
  catalog_vendors: { display_name: string } | null;
  warehouse_warehouses: { display_name: string } | null;
};

type DetailRow = {
  id: string;
  po_number: string;
  po_date: string | null;
  raw_po_date: string | null;
  status: string;
  raw_status: string | null;
  bill_identity_kind: string;
  legacy_group_key: string | null;
  is_direct: boolean;
  is_legacy_ambiguous: boolean;
  legacy_ref_pr_uid: string | null;
  closed_at: string | null;
  closed_by_name: string | null;
  catalog_vendors: { display_name: string } | null;
  warehouse_warehouses: { display_name: string } | null;
};

type LineRow = {
  id: string;
  line_no: number;
  raw_product_name: string;
  ordered_qty: number;
  unit: string;
  remark: string | null;
  pr_number_label: string | null;
  match_status: string | null;
  status: string;
  catalog_products: { canonical_name: string } | null;
};

type EventRow = {
  id: string;
  event_type: string;
  actor_name: string | null;
  created_at: string;
};

export type PurchaseOrderListResult =
  | { status: "ok"; items: PurchaseOrderListItem[]; statusSummary: PurchaseOrderStatusSummary }
  | { status: "error" };

export async function listRecentPurchaseOrders(): Promise<PurchaseOrderListResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchasing_purchase_orders")
    .select(
      "id, po_number, po_date, status, line_count:purchasing_purchase_order_lines(count), catalog_vendors(display_name), warehouse_warehouses(display_name)",
    )
    .order("po_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(RECENT_LIST_LIMIT);

  if (error) {
    return { status: "error" };
  }

  const items: PurchaseOrderListItem[] = (data as unknown as ListRow[]).map((row) => ({
    id: row.id,
    poNumber: row.po_number,
    poDate: row.po_date,
    status: row.status,
    vendorName: row.catalog_vendors?.display_name ?? null,
    warehouseName: row.warehouse_warehouses?.display_name ?? null,
    lineCount: row.line_count?.[0]?.count ?? 0,
  }));

  const statusSummary: PurchaseOrderStatusSummary = {};
  for (const item of items) {
    statusSummary[item.status] = (statusSummary[item.status] ?? 0) + 1;
  }

  return { status: "ok", items, statusSummary };
}

export type PurchaseOrderDetailResult =
  | { status: "ok"; order: PurchaseOrderDetail }
  | { status: "not_found" }
  | { status: "error" };

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetailResult> {
  const supabase = await createClient();

  const [orderResult, linesResult, eventsResult] = await Promise.all([
    supabase
      .from("purchasing_purchase_orders")
      .select(
        "id, po_number, po_date, raw_po_date, status, raw_status, bill_identity_kind, legacy_group_key, is_direct, is_legacy_ambiguous, legacy_ref_pr_uid, closed_at, closed_by_name, catalog_vendors(display_name), warehouse_warehouses(display_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("purchasing_purchase_order_lines")
      .select(
        "id, line_no, raw_product_name, ordered_qty, unit, remark, pr_number_label, match_status, status, catalog_products(canonical_name)",
      )
      .eq("purchase_order_id", id)
      .order("line_no", { ascending: true }),
    supabase
      .from("purchasing_events")
      .select("id, event_type, actor_name, created_at")
      .eq("purchase_order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (orderResult.error || linesResult.error || eventsResult.error) {
    return { status: "error" };
  }

  if (!orderResult.data) {
    return { status: "not_found" };
  }

  const order = orderResult.data as unknown as DetailRow;
  const lines = (linesResult.data ?? []) as unknown as LineRow[];
  const events = (eventsResult.data ?? []) as unknown as EventRow[];

  return {
    status: "ok",
    order: {
      id: order.id,
      poNumber: order.po_number,
      poDate: order.po_date,
      rawPoDate: order.raw_po_date,
      status: order.status,
      rawStatus: order.raw_status,
      vendorName: order.catalog_vendors?.display_name ?? null,
      warehouseName: order.warehouse_warehouses?.display_name ?? null,
      billIdentityKind: order.bill_identity_kind,
      legacyGroupKey: order.legacy_group_key,
      isDirect: order.is_direct,
      isLegacyAmbiguous: order.is_legacy_ambiguous,
      legacyRefPrUid: order.legacy_ref_pr_uid,
      closedAt: order.closed_at,
      closedByName: order.closed_by_name,
      lines: lines.map((line) => ({
        id: line.id,
        lineNo: line.line_no,
        productName: line.raw_product_name,
        catalogProductName: line.catalog_products?.canonical_name ?? null,
        orderedQty: Number(line.ordered_qty),
        unit: line.unit,
        remark: line.remark,
        prNumberLabel: line.pr_number_label,
        matchStatus: line.match_status,
        status: line.status,
      })),
      events: events.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        actorName: event.actor_name,
        createdAt: event.created_at,
      })),
    },
  };
}
