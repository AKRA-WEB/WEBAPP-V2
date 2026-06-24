import "server-only";

import { createClient } from "@/lib/supabase/server";

const RECENT_LIST_LIMIT = 50;

export type GoodsReceiptListItem = {
  id: string;
  receiptDate: string | null;
  status: string;
  receiverName: string | null;
  linkedPoNumber: string | null;
  lineCount: number;
};

export type GoodsReceiptStatusSummary = Record<string, number>;

export type GoodsReceiptLineSplit = {
  id: string;
  splitNo: number;
  rawLocation: string;
  floor: string | null;
  zone: string | null;
  qty: number | null;
  unit: string | null;
  warehouseKey: string | null;
};

export type GoodsReceiptLine = {
  id: string;
  productName: string;
  catalogProductName: string | null;
  receivedQty: number;
  unit: string;
  oldQty: number | null;
  expiryDate: string | null;
  rawExpiryDate: string | null;
  dateParseStatus: string | null;
  locationSummary: string | null;
  isExtraItem: boolean;
  matchStatus: string | null;
  linkedPoLine: boolean;
  splits: GoodsReceiptLineSplit[];
};

export type GoodsReceiptEvent = {
  id: string;
  eventType: string;
  actorName: string | null;
  createdAt: string;
};

export type GoodsReceiptDetail = {
  id: string;
  receiptDate: string | null;
  rawReceiptDate: string | null;
  ataDate: string | null;
  rawAta: string | null;
  receiverName: string | null;
  status: string;
  rawStatus: string | null;
  remark: string | null;
  liftFeeSummary: Record<string, unknown>;
  resetAt: string | null;
  resetByName: string | null;
  recalledAt: string | null;
  recalledByName: string | null;
  legacyGroupKey: string | null;
  linkedPurchaseOrderId: string | null;
  linkedPoNumber: string | null;
  lines: GoodsReceiptLine[];
  events: GoodsReceiptEvent[];
};

type ListRow = {
  id: string;
  receipt_date: string | null;
  status: string;
  receiver_name: string | null;
  line_count: { count: number }[];
  purchasing_purchase_orders: { po_number: string } | null;
};

type DetailRow = {
  id: string;
  receipt_date: string | null;
  raw_receipt_date: string | null;
  ata_date: string | null;
  raw_ata: string | null;
  receiver_name: string | null;
  status: string;
  raw_status: string | null;
  remark: string | null;
  lift_fee_summary: Record<string, unknown> | null;
  reset_at: string | null;
  reset_by_name: string | null;
  recalled_at: string | null;
  recalled_by_name: string | null;
  legacy_group_key: string | null;
  purchase_order_id: string | null;
  purchasing_purchase_orders: { id: string; po_number: string } | null;
};

type SplitRow = {
  id: string;
  split_no: number;
  raw_location: string;
  floor: string | null;
  zone: string | null;
  qty: number | null;
  unit: string | null;
  warehouse_key: string | null;
};

type LineRow = {
  id: string;
  raw_product_name: string;
  received_qty: number;
  unit: string;
  old_qty: number | null;
  expiry_date: string | null;
  raw_expiry_date: string | null;
  date_parse_status: string | null;
  location_summary: string | null;
  is_extra_item: boolean;
  match_status: string | null;
  purchase_order_line_id: string | null;
  catalog_products: { canonical_name: string } | null;
  receiving_line_splits: SplitRow[];
};

type EventRow = {
  id: string;
  event_type: string;
  actor_name: string | null;
  created_at: string;
};

export type GoodsReceiptListResult =
  | { status: "ok"; items: GoodsReceiptListItem[]; statusSummary: GoodsReceiptStatusSummary }
  | { status: "error" };

