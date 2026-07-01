import Link from "next/link";
import type { Route } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { requirePermission } from "@/modules/auth/guard";
import { CreatePoFromPrForm } from "@/modules/purchasing/create-po-from-pr-form";
import { getPurchaseRequestDetail } from "@/modules/purchasing/read-model";
import { listCreatePoReferenceData } from "@/modules/purchasing/reference-data";
import {
  formatOptionalDate,
  formatPurchaseRequestStatusLabel,
  purchaseRequestStatusTone,
} from "@/modules/purchasing/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Purchase Order · Purchasing · AKRA WEBAPP V2",
};

export default async function CreatePoFromPrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requirePermission({ permission: "purchasing.write" });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/purchasing"
        eyebrow="Purchasing"
        body={
          guard.reason === "forbidden"
            ? "You need the purchasing.write permission to create purchase orders."
            : undefined
        }
      />
    );
  }

  const { id } = await params;
  const [result, refData] = await Promise.all([
    getPurchaseRequestDetail(id),
    listCreatePoReferenceData(),
  ]);

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

  if (request.status !== "pr_approved") {
    return (
      <AppShell activeHref="/purchasing">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Purchasing</p>
            <h1>Cannot create PO</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>
            Only approved purchase requisitions can become purchase orders. This PR is{" "}
            <strong>{formatPurchaseRequestStatusLabel(request.status)}</strong>.
          </p>
        </div>
        <p>
          <Link href={`/purchasing/pr/${id}` as Route}>← Back to PR {request.requestNumber ?? id}</Link>
        </p>
      </AppShell>
    );
  }

  if (request.linkedPoId) {
    return (
      <AppShell activeHref="/purchasing">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Purchasing</p>
            <h1>PO already exists</h1>
          </div>
        </section>
        <div className="module-detail">
          <p>
            A purchase order{" "}
            <Link href={`/purchasing/${request.linkedPoId}` as Route}>
              {request.linkedPoNumber ?? request.linkedPoId}
            </Link>{" "}
            already exists for this PR.
          </p>
        </div>
        <p>
          <Link href={`/purchasing/pr/${id}` as Route}>← Back to PR {request.requestNumber ?? id}</Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing · {request.requestNumber ?? "PR"}</p>
          <h1>Create purchase order</h1>
        </div>
        <StatusPill tone={purchaseRequestStatusTone(request.status)}>
          {formatPurchaseRequestStatusLabel(request.status)}
        </StatusPill>
      </section>

      <section className="requisition-meta-grid" aria-label="Source PR metadata">
        <div className="metric-panel">
          <span>Requester</span>
          <strong>{request.requesterName}</strong>
        </div>
        <div className="metric-panel">
          <span>Request date</span>
          <strong>{formatOptionalDate(request.requestDate)}</strong>
        </div>
      </section>

      <CreatePoFromPrForm request={request} vendors={refData.vendors} />

      <p>
        <Link href={`/purchasing/pr/${id}` as Route}>← Cancel and return to PR</Link>
      </p>
    </AppShell>
  );
}
