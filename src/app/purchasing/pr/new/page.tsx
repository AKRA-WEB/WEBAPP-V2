import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/modules/auth/guard";
import { NewPurchaseRequisitionForm } from "@/modules/purchasing/new-pr-form";
import { listPurchaseRequisitionReferenceData } from "@/modules/purchasing/reference-data";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Purchase Requisition · Purchasing · AKRA WEBAPP V2",
};

export default async function NewPurchaseRequisitionPage() {
  const guard = await requirePermission({ permission: "purchasing.write" });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/purchasing"
        eyebrow="Purchasing"
        body={guard.reason === "forbidden" ? "You need the purchasing.write permission to create a purchase requisition." : undefined}
      />
    );
  }

  const { products, warehouses } = await listPurchaseRequisitionReferenceData();

  return (
    <AppShell activeHref="/purchasing">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>New Purchase Requisition</h1>
        </div>
      </section>

      {warehouses.length === 0 && (
        <section className="module-detail" aria-label="No warehouses available">
          <p>No active warehouses found in staging. Run the reference-data import before creating a PR.</p>
        </section>
      )}

      {warehouses.length > 0 && (
        <section className="module-detail" aria-label="New purchase requisition form">
          <NewPurchaseRequisitionForm products={products} warehouses={warehouses} />
        </section>
      )}

      <p>
        <Link href="/purchasing">Back to Purchasing</Link>
      </p>
    </AppShell>
  );
}
