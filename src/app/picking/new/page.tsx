import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/access-denied";
import { requirePermission } from "@/modules/auth/guard";
import { listActivePickingStaff, listPickingProductSuggestions } from "@/modules/picking/reference-data";
import { NewRequisitionForm } from "@/modules/picking/new-requisition-form";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Requisition · Picking · AKRA WEBAPP V2",
};

export default async function NewPickingRequisitionPage() {
  const guard = await requirePermission({ permission: "picking.write" });

  if (guard.status !== "allowed") {
    return (
      <AccessDenied
        reason={guard.reason}
        activeHref="/picking"
        eyebrow="Picking"
        body={guard.reason === "forbidden" ? "You need the picking.write permission to create a requisition." : undefined}
      />
    );
  }

  const [staff, suggestions] = await Promise.all([
    listActivePickingStaff(),
    listPickingProductSuggestions(),
  ]);

  return (
    <AppShell activeHref="/picking">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Picking</p>
          <h1>New Requisition</h1>
        </div>
      </section>

      {staff.length === 0 && (
        <section className="module-detail" aria-label="No staff available">
          <p>
            No active Picking staff found in staging. Run the reference-data import before creating a
            requisition.
          </p>
        </section>
      )}

      {staff.length > 0 && (
        <section className="module-detail" aria-label="New requisition form">
          <NewRequisitionForm staff={staff} suggestions={suggestions} />
        </section>
      )}

      <p>
        <Link href="/picking">← Back to recent requisitions</Link>
      </p>
    </AppShell>
  );
}
