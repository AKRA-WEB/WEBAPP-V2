import Link from "next/link";
import type { Route } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { requirePermission } from "@/modules/auth/guard";
import { can } from "@/modules/auth/permissions";
import { PurchaseRequisitionTransitionControls } from "@/modules/purchasing/pr-transition-controls";
import { getPurchaseRequestDetail } from "@/modules/purchasing/read-model";
import {
  formatDateTime,
  formatMatchStatusLabel,
  formatOptionalDate,
  formatPurchaseRequestEventType,
  formatPurchaseRequestStatusLabel,
  formatQuantity,
  purchaseRequestStatusTone,
} from "@/modules/purchasing/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchase Requisition · Purchasing · AKRA WEBAPP V2",
};

export default async function PurchaseRequisitionDetailPage({
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
  const result = await getPurchaseRequestDetail(id);

  if (result.status === "error") {
    return (
      <AppShell activeHref="/purchasing">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Purchasing</p>
            <h1>Could not load purchase requisition</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>Something went wrong reading this purchase requisition. Try again shortly.</p>
        </div>
        <p>
          <Link href="/purchasing">Back to Purchasing</Link>
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
            <h1>Purchase requisition not found</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>This purchase requisition does not exist in staging, or was removed.</p>
        </div>
        <p>
          <Link href="/purchasing">Back to Purchasing</Link>
        </p>
      </AppShell>
    );
  }

  const { request } = result;
  const canTransition = request.status === "pr_pending" && can(guard.snapshot, "purchasing.write");
  const canCreatePo =
    request.status === "pr_approved" &&
    !request.linkedPoId &&
    can(guard.snapshot, "purchasing.write");

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>{request.requestNumber ?? "Unnumbered PR"}</h1>
        </div>
        <StatusPill tone={purchaseRequestStatusTone(request.status)}>
          {formatPurchaseRequestStatusLabel(request.status)}
        </StatusPill>
      </section>

      <section className="requisition-meta-grid" aria-label="Purchase requisition metadata">
        <div className="metric-panel">
          <span>Requester</span>
          <strong>{request.requesterName}</strong>
        </div>
        <div className="metric-panel">
          <span>Request date</span>
          <strong>{formatOptionalDate(request.requestDate)}</strong>
        </div>
        <div className="metric-panel">
          <span>Created</span>
          <strong>{formatDateTime(request.createdAt)}</strong>
        </div>
        {request.approvedAt && (
          <div className="metric-panel">
            <span>Approved</span>
            <strong>
              {formatDateTime(request.approvedAt)}
              {request.approvedByName ? ` · ${request.approvedByName}` : ""}
            </strong>
          </div>
        )}
        {request.rejectedReason && (
          <div className="metric-panel">
            <span>Rejected reason</span>
            <strong>{request.rejectedReason}</strong>
          </div>
        )}
      </section>

      {canTransition && <PurchaseRequisitionTransitionControls requestId={request.id} />}

      {request.linkedPoId && (
        <section className="module-detail" aria-label="Linked purchase order">
          <h2>Purchase order</h2>
          <p>
            <Link href={`/purchasing/${request.linkedPoId}` as Route}>
              {request.linkedPoNumber ?? request.linkedPoId}
            </Link>
          </p>
        </section>
      )}

      {canCreatePo && (
        <section className="module-detail" aria-label="Create purchase order">
          <h2>Next step</h2>
          <p>
            <Link className="primary-button" href={`/purchasing/pr/${request.id}/create-po` as Route}>
              Create purchase order
            </Link>
          </p>
        </section>
      )}

      <section className="module-detail" aria-label="Purchase requisition lines">
        <h2>Lines ({request.lines.length})</h2>
        <ul className="requisition-lines">
          {request.lines.map((line) => {
            const matchStatusLabel = formatMatchStatusLabel(line.matchStatus);

            return (
              <li className="requisition-line" key={line.id}>
                <span className="requisition-line__no">{line.lineNo}</span>
                <span className="requisition-line__name">
                  {line.catalogProductName ?? line.productName}
                  {matchStatusLabel && <StatusPill tone="slate">{matchStatusLabel}</StatusPill>}
                </span>
                <span className="requisition-line__qty">
                  {formatQuantity(line.requestedQty, line.unit)}
                </span>
                <p className="module-card__note">
                  {line.warehouseName ?? line.rawWarehouse ?? "Unknown warehouse"}
                </p>
                {line.remark && <p className="module-card__note">{line.remark}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="module-detail" aria-label="Purchase requisition history">
        <h2>History</h2>
        <ul className="requisition-timeline">
          {request.events.map((event) => (
            <li className="requisition-timeline__item" key={event.id}>
              <span className="requisition-timeline__type">
                {formatPurchaseRequestEventType(event.eventType)}
              </span>
              <span className="requisition-timeline__meta">
                {formatDateTime(event.createdAt)}
                {event.actorName ? ` · ${event.actorName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link href="/purchasing">Back to Purchasing</Link>
      </p>
    </AppShell>
  );
}
