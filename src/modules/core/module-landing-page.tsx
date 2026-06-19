import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { getAppRegistry, type AppRegistryItem } from "@/modules/core/app-registry";

const moduleNotes: Record<string, string[]> = {
  picking: [
    "Pilot schema is applied and verified in staging.",
    "Next slice: requisition list, create flow, status changes, and problem reports.",
  ],
  purchasing: [
    "Queued after the Picking pilot establishes the V2 workflow pattern.",
    "PR, PO, and GR remain grouped because V1 uses shared purchasing behavior.",
  ],
  receiving: [
    "Queued with the purchasing migration because receiving depends on stable PO identity.",
    "Current V1 GR stays live until a module cutover is approved.",
  ],
  warehouse: [
    "Queued after the pilot and purchasing/receiving foundation.",
    "TRDAKRA and AKRA W5 need shared stock/location modeling before cutover.",
  ],
  returns: [
    "Queued after warehouse dependencies are stable.",
    "Return intake, claims, and damaged-goods workflows remain in V1 for now.",
  ],
  kpi: [
    "Queued after operational modules produce V2 data.",
    "Reports should use V2 tables or secured views as their source of truth.",
  ],
};

function statusTone(status: AppRegistryItem["status"]) {
  if (status === "Pilot" || status === "Live") {
    return "green";
  }

  if (status === "Planning") {
    return "blue";
  }

  return "slate";
}

export async function ModuleLandingPage({ appKey }: { appKey: string }) {
  const { items } = await getAppRegistry();
  const app = items.find((item) => item.key === appKey);

  if (!app || !app.route) {
    notFound();
  }

  const notes = moduleNotes[app.key] ?? ["Module route is reserved for future V2 work."];

  return (
    <AppShell activeHref={app.route}>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Module</p>
          <h1>{app.name}</h1>
        </div>
        <StatusPill tone={statusTone(app.status)}>{app.status}</StatusPill>
      </section>

      <section className="module-detail" aria-labelledby={`${app.key}-status`}>
        <div>
          <h2 id={`${app.key}-status`}>Current Status</h2>
          <p>{app.description}</p>
        </div>

        <ul className="detail-list">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
