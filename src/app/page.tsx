import {
  BarChart3,
  Boxes,
  ClipboardList,
  LogIn,
  type LucideIcon,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getPermissionSnapshot } from "@/modules/auth/get-permission-snapshot";
import { can, type AppPermission } from "@/modules/auth/permissions";
import {
  getAppRegistry,
  type AppRegistryItem,
  type AppStatus,
} from "@/modules/core/app-registry";

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

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

// Thai-first descriptions for the Main launcher, preserving V1 module names
// as-is (operators already recognize them) per ADR 0008.
const moduleDescriptionTh: Record<string, string> = {
  core: "ผู้ใช้ บทบาท สิทธิ์ และประวัติการใช้งาน",
  picking: "ใบเบิกสินค้า เลขที่บิล และการแจ้งปัญหา",
  purchasing: "PR, PO และระยะเวลาส่งมอบของผู้ขาย",
  receiving: "GR ตำแหน่งจัดเก็บ และการรีเซ็ต/เรียกคืน",
  warehouse: "TRDAKRA การจ่ายสินค้า สำรวจ และสต๊อก",
  returns: "รับคืนสินค้า เคลม และของเสียหาย",
  kpi: "บันทึกประจำวันและแดชบอร์ด",
  notifications: "งาน LINE และการแจ้งเตือน",
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

function ModuleCard({
  module,
  isAllowed,
  deniedNote,
}: {
  module: AppRegistryItem;
  isAllowed: boolean;
  deniedNote?: string;
}) {
  const Icon = icons[module.icon] ?? Boxes;
  const description = moduleDescriptionTh[module.key] ?? module.description;
  const body = (
    <>
      <div className="module-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="module-card__body">
        <div className="module-card__title-row">
          <h2>{module.name}</h2>
          <StatusPill tone={statusTone(module.status)}>{module.status}</StatusPill>
        </div>
        <p>{description}</p>
        {deniedNote && <p className="module-card__note">{deniedNote}</p>}
      </div>
    </>
  );

  if (isAllowed && module.route) {
    return (
      <Link className="module-card module-card--link" href={module.route as Route}>
        {body}
      </Link>
    );
  }

  return <article className="module-card module-card--disabled">{body}</article>;
}

export default async function Home() {
  const { items: modules } = await getAppRegistry();

  if (!hasPublicSupabaseEnv()) {
    return (
      <AppShell activeHref="/">
        <section className="hero-panel">
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1>ยังไม่ตั้งค่าระบบ</h1>
          <p>กรุณาตั้งค่า Supabase ใน .env.local ก่อนใช้งาน</p>
        </section>

        <section className="module-grid" aria-label="ตัวอย่างโมดูล">
          {modules.map((module) => (
            <ModuleCard key={module.key} module={module} isAllowed={false} />
          ))}
        </section>
      </AppShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell activeHref="/">
        <section className="hero-panel">
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1>ระบบจัดการ AKRA แบบรวมศูนย์</h1>
          <p>เข้าสู่ระบบเพื่อดูโมดูลที่คุณมีสิทธิ์ใช้งาน</p>
          <Link className="primary-button" href="/login">
            <LogIn size={18} strokeWidth={1.8} aria-hidden="true" />
            เข้าสู่ระบบ
          </Link>
          <p className="hero-panel__status">สถานะ: Staging · ยังไม่กระทบระบบเดิม (V1)</p>
        </section>

        <section className="module-grid" aria-label="ตัวอย่างโมดูล">
          {modules.map((module) => (
            <ModuleCard key={module.key} module={module} isAllowed={false} />
          ))}
        </section>
      </AppShell>
    );
  }

  const snapshot = await getPermissionSnapshot();
  const isAdmin = can(snapshot, "core.admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.display_name || profile?.email || user.email || "ผู้ใช้งาน";

  const allowedModules: AppRegistryItem[] = [];
  const queuedModules: { module: AppRegistryItem; deniedNote?: string }[] = [];

  for (const appItem of modules) {
    const permissionOk =
      !appItem.requiredPermission || can(snapshot, appItem.requiredPermission as AppPermission);

    if (appItem.route && permissionOk) {
      allowedModules.push(appItem);
    } else {
      queuedModules.push({
        module: appItem,
        deniedNote: appItem.route && !permissionOk ? "ต้องขอสิทธิ์เพิ่มเติม" : undefined,
      });
    }
  }

  return (
    <AppShell activeHref="/">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1>หน้าหลัก</h1>
          <p className="workspace-header__user">
            {displayName}
            {snapshot?.roles.length ? ` · ${snapshot.roles.join(", ")}` : ""}
          </p>
        </div>
        <StatusPill tone="blue">Staging</StatusPill>
      </section>

      {allowedModules.length > 0 ? (
        <section className="module-grid" aria-label="โมดูลที่ใช้งานได้">
          {allowedModules.map((module) => (
            <ModuleCard key={module.key} module={module} isAllowed />
          ))}
        </section>
      ) : (
        <section className="module-detail" aria-label="ไม่มีโมดูลที่ใช้งานได้">
          <div>
            <h2>ยังไม่มีโมดูลที่คุณมีสิทธิ์ใช้งาน</h2>
            <p>ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึงโมดูลที่ต้องใช้งาน</p>
          </div>
        </section>
      )}

      {queuedModules.length > 0 && (
        <section aria-label="โมดูลอื่น ๆ">
          <h2 className="section-label">โมดูลอื่น ๆ</h2>
          <div className="module-grid">
            {queuedModules.map(({ module, deniedNote }) => (
              <ModuleCard key={module.key} module={module} isAllowed={false} deniedNote={deniedNote} />
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <section aria-label="ผู้ดูแลระบบ">
          <h2 className="section-label">ผู้ดูแลระบบ</h2>
          <Link className="secondary-button" href="/admin/permissions">
            <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
            จัดการสิทธิ์และผู้ใช้
          </Link>
        </section>
      )}

      <section className="secondary-panel summary-grid" aria-label="Migration status">
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
    </AppShell>
  );
}
