export type GoodsReceiptStatus = "gr_draft" | "gr_pending_review" | "gr_completed";

const STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  gr_draft: "Draft",
  gr_pending_review: "Pending review",
  gr_completed: "Completed",
};

const STATUS_TONES: Record<GoodsReceiptStatus, "blue" | "green" | "slate"> = {
  gr_draft: "slate",
  gr_pending_review: "blue",
  gr_completed: "green",
};

export function formatGoodsReceiptStatusLabel(status: string) {
  return STATUS_LABELS[status as GoodsReceiptStatus] ?? status;
}

export function goodsReceiptStatusTone(status: string) {
  return STATUS_TONES[status as GoodsReceiptStatus] ?? "slate";
}

const MATCH_STATUS_LABELS: Record<string, string> = {
  matched_code: "Matched (code)",
  matched_exact_name: "Matched (name)",
  manual_review: "Manual review",
  orphan_ref_po_uid: "Orphan PO reference",
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

const EXPIRY_DATE_LABELS: Record<string, string> = {
  placeholder: "No expiry ( — )",
  epoch_artifact: "No expiry (export artifact)",
};

export function formatExpiry(
  expiryDate: string | null,
  rawExpiryDate: string | null,
  dateParseStatus: string | null,
) {
  if (expiryDate) {
    return formatOptionalDate(expiryDate);
  }

  if (dateParseStatus === "malformed") {
    return `Invalid date (${rawExpiryDate ?? "raw value missing"})`;
  }

  if (dateParseStatus && EXPIRY_DATE_LABELS[dateParseStatus]) {
    return EXPIRY_DATE_LABELS[dateParseStatus];
  }

  return "—";
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
