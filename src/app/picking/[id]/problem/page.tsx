import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { getRequisitionDetail } from "@/modules/picking/read-model";
import { formatBillLabel } from "@/modules/picking/format";
import { ProblemReportForm } from "@/modules/picking/problem-report-form";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report Problem · Picking · AKRA WEBAPP V2",
};

export default async function PickingProblemReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requirePermission({ permission: "picking.write" });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/picking"
        eyebrow="Picking"
        body={guard.reason === "forbidden" ? "You need the picking.write permission to report a problem." : undefined}
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
          <p>This requisition does not exist in staging, or was removed.</p>
        </div>
        <p>
          <Link href="/picking">← Back to recent requisitions</Link>
        </p>
      </AppShell>
    );
  }

  const { requisition } = result;

  return (
    <AppShell activeHref="/picking">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Picking</p>
          <h1>Report Problem · {formatBillLabel(requisition.billNo)}</h1>
        </div>
      </section>

      {requisition.status === "sent" ? (
        <section className="module-detail" aria-label="Requisition already sent">
          <p>This requisition has already been sent and can no longer be edited.</p>
        </section>
      ) : (
        <section className="module-detail" aria-label="Problem report form">
          <ProblemReportForm requisitionId={requisition.id} lines={requisition.lines} />
        </section>
      )}

      <p>
        <Link href={`/picking/${requisition.id}`}>← Back to requisition</Link>
      </p>
    </AppShell>
  );
}
