import {
  BarChart3,
  Boxes,
  ClipboardList,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";

const modules = [
  {
    name: "Core",
    description: "Users, roles, permissions, audit",
    status: "Planning",
    icon: ShieldCheck,
  },
  {
    name: "Picking",
    description: "Requisition, bill numbers, issue flow",
    status: "Pilot",
    icon: ClipboardList,
  },
  {
    name: "Purchasing",
    description: "PR, PO, vendor lead time",
    status: "Queued",
    icon: ReceiptText,
  },
  {
    name: "Receiving",
    description: "GR, warehouse locations, reset/recall",
    status: "Queued",
    icon: PackageCheck,
  },
  {
    name: "Warehouse",
    description: "TRDAKRA, dispatch, survey, stock",
    status: "Queued",
    icon: Boxes,
  },
  {
    name: "Returns",
    description: "Return intake, claims, damaged goods",
    status: "Queued",
    icon: RefreshCcw,
  },
  {
    name: "KPI",
    description: "Daily records and dashboards",
    status: "Queued",
    icon: BarChart3,
  },
  {
    name: "Notifications",
    description: "LINE jobs and delivery hooks",
    status: "Queued",
    icon: Truck,
  },
];

export default function Home() {
  return (
    <AppShell>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1>Migration Control</h1>
        </div>
        <StatusPill tone="blue">Phase 1</StatusPill>
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
          const Icon = module.icon;

          return (
            <article className="module-card" key={module.name}>
              <div className="module-card__icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <div className="module-card__body">
                <div className="module-card__title-row">
                  <h2>{module.name}</h2>
                  <StatusPill tone={module.status === "Pilot" ? "green" : "slate"}>
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
