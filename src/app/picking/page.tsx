import Link from "next/link";
import type { Route } from "next";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { can } from "@/modules/auth/permissions";
import { listRecentRequisitions } from "@/modules/picking/read-model";
import {
  formatBillLabel,
  formatDateTime,
  formatPickingStatusLabel,
  pickingStatusTone,
} from "@/modules/picking/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Picking · AKRA WEBAPP V2",
};

export default async function PickingPage() {
  const guard = await requirePermission({ anyOf: ["picking.read", "picking.write"] });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/picking"
        eyebrow="Picking"
        body={
          guard.reason === "forbidden"
            ? "You need the picking.read or picking.write permission to view this page."
            : undefined
        }
      />
    );
  }

  const result = await listRecentRequisitions();
  const canCreate = can(guard.snapshot, "picking.write");

  return (
    <AppShell activeHref="/picking">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Picking</p>
          <h1>Recent Requisitions</h1>
        </div>
        <div className="workspace-header__actions">
          {canCreate && (
            <Link className="primary-button" href="/picking/new">
              New requisition
            </Link>
          )}
          <StatusPill tone="green">Pilot</StatusPill>
        </div>
      </section>

      {result.status === "error" && (
        <section className="module-detail" aria-label="Error">
          <div>
            <h2>Could not load requisitions</h2>
            <p>
              Something went wrong reading Picking data. Try again shortly.
            </p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <section className="summary-grid" aria-label="Status summary">
          {Object.entries(result.statusSummary).map(([status, count]) => (
            <div className="metric-panel" key={status}>
              <span>{formatPickingStatusLabel(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}

      {result.status === "ok" && result.items.length === 0 && (
        <section className="module-detail" aria-label="No requisitions">
          <div>
            <h2>No requisitions yet</h2>
            <p>
              Staging has no Picking requisitions yet. Create requisition and V1
              history import are the next slice.
            </p>
          </div>
        </section>
      )}

      {result.status === "ok" && result.items.length > 0 && (
        <ul className="requisition-list" aria-label="Recent requisitions">
          {result.items.map((item) => (
            <li key={item.id}>
              <Link className="requisition-row" href={`/picking/${item.id}` as Route}>
                <div className="requisition-row__main">
                  <span className="requisition-row__bill">
                    {formatBillLabel(item.billNo)}
                  </span>
                  <StatusPill tone={pickingStatusTone(item.status)}>
                    {formatPickingStatusLabel(item.status)}
                  </StatusPill>
                </div>
                <div className="requisition-row__meta">
                  <span>{item.billType}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {item.requesterName} → {item.assigneeName}
                  </span>
                </div>
                <div className="requisition-row__footer">
                  <span>{formatDateTime(item.requestedAt)}</span>
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
