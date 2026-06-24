import Link from "next/link";
import type { Route } from "next";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { listRecentPurchaseOrders } from "@/modules/purchasing/read-model";
import {
  formatOptionalDate,
  formatPoNumberLabel,
  formatPurchaseOrderStatusLabel,
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

  const result = await listRecentPurchaseOrders();

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>Recent Purchase Orders</h1>
        </div>
        <StatusPill tone="green">Imported</StatusPill>
      </section>

      {result.status === "error" && (
        <section className="module-detail" aria-label="Error">
          <div>
            <h2>Could not load purchase orders</h2>
            <p>Something went wrong reading Purchasing data. Try again shortly.</p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <section className="summary-grid" aria-label="Status summary">
          {Object.entries(result.statusSummary).map(([status, count]) => (
            <div className="metric-panel" key={status}>
              <span>{formatPurchaseOrderStatusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}

      {result.status === "ok" && result.items.length === 0 && (
        <section className="module-detail" aria-label="No purchase orders">
          <div>
            <h2>No purchase orders yet</h2>
            <p>Staging has no imported purchase orders yet.</p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <ul className="requisition-list" aria-label="Recent purchase orders">
          {result.items.map((item) => {
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
