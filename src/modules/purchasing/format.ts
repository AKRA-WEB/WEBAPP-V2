export type PurchaseOrderStatus = "po_pending_receipt" | "po_closed_apv_ready";
export type PurchaseRequestStatus = "pr_pending" | "pr_approved" | "pr_rejected";

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  po_pending_receipt: "Pending receipt",
  po_closed_apv_ready: "Closed (APV ready)",
};

const STATUS_TONES: Record<PurchaseOrderStatus, "blue" | "green" | "slate"> = {
  po_pending_receipt: "blue",
  po_closed_apv_ready: "green",
};

const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  pr_pending: "Pending approval",
  pr_approved: "Approved",
  pr_rejected: "Rejected",
};

const REQUEST_STATUS_TONES: Record<PurchaseRequestStatus, "blue" | "green" | "slate"> = {
  pr_pending: "blue",
  pr_approved: "green",
  pr_rejected: "slate",
};

const REQUEST_EVENT_LABELS: Record<string, string> = {
  pr_created: "Created",
  pr_approved: "Approved",
  pr_rejected: "Rejected",
};

const ORDER_EVENT_LABELS: Record<string, string> = {
  po_created_from_pr: "Created from PR",
  po_created_direct: "Created (direct)",
  po_closed: "Closed",
  po_apv_marked: "APV marked",
};

export function formatPurchaseOrderStatusLabel(status: string) {
  return STATUS_LABELS[status as PurchaseOrderStatus] ?? status;
}

export function purchaseOrderStatusTone(status: string) {
  return STATUS_TONES[status as PurchaseOrderStatus] ?? "slate";
}

export function formatPurchaseRequestStatusLabel(status: string) {
  return REQUEST_STATUS_LABELS[status as PurchaseRequestStatus] ?? status;
}

export function purchaseRequestStatusTone(status: string) {
  return REQUEST_STATUS_TONES[status as PurchaseRequestStatus] ?? "slate";
}

export function formatPurchaseRequestEventType(eventType: string) {
  return REQUEST_EVENT_LABELS[eventType] ?? eventType;
}

export function formatPurchaseOrderEventType(eventType: string) {
  return ORDER_EVENT_LABELS[eventType] ?? eventType;
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
