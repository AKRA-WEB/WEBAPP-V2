import Link from "next/link";
import { AppShell } from "@/components/app-shell";

interface AccessDeniedProps {
  title?: string;
  body?: string;
  activeHref?: string;
  eyebrow?: string;
  reason?: "forbidden" | "unauthenticated" | "not_configured";
}

export function AccessDenied({
  title,
  body,
  activeHref = "/",
  eyebrow = "Security",
  reason = "forbidden",
}: AccessDeniedProps) {
  // Determine text based on the reason if not explicitly provided
  let defaultTitle = title;
  let defaultBody = body;

  if (reason === "not_configured") {
    defaultTitle = defaultTitle ?? "System Not Configured";
    defaultBody =
      defaultBody ??
      "The Supabase environment is not configured. Please add your local configuration (.env.local) to proceed.";
  } else if (reason === "unauthenticated") {
    defaultTitle = defaultTitle ?? "Sign In Required";
    defaultBody = defaultBody ?? "You must be signed in to access this page.";
  } else {
    defaultTitle = defaultTitle ?? "Access Denied";
    defaultBody = defaultBody ?? "You do not have the required permissions to view this page.";
  }

  return (
    <AppShell activeHref={activeHref}>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{defaultTitle}</h1>
        </div>
      </section>
      <div className="form-message">
        <p className="mb-4">{defaultBody}</p>
        {reason === "unauthenticated" && (
          <p className="mt-4">
            <Link href="/login" className="btn btn--primary inline-block">
              Go to Sign In
            </Link>
          </p>
        )}
        {reason !== "unauthenticated" && (
          <p className="mt-4">
            <Link href="/" className="link-back">
              ← Back to dashboard
            </Link>
          </p>
        )}
      </div>
    </AppShell>
  );
}
