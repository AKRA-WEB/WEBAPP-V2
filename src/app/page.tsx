import {
  BarChart3,
  Boxes,
  ClipboardList,
  type LucideIcon,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { getAppRegistry, type AppStatus } from "@/modules/core/app-registry";

const icons: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  ClipboardList,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Truck,
};

function statusTone(status: AppStatus) {
  if (status === "Pilot" || status === "Live") {
    return "green";
  }

  if (status === "Planning") {
    return "blue";
  }

  return "slate";
}

export default async function Home() {
  const { items: modules } = await getAppRegistry();

  return (
    <AppShell>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1>Migration Control</h1>
        </div>
        <StatusPill tone="blue">Phase 2</StatusPill>
      </section>

      <section className="summary-grid" aria-label="Migration summary">
        <div className="metric-panel">
          <span>Production impact</span>
          <strong>None</strong>
        </div>
        <div className="metric-panel">
          <span>Target runtime</span>
          <strong>Next.js</strong>
        </div>
        <div className="metric-panel">
          <span>Database</span>
          <strong>Supabase</strong>
        </div>
        <div className="metric-panel">
          <span>Pilot module</span>
          <strong>Picking</strong>
        </div>
      </section>

      <section className="module-grid" aria-label="Modules">
        {modules.map((module) => {
          const Icon = icons[module.icon] ?? Boxes;

          return (
            <article className="module-card" key={module.key}>
              <div className="module-card__icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <div className="module-card__body">
                <div className="module-card__title-row">
                  <h2>{module.name}</h2>
                  <StatusPill tone={statusTone(module.status)}>
                    {module.status}
                  </StatusPill>
                </div>
                <p>{module.description}</p>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
