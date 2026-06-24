import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { getPurchaseOrderDetail } from "@/modules/purchasing/read-model";
import {
  formatDateTime,
  formatMatchStatusLabel,
  formatOptionalDate,
  formatPoNumberLabel,
  formatPurchaseOrderStatusLabel,
  formatQuantity,
  purchaseOrderStatusTone,
} from "@/modules/purchasing/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchase Order · Purchasing · AKRA WEBAPP V2",
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requirePermission({ anyOf: ["purchasing.read", "purchasing.write"] });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/purchasing"
        eyebrow="Purchasing"
        body={
          guard.reason === "forbidden"
            ? "You need the purchasing.read or purchasing.write permission to view this page."
            : undefined
        }
      />
    );
  }

  const { id } = await params;
  const result = await getPurchaseOrderDetail(id);

  if (result.status === "error") {
    return (
      <AppShell activeHref="/purchasing">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Purchasing</p>
            <h1>Could not load purchase order</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>Something went wrong reading this purchase order. Try again shortly.</p>
        </div>
        <p>
          <Link href="/purchasing">← Back to recent purchase orders</Link>
        </p>
      </AppShell>
    );
  }

  if (result.status === "not_found") {
    return (
      <AppShell activeHref="/purchasing">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Purchasing</p>
            <h1>Purchase order not found</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>This purchase order does not exist in staging, or was removed.</p>
        </div>
        <p>
          <Link href="/purchasing">← Back to recent purchase orders</Link>
        </p>
      </AppShell>
    );
  }

  const { order } = result;
  const poLabel = formatPoNumberLabel(order.poNumber);

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>{poLabel.label}</h1>
          {poLabel.isSynthesized && (
            <p className="module-card__note">
              Synthesized identifier — no real V1 PO number was recorded for this
              legacy bill (ADR 0026). The original identity is preserved in
              {" "}
              {order.legacyGroupKey ?? "the legacy grouping key"}.
            </p>
          )}
        </div>
        <StatusPill tone={purchaseOrderStatusTone(order.status)}>
          {formatPurchaseOrderStatusLabel(order.status)}
        </StatusPill>
      </section>

      <section className="requisition-meta-grid" aria-label="Purchase order metadata">
        <div className="metric-panel">
          <span>Vendor</span>
          <strong>{order.vendorName ?? "Unknown vendor"}</strong>
        </div>
        <div className="metric-panel">
          <span>Warehouse</span>
          <strong>{order.warehouseName ?? "Unknown warehouse"}</strong>
        </div>
        <div className="metric-panel">
          <span>PO date</span>
          <strong>{formatOptionalDate(order.poDate)}</strong>
        </div>
        {order.isLegacyAmbiguous && (
          <div className="metric-panel">
            <span>Bill identity</span>
            <strong>Ambiguous legacy grouping (bare &quot;DIRECT&quot;)</strong>
          </div>
        )}
        {order.legacyRefPrUid && (
          <div className="metric-panel">
            <span>PR linkage</span>
            <strong>Manual review — no structured PR row (ADR 0022)</strong>
          </div>
        )}
        {order.closedAt && (
          <div className="metric-panel">
            <span>Closed</span>
            <strong>
              {formatDateTime(order.closedAt)}
              {order.closedByName ? ` · ${order.closedByName}` : ""}
            </strong>
          </div>
        )}
      </section>

      <section className="module-detail" aria-label="Purchase order lines">
        <h2>Lines ({order.lines.length})</h2>
        <ul className="requisition-lines">
          {order.lines.map((line) => {
            const matchStatusLabel = formatMatchStatusLabel(line.matchStatus);

            return (
              <li className="requisition-line" key={line.id}>
                <span className="requisition-line__no">{line.lineNo}</span>
                <span className="requisition-line__name">
                  {line.catalogProductName ?? line.productName}
                  {matchStatusLabel && <StatusPill tone="slate">{matchStatusLabel}</StatusPill>}
                </span>
                <span className="requisition-line__qty">
                  {formatQuantity(line.orderedQty, line.unit)}
                </span>
                {line.prNumberLabel && (
                  <p className="module-card__note">{line.prNumberLabel}</p>
                )}
                {line.remark && <p className="module-card__note">{line.remark}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="module-detail" aria-label="Import history">
        <h2>History</h2>
        <ul className="requisition-timeline">
          {order.events.map((event) => (
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
        <Link href="/purchasing">← Back to recent purchase orders</Link>
      </p>
    </AppShell>
  );
}