export async function listRecentGoodsReceipts(): Promise<GoodsReceiptListResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receiving_goods_receipts")
    .select(
      "id, receipt_date, status, receiver_name, line_count:receiving_goods_receipt_lines(count), purchasing_purchase_orders(po_number)",
    )
    .order("receipt_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(RECENT_LIST_LIMIT);

  if (error) {
    return { status: "error" };
  }

  const items: GoodsReceiptListItem[] = (data as unknown as ListRow[]).map((row) => ({
    id: row.id,
    receiptDate: row.receipt_date,
    status: row.status,
    receiverName: row.receiver_name,
    linkedPoNumber: row.purchasing_purchase_orders?.po_number ?? null,
    lineCount: row.line_count?.[0]?.count ?? 0,
  }));

  const statusSummary: GoodsReceiptStatusSummary = {};
  for (const item of items) {
    statusSummary[item.status] = (statusSummary[item.status] ?? 0) + 1;
  }

  return { status: "ok", items, statusSummary };
}

export type GoodsReceiptDetailResult =
  | { status: "ok"; receipt: GoodsReceiptDetail }
  | { status: "not_found" }
  | { status: "error" };

export async function getGoodsReceiptDetail(id: string): Promise<GoodsReceiptDetailResult> {
  const supabase = await createClient();

  const [receiptResult, linesResult, eventsResult] = await Promise.all([
    supabase
      .from("receiving_goods_receipts")
      .select(
        "id, receipt_date, raw_receipt_date, ata_date, raw_ata, receiver_name, status, raw_status, remark, lift_fee_summary, reset_at, reset_by_name, recalled_at, recalled_by_name, legacy_group_key, purchase_order_id, purchasing_purchase_orders(id, po_number)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("receiving_goods_receipt_lines")
      .select(
        "id, raw_product_name, received_qty, unit, old_qty, expiry_date, raw_expiry_date, date_parse_status, location_summary, is_extra_item, match_status, purchase_order_line_id, catalog_products(canonical_name), receiving_line_splits(id, split_no, raw_location, floor, zone, qty, unit, warehouse_key)",
      )
      .eq("goods_receipt_id", id)
      .order("created_at", { ascending: true })
      .order("split_no", { ascending: true, foreignTable: "receiving_line_splits" }),
    supabase
      .from("receiving_events")
      .select("id, event_type, actor_name, created_at")
      .eq("goods_receipt_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (receiptResult.error || linesResult.error || eventsResult.error) {
    return { status: "error" };
  }

  if (!receiptResult.data) {
    return { status: "not_found" };
  }

  const receipt = receiptResult.data as unknown as DetailRow;
  const lines = (linesResult.data ?? []) as unknown as LineRow[];
  const events = (eventsResult.data ?? []) as unknown as EventRow[];

  return {
    status: "ok",
    receipt: {
      id: receipt.id,
      receiptDate: receipt.receipt_date,
      rawReceiptDate: receipt.raw_receipt_date,
      ataDate: receipt.ata_date,
      rawAta: receipt.raw_ata,
      receiverName: receipt.receiver_name,
      status: receipt.status,
      rawStatus: receipt.raw_status,
      remark: receipt.remark,
      liftFeeSummary: receipt.lift_fee_summary ?? {},
      resetAt: receipt.reset_at,
      resetByName: receipt.reset_by_name,
      recalledAt: receipt.recalled_at,
      recalledByName: receipt.recalled_by_name,
      legacyGroupKey: receipt.legacy_group_key,
      linkedPurchaseOrderId: receipt.purchase_order_id,
      linkedPoNumber: receipt.purchasing_purchase_orders?.po_number ?? null,
      lines: lines.map((line) => ({
        id: line.id,
        productName: line.raw_product_name,
        catalogProductName: line.catalog_products?.canonical_name ?? null,
        receivedQty: Number(line.received_qty),
        unit: line.unit,
        oldQty: line.old_qty === null ? null : Number(line.old_qty),
        expiryDate: line.expiry_date,
        rawExpiryDate: line.raw_expiry_date,
        dateParseStatus: line.date_parse_status,
        locationSummary: line.location_summary,
        isExtraItem: line.is_extra_item,
        matchStatus: line.match_status,
        linkedPoLine: line.purchase_order_line_id !== null,
        splits: (line.receiving_line_splits ?? []).map((split) => ({
          id: split.id,
          splitNo: split.split_no,
          rawLocation: split.raw_location,
          floor: split.floor,
          zone: split.zone,
          qty: split.qty === null ? null : Number(split.qty),
          unit: split.unit,
          warehouseKey: split.warehouse_key,
        })),
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
