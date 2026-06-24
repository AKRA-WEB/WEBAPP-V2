import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { getGoodsReceiptDetail } from "@/modules/receiving/read-model";
import {
  formatDateTime,
  formatExpiry,
  formatGoodsReceiptStatusLabel,
  formatMatchStatusLabel,
  formatOptionalDate,
  formatQuantity,
  goodsReceiptStatusTone,
} from "@/modules/receiving/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Goods Receipt · Receiving · AKRA WEBAPP V2",
};

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requirePermission({ anyOf: ["receiving.read", "receiving.write"] });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/receiving"
        eyebrow="Receiving"
        body={
          guard.reason === "forbidden"
            ? "You need the receiving.read or receiving.write permission to view this page."
            : undefined
        }
      />
    );
  }

  const { id } = await params;
  const result = await getGoodsReceiptDetail(id);

  if (result.status === "error") {
    return (
      <AppShell activeHref="/receiving">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Receiving</p>
            <h1>Could not load goods receipt</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>Something went wrong reading this goods receipt. Try again shortly.</p>
        </div>
        <p>
          <Link href="/receiving">← Back to recent goods receipts</Link>
        </p>
      </AppShell>
    );
  }

  if (result.status === "not_found") {
    return (
      <AppShell activeHref="/receiving">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Receiving</p>
            <h1>Goods receipt not found</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>This goods receipt does not exist in staging, or was removed.</p>
        </div>
        <p>
          <Link href="/receiving">← Back to recent goods receipts</Link>
        </p>
      </AppShell>
    );
  }

  const { receipt } = result;
  const liftFeeEntries = Object.entries(receipt.liftFeeSummary);

  return (
    <AppShell activeHref="/receiving">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Receiving</p>
          <h1>{receipt.linkedPoNumber ?? "No linked PO"}</h1>
          {!receipt.linkedPurchaseOrderId && (
            <p className="module-card__note">
              No linked PO (orphan import row) — the original V1 reference had
              no matching PO row to link to.
            </p>
          )}
        </div>
        <StatusPill tone={goodsReceiptStatusTone(receipt.status)}>
          {formatGoodsReceiptStatusLabel(receipt.status)}
        </StatusPill>
      </section>

      <section className="requisition-meta-grid" aria-label="Goods receipt metadata">
        <div className="metric-panel">
          <span>Receiver</span>
          <strong>{receipt.receiverName ?? "Unknown receiver"}</strong>
        </div>
        <div className="metric-panel">
          <span>Receipt date</span>
          <strong>{formatOptionalDate(receipt.receiptDate)}</strong>
        </div>
        <div className="metric-panel">
          <span>ATA date</span>
          <strong>{formatOptionalDate(receipt.ataDate)}</strong>
        </div>
        {receipt.remark && (
          <div className="metric-panel">
            <span>Remark</span>
            <strong>{receipt.remark}</strong>
          </div>
        )}
        {liftFeeEntries.length > 0 && (
          <div className="metric-panel">
            <span>Lift fee</span>
            <strong>
              {liftFeeEntries.map(([key, value]) => `${key}: ${String(value)}`).join(", ")}
            </strong>
          </div>
        )}
        {receipt.resetAt && (
          <div className="metric-panel">
            <span>Reset</span>
            <strong>
              {formatDateTime(receipt.resetAt)}
              {receipt.resetByName ? ` · ${receipt.resetByName}` : ""}
            </strong>
          </div>
        )}
        {receipt.recalledAt && (
          <div className="metric-panel">
            <span>Recalled</span>
            <strong>
              {formatDateTime(receipt.recalledAt)}
              {receipt.recalledByName ? ` · ${receipt.recalledByName}` : ""}
            </strong>
          </div>
        )}
      </section>

      <section className="module-detail" aria-label="Goods receipt lines">
        <h2>Lines ({receipt.lines.length})</h2>
        <ul className="requisition-lines">
          {receipt.lines.map((line) => {
            const matchStatusLabel = formatMatchStatusLabel(line.matchStatus);

            return (
              <li className="requisition-line" key={line.id}>
                <span className="requisition-line__name">
                  {line.catalogProductName ?? line.productName}
                  {line.isExtraItem && <StatusPill tone="blue">extra item</StatusPill>}
                  {!line.linkedPoLine && <StatusPill tone="slate">no linked PO line</StatusPill>}
                  {matchStatusLabel && <StatusPill tone="slate">{matchStatusLabel}</StatusPill>}
                </span>
                <span className="requisition-line__qty">
                  {formatQuantity(line.receivedQty, line.unit)}
                </span>
                <p className="module-card__note">
                  Expiry: {formatExpiry(line.expiryDate, line.rawExpiryDate, line.dateParseStatus)}
                  {line.locationSummary ? ` · ${line.locationSummary}` : ""}
                </p>
                {line.splits.length > 0 && (
                  <ul className="detail-list">
                    {line.splits.map((split) => (
                      <li key={split.id}>
                        {split.rawLocation}
                        {split.qty !== null ? ` — ${formatQuantity(split.qty, split.unit ?? line.unit)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="module-detail" aria-label="Import history">
        <h2>History</h2>
        <ul className="requisition-timeline">
          {receipt.events.map((event) => (
            <li className="requisition-timeline__item" key={event.id}>
              <span className="requisition-timeline__type">{event.eventType}</span>
              <span className="requisition-timeline__meta">
                {formatDateTime(event.createdAt)}
                {event.actorName ? ` · ${event.actorName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link href="/receiving">← Back to recent goods receipts</Link>
      </p>
    </AppShell>
  );
}
