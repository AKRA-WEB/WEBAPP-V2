import Link from "next/link";
import type { Route } from "next";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { can } from "@/modules/auth/permissions";
import { listRecentPurchaseOrders, listRecentPurchaseRequests } from "@/modules/purchasing/read-model";
import {
  formatOptionalDate,
  formatPoNumberLabel,
  formatPurchaseOrderStatusLabel,
  formatPurchaseRequestStatusLabel,
  purchaseRequestStatusTone,
  purchaseOrderStatusTone,
} from "@/modules/purchasing/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchasing · AKRA WEBAPP V2",
};

export default async function PurchasingPage() {
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

  const canCreatePr = can(guard.snapshot, "purchasing.write");
  const [requestsResult, ordersResult] = await Promise.all([
    listRecentPurchaseRequests(),
    listRecentPurchaseOrders(),
  ]);

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>Purchase Requisitions and Orders</h1>
        </div>
        <div className="workspace-header__actions">
          {canCreatePr && (
            <Link className="primary-button" href={"/purchasing/pr/new" as Route}>
              New PR
            </Link>
          )}
          <StatusPill tone="green">Staging</StatusPill>
        </div>
      </section>

      <h2 className="section-label">Purchase Requisitions</h2>

      {requestsResult.status === "error" && (
        <section className="module-detail" aria-label="Error">
          <div>
            <h2>Could not load purchase requisitions</h2>
            <p>Something went wrong reading Purchasing data. Try again shortly.</p>
          </div>
        </section>
      )}

      {requestsResult.status === "ok" && requestsResult.items.length > 0 && (
        <section className="summary-grid" aria-label="PR status summary">
          {Object.entries(requestsResult.statusSummary).map(([status, count]) => (
            <div className="metric-panel" key={status}>
              <span>{formatPurchaseRequestStatusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}

      {requestsResult.status === "ok" && requestsResult.items.length === 0 && (
        <section className="module-detail" aria-label="No purchase requisitions">
          <div>
            <h2>No purchase requisitions yet</h2>
            <p>Staging has no V2-created purchase requisitions yet.</p>
          </div>
        </section>
      )}

      {requestsResult.status === "ok" && requestsResult.items.length > 0 && (
        <ul className="requisition-list" aria-label="Recent purchase requisitions">
          {requestsResult.items.map((item) => (
            <li key={item.id}>
              <Link className="requisition-row" href={`/purchasing/pr/${item.id}` as Route}>
                <div className="requisition-row__main">
                  <span className="requisition-row__bill">{item.requestNumber ?? "Unnumbered PR"}</span>
                  <StatusPill tone={purchaseRequestStatusTone(item.status)}>
                    {formatPurchaseRequestStatusLabel(item.status)}
                  </StatusPill>
                </div>
                <div className="requisition-row__meta">
                  <span>{item.requesterName}</span>
                </div>
                <div className="requisition-row__footer">
                  <span>{formatOptionalDate(item.requestDate)}</span>
                  <span>
                    {item.lineCount} {item.lineCount === 1 ? "line" : "lines"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-label">Purchase Orders</h2>

      {ordersResult.status === "error" && (
        <section className="module-detail" aria-label="Error">
          <div>
            <h2>Could not load purchase orders</h2>
            <p>Something went wrong reading Purchasing data. Try again shortly.</p>
          </div>
        </section>
      )}

      {ordersResult.status === "ok" && ordersResult.items.length > 0 && (
        <section className="summary-grid" aria-label="PO status summary">
          {Object.entries(ordersResult.statusSummary).map(([status, count]) => (
            <div className="metric-panel" key={status}>
              <span>{formatPurchaseOrderStatusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}

      {ordersResult.status === "ok" && ordersResult.items.length === 0 && (
        <section className="module-detail" aria-label="No purchase orders">
          <div>
            <h2>No purchase orders yet</h2>
            <p>Staging has no imported purchase orders yet.</p>
          </div>
        </section>
      )}

      {ordersResult.status === "ok" && ordersResult.items.length > 0 && (
        <ul className="requisition-list" aria-label="Recent purchase orders">
          {ordersResult.items.map((item) => {
            const poLabel = formatPoNumberLabel(item.poNumber);

            return (
              <li key={item.id}>
                <Link className="requisition-row" href={`/purchasing/${item.id}` as Route}>
                  <div className="requisition-row__main">
                    <span className="requisition-row__bill">
                      {poLabel.label}
                      {poLabel.isSynthesized ? " (legacy)" : ""}
                    </span>
                    <StatusPill tone={purchaseOrderStatusTone(item.status)}>
                      {formatPurchaseOrderStatusLabel(item.status)}
                    </StatusPill>
                  </div>
                  <div className="requisition-row__meta">
                    <span>{item.vendorName ?? "Unknown vendor"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.warehouseName ?? "Unknown warehouse"}</span>
                  </div>
                  <div className="requisition-row__footer">
                    <span>{formatOptionalDate(item.poDate)}</span>
                    <span>
                      {item.lineCount} {item.lineCount === 1 ? "line" : "lines"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p>
        <Link href="/">← Back to dashboard</Link>
      </p>
    </AppShell>
  );
}
