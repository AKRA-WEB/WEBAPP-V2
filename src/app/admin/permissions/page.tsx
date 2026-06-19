import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/modules/auth/permissions";
import { getPermissionSnapshot } from "@/modules/auth/get-permission-snapshot";

type RoleRow = { key: string; name: string; description: string | null };
type PermissionRow = { key: string; description: string | null };
type AppRow = {
  key: string;
  name: string;
  status: string;
  required_permission: string | null;
  is_active: boolean;
};

// Auth-gated, per-user data: never statically cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Permissions · AKRA WEBAPP V2",
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <AppShell activeHref="/admin/permissions">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Core · Admin</p>
          <h1>{title}</h1>
        </div>
      </section>
      <p className="form-message">{body}</p>
    </AppShell>
  );
}

export default async function PermissionsViewerPage() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <Notice
        title="Permissions"
        body="Supabase environment is not configured. Add .env.local before using the permission viewer."
      />
    );
  }

  const snapshot = await getPermissionSnapshot();

  if (!snapshot) {
    return (
      <Notice
        title="Sign in required"
        body="You must be signed in to view permissions."
      />
    );
  }

  if (!can(snapshot, "core.admin")) {
    return (
      <Notice
        title="Forbidden"
        body="You need the core.admin permission to view this page."
      />
    );
  }

  const supabase = await createClient();

  const [rolesResult, permissionsResult, appsResult] = await Promise.all([
    supabase.from("roles").select("key, name, description").order("key"),
    supabase.from("permissions").select("key, description").order("key"),
    supabase
      .from("apps")
      .select("key, name, status, required_permission, is_active")
      .order("sort_order"),
  ]);

  const roles = (rolesResult.data ?? []) as RoleRow[];
  const permissions = (permissionsResult.data ?? []) as PermissionRow[];
  const apps = (appsResult.data ?? []) as AppRow[];

  return (
    <AppShell activeHref="/admin/permissions">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Core · Admin</p>
          <h1>Permissions</h1>
        </div>
        <StatusPill tone="blue">Read only</StatusPill>
      </section>

      <section className="module-grid" aria-label="Roles">
        {roles.map((role) => (
          <article className="module-card" key={role.key}>
            <div className="module-card__body">
              <div className="module-card__title-row">
                <h2>{role.name}</h2>
                <StatusPill tone="slate">{role.key}</StatusPill>
              </div>
              <p>{role.description ?? "—"}</p>
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Permission catalog">
        <h2>Permissions ({permissions.length})</h2>
        <ul>
          {permissions.map((permission) => (
            <li key={permission.key}>
              <code>{permission.key}</code> — {permission.description ?? "—"}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="App registry">
        <h2>Apps ({apps.length})</h2>
        <ul>
          {apps.map((app) => (
            <li key={app.key}>
              <strong>{app.name}</strong>
              {" · "}
              <StatusPill tone={app.status === "Pilot" ? "green" : "slate"}>
                {app.status}
              </StatusPill>
              {" · "}
              <code>{app.required_permission ?? "no permission"}</code>
              {!app.is_active ? " · inactive" : null}
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link href="/">← Back to dashboard</Link>
      </p>
    </AppShell>
  );
}
