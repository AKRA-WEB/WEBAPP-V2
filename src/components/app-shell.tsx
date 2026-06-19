import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Home,
  LogIn,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Permissions", href: "/admin/permissions", icon: ShieldCheck },
  { label: "Picking", href: "/picking", icon: ClipboardList },
  { label: "Purchasing", href: "/purchasing", icon: ReceiptText },
  { label: "Receiving", href: "/receiving", icon: PackageCheck },
  { label: "Warehouse", href: "/warehouse", icon: Boxes },
  { label: "Returns", href: "/returns", icon: RefreshCcw },
  { label: "KPI", href: "/kpi", icon: BarChart3 },
  { label: "Sign In", href: "/login", icon: LogIn },
] as const;

export function AppShell({
  activeHref = "/",
  children,
}: {
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            A
          </div>
          <div>
            <strong>AKRA</strong>
            <span>WEBAPP V2</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent =
              item.href === "/"
                ? activeHref === "/"
                : activeHref === item.href || activeHref.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isCurrent ? "page" : undefined}
                href={item.href as Route}
                key={item.label}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">{children}</main>
    </div>
  );
}
