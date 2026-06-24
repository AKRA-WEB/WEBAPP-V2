export type PurchaseOrderStatus = "po_pending_receipt" | "po_closed_apv_ready";

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  po_pending_receipt: "Pending receipt",
  po_closed_apv_ready: "Closed (APV ready)",
};

const STATUS_TONES: Record<PurchaseOrderStatus, "blue" | "green" | "slate"> = {
  po_pending_receipt: "blue",
  po_closed_apv_ready: "green",
};

export function formatPurchaseOrderStatusLabel(status: string) {
  return STATUS_LABELS[status as PurchaseOrderStatus] ?? status;
}

export function purchaseOrderStatusTone(status: string) {
  return STATUS_TONES[status as PurchaseOrderStatus] ?? "slate";
}

const MATCH_STATUS_LABELS: Record<string, string> = {
  matched_code: "Matched (code)",
  matched_exact_name: "Matched (name)",
  manual_review: "Manual review",
  pr_link_unverified: "PR reference unverified",
  no_catalog_match: "No catalog match",
  no_vendor_match: "No vendor match",
  no_warehouse_match: "No warehouse match",
};

export function formatMatchStatusLabel(matchStatus: string | null) {
  if (!matchStatus) {
    return null;
  }

  return MATCH_STATUS_LABELS[matchStatus] ?? matchStatus;
}

const LEGACY_PO_NUMBER_PREFIX = "LEGACY-";

export function formatPoNumberLabel(poNumber: string) {
  const isSynthesized = poNumber.startsWith(LEGACY_PO_NUMBER_PREFIX);
  return { label: poNumber, isSynthesized };
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatOptionalDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatQuantity(qty: number, unit: string) {
  const formatted = Number.isInteger(qty) ? String(qty) : qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted} ${unit}`;
}
