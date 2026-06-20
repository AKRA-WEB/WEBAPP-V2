export const PICKING_BILL_TYPES = [
  "บิลจัด",
  "บิลด่วน",
  "บิลสินค้าเรียงหน้าร้าน",
  "จัดเตรียมไว้ก่อน",
] as const;

export type PickingBillType = (typeof PICKING_BILL_TYPES)[number];

export type PickingStatus =
  | "pending"
  | "picked"
  | "sent"
  | "cancelled"
  | "line_push_failed";

const STATUS_LABELS: Record<PickingStatus, string> = {
  pending: "Pending",
  picked: "Picked",
  sent: "Sent",
  cancelled: "Cancelled",
  line_push_failed: "LINE push failed",
};

const STATUS_TONES: Record<PickingStatus, "blue" | "green" | "slate"> = {
  pending: "blue",
  picked: "blue",
  sent: "green",
  cancelled: "slate",
  line_push_failed: "slate",
};

export function formatPickingStatusLabel(status: string) {
  return STATUS_LABELS[status as PickingStatus] ?? status;
}

export function pickingStatusTone(status: string) {
  return STATUS_TONES[status as PickingStatus] ?? "slate";
}

export function formatBillLabel(billNo: number | null) {
  if (billNo === null || billNo === undefined) {
    return "No bill #";
  }

  return `#${String(billNo).padStart(3, "0")}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatBillDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatQuantity(qty: number, unit: string) {
  const formatted = Number.isInteger(qty) ? String(qty) : qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted} ${unit}`;
}
