import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { can } from "@/modules/auth/permissions";
import { getRequisitionDetail } from "@/modules/picking/read-model";
import { transitionPickingRequisitionStatus } from "@/modules/picking/transition-action";
import { retryPickingLineNotification } from "@/modules/picking/line-notification-action";
import {
  formatBillLabel,
  formatDateTime,
  formatPickingStatusLabel,
  formatQuantity,
  pickingStatusTone,
} from "@/modules/picking/format";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

const LINE_EVENT_TYPES = new Set([
  "line_notification_sent",
  "line_notification_skipped",
  "line_push_failed",
]);

export const metadata = {
  title: "Requisition · Picking · AKRA WEBAPP V2",
};

export default async function PickingRequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const result = await getRequisitionDetail(id);

  if (result.status === "error") {
    return (
      <AppShell activeHref="/picking">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Picking</p>
            <h1>Could not load requisition</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>Something went wrong reading this requisition. Try again shortly.</p>
        </div>
        <p>
          <Link href="/picking">← Back to recent requisitions</Link>
        </p>
      </AppShell>
    );
  }

  if (result.status === "not_found") {
    return (
      <AppShell activeHref="/picking">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Picking</p>
            <h1>Requisition not found</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>
            This requisition does not exist in staging, or was removed.
          </p>
        </div>
        <p>
          <Link href="/picking">← Back to recent requisitions</Link>
        </p>
      </AppShell>
    );
  }

  const { requisition } = result;
  const canTransition = can(guard.snapshot, "picking.write");
  const latestLineEvent = [...requisition.events]
    .reverse()
    .find((event) => LINE_EVENT_TYPES.has(event.eventType));
  const lineNotificationFailed = latestLineEvent?.eventType === "line_push_failed";

  return (
    <AppShell activeHref="/picking">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Picking</p>
          <h1>{formatBillLabel(requisition.billNo)}</h1>
        </div>
        <div className="workspace-header__actions">
          {canTransition && requisition.status === "pending" && (
            <form
              action={transitionPickingRequisitionStatus.bind(null, requisition.id, "picked")}
            >
              <button className="primary-button" type="submit">
                Mark picked
              </button>
            </form>
          )}
          {canTransition && requisition.status === "picked" && (
            <form
              action={transitionPickingRequisitionStatus.bind(null, requisition.id, "sent")}
            >
              <button className="primary-button" type="submit">
                Mark sent
              </button>
            </form>
          )}
          {canTransition && requisition.status !== "sent" && (
            <Link className="secondary-button" href={`/picking/${requisition.id}/problem`}>
              Report problem
            </Link>
          )}
          {canTransition && lineNotificationFailed && (
            <form action={retryPickingLineNotification.bind(null, requisition.id)}>
              <button className="secondary-button" type="submit">
                Retry LINE notification
              </button>
            </form>
          )}
          <StatusPill tone={pickingStatusTone(requisition.status)}>
            {formatPickingStatusLabel(requisition.status)}
          </StatusPill>
        </div>
      </section>

      <section className="requisition-meta-grid" aria-label="Requisition metadata">
        <div className="metric-panel">
          <span>Bill type</span>
          <strong>{requisition.billType}</strong>
        </div>
        <div className="metric-panel">
          <span>Requester</span>
          <strong>{requisition.requesterName}</strong>
        </div>
        <div className="metric-panel">
          <span>Assignee</span>
          <strong>{requisition.assigneeName}</strong>
        </div>
        <div className="metric-panel">
          <span>Requested</span>
          <strong>{formatDateTime(requisition.requestedAt)}</strong>
        </div>
        {requisition.pickedAt && (
          <div className="metric-panel">
            <span>Picked</span>
            <strong>
              {formatDateTime(requisition.pickedAt)}
              {requisition.pickedByName ? ` · ${requisition.pickedByName}` : ""}
            </strong>
          </div>
        )}
        {requisition.sentAt && (
          <div className="metric-panel">
            <span>Sent</span>
            <strong>
              {formatDateTime(requisition.sentAt)}
              {requisition.sentByName ? ` · ${requisition.sentByName}` : ""}
            </strong>
          </div>
        )}
        {requisition.problemAt && (
          <div className="metric-panel">
            <span>Problem reported</span>
            <strong>
              {formatDateTime(requisition.problemAt)}
              {requisition.problemByName ? ` · ${requisition.problemByName}` : ""}
            </strong>
          </div>
        )}
      </section>

      <section className="module-detail" aria-label="Requisition lines">
        <h2>Lines ({requisition.lines.length})</h2>
        <ul className="requisition-lines">
          {requisition.lines.map((line) => (
            <li className="requisition-line" key={line.id}>
              <span className="requisition-line__no">{line.lineNo}</span>
              <span className="requisition-line__name">
                {line.productName}
                {line.isFreeText && <StatusPill tone="slate">free text</StatusPill>}
              </span>
              <span className="requisition-line__qty">
                {formatQuantity(line.requestedQty, line.unit)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="module-detail" aria-label="Lifecycle events">
        <h2>Lifecycle</h2>
        <ul className="requisition-timeline">
          {requisition.events.map((event) => (
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

      {requisition.problemReports.length > 0 && (
        <section className="module-detail" aria-label="Problem reports">
          <h2>Problem reports ({requisition.problemReports.length})</h2>
          {requisition.problemReports.map((report) => (
            <div key={report.id} className="line-row">
              <p className="problem-report__meta">
                {formatDateTime(report.reportedAt)} · {report.reportedByName}
              </p>
              <ul className="requisition-lines">
                {report.lines.map((line) => {
                  const isShort = line.actualQty < line.requestedQty;
                  return (
                    <li className="requisition-line" key={line.id}>
                      <span className="requisition-line__name">
                        {line.productName}
                        {isShort && (
                          <StatusPill tone="blue">
                            short {formatQuantity(line.requestedQty - line.actualQty, line.unit)}
                          </StatusPill>
                        )}
                      </span>
                      <span className="requisition-line__qty">
                        {formatQuantity(line.actualQty, line.unit)} / {formatQuantity(line.requestedQty, line.unit)}
                      </span>
                      {line.note && <p className="module-card__note">{line.note}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      <p>
        <Link href="/picking">← Back to recent requisitions</Link>
      </p>
    </AppShell>
  );
}
