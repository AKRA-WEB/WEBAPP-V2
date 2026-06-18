import Link from "next/link";
import { BarChart3, Boxes, ClipboardList, Home, PackageCheck } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Picking", href: "/", icon: ClipboardList },
  { label: "Warehouse", href: "/", icon: Boxes },
  { label: "Receiving", href: "/", icon: PackageCheck },
  { label: "KPI", href: "/", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
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
          {navItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Link
                aria-current={index === 0 ? "page" : undefined}
                href={item.href}
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
