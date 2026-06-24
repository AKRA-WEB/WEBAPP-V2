import Link from "next/link";
import type { Route } from "next";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { listRecentGoodsReceipts } from "@/modules/receiving/read-model";
import {
  formatGoodsReceiptStatusLabel,
  formatOptionalDate,
  goodsReceiptStatusTone,
} from "@/modules/receiving/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Receiving · AKRA WEBAPP V2",
};

export default async function ReceivingPage() {
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

  const result = await listRecentGoodsReceipts();

  return (
    <AppShell activeHref="/receiving">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Receiving</p>
          <h1>Recent Goods Receipts</h1>
        </div>
        <StatusPill tone="green">Imported</StatusPill>
      </section>

      {result.status === "error" && (
        <section className="module-detail" aria-label="Error">
          <div>
            <h2>Could not load goods receipts</h2>
            <p>Something went wrong reading Receiving data. Try again shortly.</p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <section className="summary-grid" aria-label="Status summary">
          {Object.entries(result.statusSummary).map(([status, count]) => (
            <div className="metric-panel" key={status}>
              <span>{formatGoodsReceiptStatusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}

      {result.status === "ok" && result.items.length === 0 && (
        <section className="module-detail" aria-label="No goods receipts">
          <div>
            <h2>No goods receipts yet</h2>
            <p>Staging has no imported goods receipts yet.</p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <ul className="requisition-list" aria-label="Recent goods receipts">
          {result.items.map((item) => (
            <li key={item.id}>
              <Link className="requisition-row" href={`/receiving/${item.id}` as Route}>
                <div className="requisition-row__main">
                  <span className="requisition-row__bill">
                    {item.linkedPoNumber ?? "No linked PO"}
                  </span>
                  <StatusPill tone={goodsReceiptStatusTone(item.status)}>
                    {formatGoodsReceiptStatusLabel(item.status)}
                  </StatusPill>
                </div>
                <div className="requisition-row__meta">
                  <span>{item.receiverName ?? "Unknown receiver"}</span>
                </div>
                <div className="requisition-row__footer">
                  <span>{formatOptionalDate(item.receiptDate)}</span>
                  <span>
                    {item.lineCount} {item.lineCount === 1 ? "line" : "lines"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/">← Back to dashboard</Link>
      </p>
    </AppShell>
  );
}
