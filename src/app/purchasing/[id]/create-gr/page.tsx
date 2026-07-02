import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { getPurchaseOrderDetail } from "@/modules/purchasing/read-model";
import { formatPoNumberLabel } from "@/modules/purchasing/format";
import { CreateGrFromPoForm } from "@/modules/receiving/create-gr-from-po-form";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Goods Receipt · Purchasing · AKRA WEBAPP V2",
};

export default async function CreateGrFromPoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guard = await requirePermission({ permission: "receiving.write" });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/purchasing"
        eyebrow="Purchasing"
        body={
          guard.reason === "forbidden"
            ? "You need the receiving.write permission to create a goods receipt."
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
    redirect(`/purchasing`);
  }

  const { order } = result;

  if (order.status !== "po_pending_receipt") {
    redirect(`/purchasing/${id}`);
  }

  const poLabel = formatPoNumberLabel(order.poNumber);

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing · {poLabel.label}</p>
          <h1>Create goods receipt</h1>
        </div>
      </section>

      <CreateGrFromPoForm order={order} />

      <p>
        <Link href={`/purchasing/${id}`}>← Back to purchase order</Link>
      </p>
    </AppShell>
  );
}
